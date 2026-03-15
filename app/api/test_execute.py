"""
测试执行 API - 包含单接口执行和测试集执行
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.models import Interface, TestCase, TestResult
from app.models.test_suite import TestSuite, TestSuiteItem, TestSuiteResult
from app.services.executor import InterfaceExecutor, AssertionExecutor, VariableExtractor
import httpx
import json

router = APIRouter()


# ==================== 请求模型 ====================

class SingleExecuteRequest(BaseModel):
    """单接口执行请求"""
    interface_id: Optional[int] = None
    url: str
    method: str = "GET"
    headers: Optional[Dict[str, str]] = None
    params: Optional[Dict[str, str]] = None
    body: Optional[Any] = None
    body_type: str = "json"
    content_type: Optional[str] = None
    timeout: int = 30


class SingleExecuteResponse(BaseModel):
    """单接口执行响应"""
    success: bool
    status_code: int
    response_body: Any
    response_headers: Optional[Dict[str, str]] = None
    duration_ms: int
    error: Optional[str] = None


# ==================== 单接口执行 ====================

@router.post("/execute/single", response_model=SingleExecuteResponse)
async def execute_single_interface(
    request: SingleExecuteRequest,
    db: Session = Depends(get_db)
):
    """
    执行单个接口
    - 支持直接传入URL执行
    - 支持通过interface_id执行已保存的接口
    """
    executor = InterfaceExecutor()
    
    # 如果提供了interface_id，从数据库获取接口信息
    if request.interface_id:
        interface = db.query(Interface).filter(Interface.id == request.interface_id).first()
        if not interface:
            raise HTTPException(status_code=404, detail="接口不存在")
        
        # 使用数据库中的接口信息，请求中的参数作为覆盖
        url = request.url or interface.url
        method = request.method or interface.method
        headers = {**(interface.headers or {}), **(request.headers or {})}
        params = {**(interface.params or {}), **(request.params or {})}
        body = request.body if request.body is not None else interface.body
        body_type = request.body_type or interface.body_type or "json"
    else:
        url = request.url
        method = request.method
        headers = request.headers or {}
        params = request.params or {}
        body = request.body
        body_type = request.body_type
    
    # 验证URL
    if not url:
        raise HTTPException(status_code=400, detail="URL不能为空")
    
    # 执行请求
    try:
        result = await executor.execute(
            method=method,
            url=url,
            headers=headers,
            params=params,
            body=body,
            body_type=body_type,
            timeout=request.timeout
        )
        
        # 更新接口的最后执行状态
        if request.interface_id:
            interface = db.query(Interface).filter(Interface.id == request.interface_id).first()
            if interface:
                interface.last_status_code = result.get("status_code")
                interface.last_response_time = result.get("elapsed_ms")
                interface.last_response_body = str(result.get("body"))[:5000] if result.get("body") else None
                interface.last_executed_at = datetime.utcnow()
                db.commit()
        
        return SingleExecuteResponse(
            success=result.get("status_code", 0) > 0 and result.get("status_code", 0) < 400,
            status_code=result.get("status_code", 0),
            response_body=result.get("body"),
            response_headers=result.get("headers"),
            duration_ms=result.get("elapsed_ms", 0),
            error=result.get("error")
        )
        
    except Exception as e:
        return SingleExecuteResponse(
            success=False,
            status_code=0,
            response_body=None,
            duration_ms=0,
            error=str(e)
        )


@router.post("/execute/interface/{interface_id}")
async def execute_interface_by_id(
    interface_id: int,
    base_url: str = None,
    db: Session = Depends(get_db)
):
    """通过ID执行已保存的接口"""
    interface = db.query(Interface).filter(Interface.id == interface_id).first()
    if not interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    
    executor = InterfaceExecutor(base_url=base_url or "")
    
    result = await executor.execute(
        method=interface.method,
        url=interface.url,
        headers=interface.headers or {},
        params=interface.params or {},
        body=interface.body,
        body_type=interface.body_type or "json"
    )
    
    # 更新接口状态
    interface.last_status_code = result.get("status_code")
    interface.last_response_time = result.get("elapsed_ms")
    interface.last_response_body = str(result.get("body"))[:5000] if result.get("body") else None
    interface.last_executed_at = datetime.utcnow()
    db.commit()
    
    return {
        "interface_id": interface.id,
        "interface_name": interface.name,
        "success": result.get("status_code", 0) > 0 and result.get("status_code", 0) < 400,
        **result
    }


# ==================== 变量替换工具函数 ====================

def _replace_variables(text: str, vars_dict: dict) -> str:
    """替换变量 {{var_name}}"""
    if not text:
        return text
    for key, value in vars_dict.items():
        placeholder = f"{{{{{key}}}}}"
        if placeholder in text:
            text = text.replace(placeholder, str(value))
    return text


def _replace_variables_dict(data: dict, vars_dict: dict) -> dict:
    """替换字典中的变量"""
    if not data:
        return data
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = _replace_variables(value, vars_dict)
        elif isinstance(value, dict):
            result[key] = _replace_variables_dict(value, vars_dict)
        elif isinstance(value, list):
            result[key] = [
                _replace_variables_dict(item, vars_dict) if isinstance(item, dict) 
                else _replace_variables(item, vars_dict) if isinstance(item, str) 
                else item
                for item in value
            ]
        else:
            result[key] = value
    return result


# ==================== 测试集执行 ====================

@router.post("/test-suites/{suite_id}/execute")
async def execute_test_suite(
    suite_id: int,
    base_url: str = None,
    db: Session = Depends(get_db)
):
    """执行测试集"""
    # 获取测试集
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    # 获取测试项目
    items = db.query(TestSuiteItem).filter(
        TestSuiteItem.suite_id == suite_id,
        TestSuiteItem.enabled == True
    ).order_by(TestSuiteItem.order_index).all()
    
    if not items:
        raise HTTPException(status_code=400, detail="测试集为空")
    
    # 创建执行结果记录
    test_result = TestSuiteResult(
        suite_id=suite_id,
        status="running",
        total_count=len(items)
    )
    db.add(test_result)
    db.commit()
    db.refresh(test_result)
    
    # 设置环境变量
    env_vars = suite.environment or {}
    if base_url:
        env_vars["base_url"] = base_url
    
    # 执行每个接口
    results = []
    success_count = 0
    fail_count = 0
    
    executor = InterfaceExecutor(base_url=env_vars.get("base_url", ""))
    
    for item in items:
        # 获取接口信息
        interface = db.query(Interface).filter(Interface.id == item.interface_id).first()
        if not interface:
            continue
        
        # 替换变量
        url = _replace_variables(interface.url, env_vars)
        headers = _replace_variables_dict(interface.headers or {}, env_vars)
        params = _replace_variables_dict(interface.params or {}, env_vars)
        body = _replace_variables_dict(interface.body or {}, env_vars)
        
        # 执行接口
        response = await executor.execute(
            method=interface.method,
            url=url,
            headers=headers,
            params=params,
            body=body,
            body_type=interface.body_type or "json"
        )
        
        # 执行断言
        assertion_result = {"all_passed": True, "results": []}
        if item.assertions:
            assertion_result = AssertionExecutor.execute_assertions(response, item.assertions)
        
        # 提取变量
        extracted_vars = {}
        if item.var_extracts:
            extracted_vars = VariableExtractor.extract(response, item.var_extracts)
            env_vars.update(extracted_vars)  # 传递给后续接口
        
        # 记录结果
        item_result = {
            "interface_id": interface.id,
            "interface_name": interface.name,
            "method": interface.method,
            "url": url,
            "status_code": response.get("status_code"),
            "elapsed_ms": response.get("elapsed_ms"),
            "assertions": assertion_result,
            "extracted_vars": extracted_vars,
            "response": {
                "body": response.get("body"),
                "headers": response.get("headers")
            }
        }
        results.append(item_result)
        
        if assertion_result["all_passed"]:
            success_count += 1
        else:
            fail_count += 1
        
        # 延迟
        if item.delay_ms > 0:
            import asyncio
            await asyncio.sleep(item.delay_ms / 1000)
    
    # 更新执行结果
    test_result.status = "success" if fail_count == 0 else "failed"
    test_result.success_count = success_count
    test_result.fail_count = fail_count
    test_result.details = {"items": results}
    test_result.finished_at = datetime.utcnow()
    test_result.duration_ms = sum(r.get("elapsed_ms", 0) for r in results)
    db.commit()
    
    return {
        "result_id": test_result.id,
        "status": test_result.status,
        "total": test_result.total_count,
        "success": success_count,
        "failed": fail_count,
        "duration_ms": test_result.duration_ms,
        "details": results
    }


# ==================== 测试结果 ====================

@router.get("/test-results/")
async def list_test_results(
    suite_id: int = None,
    skip: int = 0, 
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取测试结果列表"""
    query = db.query(TestSuiteResult)
    if suite_id:
        query = query.filter(TestSuiteResult.suite_id == suite_id)
    return query.order_by(TestSuiteResult.started_at.desc()).offset(skip).limit(limit).all()


@router.get("/test-results/{result_id}")
async def get_test_result(result_id: int, db: Session = Depends(get_db)):
    """获取测试结果详情"""
    result = db.query(TestSuiteResult).filter(TestSuiteResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="测试结果不存在")
    
    return {
        "id": result.id,
        "suite_id": result.suite_id,
        "status": result.status,
        "total_count": result.total_count,
        "success_count": result.success_count,
        "fail_count": result.fail_count,
        "duration_ms": result.duration_ms,
        "details": result.details,
        "started_at": result.started_at,
        "finished_at": result.finished_at
    }
