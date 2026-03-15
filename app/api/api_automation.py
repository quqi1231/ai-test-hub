"""
接口自动化模块 - API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import httpx
import json

from app.core.database import get_db
from app.models.api_automation import (
    ApiProject, ApiTestSuite, ApiTestCase, 
    ApiExecutionLog, ApiEnvironment
)
from app.schemas.api_automation import (
    ApiProjectCreate, ApiProjectUpdate, ApiProjectResponse, ApiProjectWithStats,
    ApiTestSuiteCreate, ApiTestSuiteUpdate, ApiTestSuiteResponse, ApiTestSuiteWithCases,
    ApiTestCaseCreate, ApiTestCaseUpdate, ApiTestCaseResponse,
    QuickExecuteRequest, ExecuteResponse,
    ApiExecutionLogResponse, ApiExecutionLogDetail,
    ApiEnvironmentCreate, ApiEnvironmentUpdate, ApiEnvironmentResponse,
    AIGenerateCasesRequest, AIGenerateCasesResponse
)

router = APIRouter()


# ==================== 项目管理 ====================

@router.get("/projects", response_model=List[ApiProjectWithStats])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db)
):
    """获取项目列表"""
    projects = db.query(ApiProject).order_by(ApiProject.id.desc()).offset(skip).limit(limit).all()
    
    result = []
    for p in projects:
        suites = db.query(ApiTestSuite).filter(ApiTestSuite.project_id == p.id).all()
        suite_count = len(suites)
        case_count = sum(
            db.query(ApiTestCase).filter(ApiTestCase.suite_id == s.id).count() 
            for s in suites
        )
        result.append(ApiProjectWithStats(
            **{c.name: getattr(p, c.name) for c in p.__table__.columns},
            suite_count=suite_count,
            case_count=case_count
        ))
    
    return result


@router.post("/projects", response_model=ApiProjectResponse)
async def create_project(data: ApiProjectCreate, db: Session = Depends(get_db)):
    """创建项目"""
    project = ApiProject(**data.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ApiProjectWithStats)
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """获取项目详情"""
    project = db.query(ApiProject).filter(ApiProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    suites = db.query(ApiTestSuite).filter(ApiTestSuite.project_id == project.id).all()
    suite_count = len(suites)
    case_count = sum(
        db.query(ApiTestCase).filter(ApiTestCase.suite_id == s.id).count() 
        for s in suites
    )
    
    return ApiProjectWithStats(
        **{c.name: getattr(project, c.name) for c in project.__table__.columns},
        suite_count=suite_count,
        case_count=case_count
    )


@router.put("/projects/{project_id}", response_model=ApiProjectResponse)
async def update_project(project_id: int, data: ApiProjectUpdate, db: Session = Depends(get_db)):
    """更新项目"""
    project = db.query(ApiProject).filter(ApiProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """删除项目"""
    project = db.query(ApiProject).filter(ApiProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 删除关联的测试集合和用例
    suites = db.query(ApiTestSuite).filter(ApiTestSuite.project_id == project_id).all()
    for suite in suites:
        db.query(ApiTestCase).filter(ApiTestCase.suite_id == suite.id).delete()
        db.query(ApiExecutionLog).filter(ApiExecutionLog.suite_id == suite.id).delete()
    db.query(ApiTestSuite).filter(ApiTestSuite.project_id == project_id).delete()
    db.query(ApiExecutionLog).filter(ApiExecutionLog.project_id == project_id).delete()
    
    db.delete(project)
    db.commit()
    return {"success": True, "message": "项目已删除"}


# ==================== 测试集合管理 ====================

@router.get("/projects/{project_id}/suites", response_model=List[ApiTestSuiteWithCases])
async def list_suites(project_id: int, db: Session = Depends(get_db)):
    """获取项目的测试集合列表"""
    suites = db.query(ApiTestSuite).filter(
        ApiTestSuite.project_id == project_id
    ).order_by(ApiTestSuite.order).all()
    
    result = []
    for s in suites:
        cases = db.query(ApiTestCase).filter(
            ApiTestCase.suite_id == s.id
        ).order_by(ApiTestCase.order).all()
        
        result.append(ApiTestSuiteWithCases(
            **{c.name: getattr(s, c.name) for c in s.__table__.columns},
            cases=[ApiTestCaseResponse.from_orm(c) for c in cases],
            case_count=len(cases)
        ))
    
    return result


@router.post("/suites", response_model=ApiTestSuiteResponse)
async def create_suite(data: ApiTestSuiteCreate, db: Session = Depends(get_db)):
    """创建测试集合"""
    # 检查项目是否存在
    project = db.query(ApiProject).filter(ApiProject.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 获取最大排序值
    max_order = db.query(ApiTestSuite).filter(
        ApiTestSuite.project_id == data.project_id
    ).count()
    
    suite = ApiTestSuite(**data.dict(), order=max_order)
    db.add(suite)
    db.commit()
    db.refresh(suite)
    return suite


@router.put("/suites/{suite_id}", response_model=ApiTestSuiteResponse)
async def update_suite(suite_id: int, data: ApiTestSuiteUpdate, db: Session = Depends(get_db)):
    """更新测试集合"""
    suite = db.query(ApiTestSuite).filter(ApiTestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集合不存在")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(suite, key, value)
    
    db.commit()
    db.refresh(suite)
    return suite


@router.delete("/suites/{suite_id}")
async def delete_suite(suite_id: int, db: Session = Depends(get_db)):
    """删除测试集合"""
    suite = db.query(ApiTestSuite).filter(ApiTestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集合不存在")
    
    # 删除关联的用例
    db.query(ApiTestCase).filter(ApiTestCase.suite_id == suite_id).delete()
    db.query(ApiExecutionLog).filter(ApiExecutionLog.suite_id == suite_id).delete()
    
    db.delete(suite)
    db.commit()
    return {"success": True, "message": "测试集合已删除"}


# ==================== 测试用例管理 ====================

@router.get("/suites/{suite_id}/cases", response_model=List[ApiTestCaseResponse])
async def list_cases(suite_id: int, db: Session = Depends(get_db)):
    """获取测试集合的用例列表"""
    cases = db.query(ApiTestCase).filter(
        ApiTestCase.suite_id == suite_id
    ).order_by(ApiTestCase.order).all()
    return cases


@router.post("/cases", response_model=ApiTestCaseResponse)
async def create_case(data: ApiTestCaseCreate, db: Session = Depends(get_db)):
    """创建测试用例"""
    # 检查测试集合是否存在
    suite = db.query(ApiTestSuite).filter(ApiTestSuite.id == data.suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集合不存在")
    
    # 获取最大排序值
    max_order = db.query(ApiTestCase).filter(
        ApiTestCase.suite_id == data.suite_id
    ).count()
    
    case_data = data.dict()
    case_data["order"] = max_order
    
    case = ApiTestCase(**case_data)
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.put("/cases/{case_id}", response_model=ApiTestCaseResponse)
async def update_case(case_id: int, data: ApiTestCaseUpdate, db: Session = Depends(get_db)):
    """更新测试用例"""
    case = db.query(ApiTestCase).filter(ApiTestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(case, key, value)
    
    db.commit()
    db.refresh(case)
    return case


@router.delete("/cases/{case_id}")
async def delete_case(case_id: int, db: Session = Depends(get_db)):
    """删除测试用例"""
    case = db.query(ApiTestCase).filter(ApiTestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    
    db.query(ApiExecutionLog).filter(ApiExecutionLog.case_id == case_id).delete()
    db.delete(case)
    db.commit()
    return {"success": True, "message": "测试用例已删除"}


# ==================== 执行接口 ====================

@router.post("/execute", response_model=ExecuteResponse)
async def quick_execute(data: QuickExecuteRequest, db: Session = Depends(get_db)):
    """快捷执行（无需保存）"""
    return await _execute_request(data.dict(), db)


@router.post("/cases/{case_id}/execute", response_model=ExecuteResponse)
async def execute_case(case_id: int, db: Session = Depends(get_db)):
    """执行测试用例"""
    case = db.query(ApiTestCase).filter(ApiTestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    
    result = await _execute_request({
        "method": case.method,
        "url": case.url,
        "headers": case.headers or {},
        "params": case.params or {},
        "body": case.body,
        "body_type": case.body_type
    }, db, case)
    
    # 更新用例状态
    case.last_status = "success" if result.success else "failed"
    case.last_status_code = result.status_code
    case.last_response_time = result.duration_ms
    case.last_executed_at = datetime.utcnow()
    db.commit()
    
    return result


@router.post("/suites/{suite_id}/execute", response_model=List[ExecuteResponse])
async def execute_suite(suite_id: int, db: Session = Depends(get_db)):
    """执行测试集合"""
    suite = db.query(ApiTestSuite).filter(ApiTestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集合不存在")
    
    cases = db.query(ApiTestCase).filter(
        ApiTestCase.suite_id == suite_id
    ).order_by(ApiTestCase.order).all()
    
    results = []
    for case in cases:
        result = await _execute_request({
            "method": case.method,
            "url": case.url,
            "headers": case.headers or {},
            "params": case.params or {},
            "body": case.body,
            "body_type": case.body_type
        }, db, case)
        
        # 更新用例状态
        case.last_status = "success" if result.success else "failed"
        case.last_status_code = result.status_code
        case.last_response_time = result.duration_ms
        case.last_executed_at = datetime.utcnow()
        
        results.append(result)
    
    db.commit()
    return results


async def _execute_request(
    request_data: dict, 
    db: Session, 
    case: Optional[ApiTestCase] = None
) -> ExecuteResponse:
    """执行请求的内部方法"""
    import time
    
    method = request_data.get("method", "GET").upper()
    url = request_data.get("url", "")
    headers = request_data.get("headers") or {}
    params = request_data.get("params") or {}
    body = request_data.get("body")
    body_type = request_data.get("body_type", "json")
    timeout = request_data.get("timeout", 30)
    
    # 记录开始时间
    start_time = time.time()
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            # 处理请求体
            json_body = None
            data_body = None
            content_body = None
            
            if body:
                if body_type == "json":
                    json_body = body
                elif body_type == "form":
                    data_body = body
                else:
                    content_body = json.dumps(body) if isinstance(body, dict) else str(body)
            
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_body,
                data=data_body,
                content=content_body
            )
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        # 解析响应体
        try:
            response_body = response.json()
        except:
            response_body = response.text
        
        # 执行断言
        assertion_results = []
        if case and case.assertions:
            assertion_results = _run_assertions(case.assertions, response, response_body)
        
        # 记录执行日志
        log = ApiExecutionLog(
            case_id=case.id if case else None,
            suite_id=case.suite_id if case else None,
            project_id=None,
            exec_type="single" if case else "quick",
            request_method=method,
            request_url=url,
            request_headers=headers,
            request_params=params,
            request_body=body,
            response_status=response.status_code,
            response_headers=dict(response.headers),
            response_body=response.text[:10000],  # 限制长度
            duration_ms=duration_ms,
            assertion_results=assertion_results,
            status="success" if response.status_code < 400 else "failed"
        )
        db.add(log)
        db.commit()
        
        return ExecuteResponse(
            success=response.status_code < 400,
            status_code=response.status_code,
            response_headers=dict(response.headers),
            response_body=response_body,
            duration_ms=duration_ms,
            assertion_results=assertion_results
        )
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        
        # 记录错误日志
        log = ApiExecutionLog(
            case_id=case.id if case else None,
            suite_id=case.suite_id if case else None,
            project_id=None,
            exec_type="single" if case else "quick",
            request_method=method,
            request_url=url,
            request_headers=headers,
            request_params=params,
            request_body=body,
            status="error",
            error_message=str(e),
            duration_ms=duration_ms
        )
        db.add(log)
        db.commit()
        
        return ExecuteResponse(
            success=False,
            status_code=0,
            duration_ms=duration_ms,
            error=str(e)
        )


def _run_assertions(assertions: list, response, response_body) -> list:
    """执行断言"""
    import jsonpath_ng
    
    results = []
    for assertion in assertions:
        assertion_type = assertion.get("type")
        expected = assertion.get("expected")
        result = {"type": assertion_type, "expected": expected, "passed": False}
        
        try:
            if assertion_type == "status_code":
                result["actual"] = response.status_code
                result["passed"] = response.status_code == expected
            
            elif assertion_type == "response_time":
                result["actual"] = response.elapsed.total_seconds() * 1000
                result["passed"] = result["actual"] <= expected
            
            elif assertion_type == "body_contains":
                result["actual"] = str(response_body)
                result["passed"] = expected in str(response_body)
            
            elif assertion_type == "json_path":
                json_path = assertion.get("json_path")
                if json_path and isinstance(response_body, dict):
                    try:
                        import jsonpath_ng.ext as jsonpath
                        expr = jsonpath.parse(json_path)
                        match = expr.find(response_body)
                        if match:
                            result["actual"] = match[0].value
                            result["passed"] = str(match[0].value) == str(expected)
                    except:
                        result["passed"] = False
            
        except Exception as e:
            result["error"] = str(e)
        
        results.append(result)
    
    return results


# ==================== 执行历史 ====================

@router.get("/execution-logs", response_model=List[ApiExecutionLogResponse])
async def list_execution_logs(
    case_id: Optional[int] = None,
    suite_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1),
    db: Session = Depends(get_db)
):
    """获取执行日志列表"""
    query = db.query(ApiExecutionLog)
    
    if case_id:
        query = query.filter(ApiExecutionLog.case_id == case_id)
    if suite_id:
        query = query.filter(ApiExecutionLog.suite_id == suite_id)
    if status:
        query = query.filter(ApiExecutionLog.status == status)
    
    logs = query.order_by(ApiExecutionLog.executed_at.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/execution-logs/{log_id}", response_model=ApiExecutionLogDetail)
async def get_execution_log(log_id: int, db: Session = Depends(get_db)):
    """获取执行日志详情"""
    log = db.query(ApiExecutionLog).filter(ApiExecutionLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="执行日志不存在")
    return log


# ==================== 环境配置 ====================

@router.get("/projects/{project_id}/environments", response_model=List[ApiEnvironmentResponse])
async def list_environments(project_id: int, db: Session = Depends(get_db)):
    """获取项目的环境配置列表"""
    environments = db.query(ApiEnvironment).filter(
        ApiEnvironment.project_id == project_id
    ).all()
    return environments


@router.post("/environments", response_model=ApiEnvironmentResponse)
async def create_environment(data: ApiEnvironmentCreate, db: Session = Depends(get_db)):
    """创建环境配置"""
    env = ApiEnvironment(**data.dict())
    db.add(env)
    db.commit()
    db.refresh(env)
    return env


@router.put("/environments/{env_id}", response_model=ApiEnvironmentResponse)
async def update_environment(env_id: int, data: ApiEnvironmentUpdate, db: Session = Depends(get_db)):
    """更新环境配置"""
    env = db.query(ApiEnvironment).filter(ApiEnvironment.id == env_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="环境配置不存在")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(env, key, value)
    
    db.commit()
    db.refresh(env)
    return env


@router.delete("/environments/{env_id}")
async def delete_environment(env_id: int, db: Session = Depends(get_db)):
    """删除环境配置"""
    env = db.query(ApiEnvironment).filter(ApiEnvironment.id == env_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="环境配置不存在")
    
    db.delete(env)
    db.commit()
    return {"success": True}
