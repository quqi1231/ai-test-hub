"""
接口链 API - 支持多接口关联执行
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.extended import (
    InterfaceChainCreate, InterfaceChainUpdate, InterfaceChainResponse,
    ChainExecuteRequest, ChainExecuteResponse, ChainStepResult
)
from app.models.models import InterfaceChain, Interface, Environment
from app.services.executor import executor

router = APIRouter()


@router.get("/", response_model=List[InterfaceChainResponse])
async def list_chains(
    project_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """获取接口链列表"""
    return db.query(InterfaceChain).filter(
        InterfaceChain.project_id == project_id
    ).offset(skip).limit(limit).all()


@router.get("/{chain_id}", response_model=InterfaceChainResponse)
async def get_chain(chain_id: int, db: Session = Depends(get_db)):
    """获取接口链详情"""
    chain = db.query(InterfaceChain).filter(InterfaceChain.id == chain_id).first()
    if not chain:
        raise HTTPException(status_code=404, detail="接口链不存在")
    return chain


@router.post("/", response_model=InterfaceChainResponse)
async def create_chain(chain: InterfaceChainCreate, db: Session = Depends(get_db)):
    """创建接口链"""
    db_chain = InterfaceChain(**chain.dict())
    db.add(db_chain)
    db.commit()
    db.refresh(db_chain)
    return db_chain


@router.put("/{chain_id}", response_model=InterfaceChainResponse)
async def update_chain(
    chain_id: int, 
    chain: InterfaceChainUpdate, 
    db: Session = Depends(get_db)
):
    """更新接口链"""
    db_chain = db.query(InterfaceChain).filter(InterfaceChain.id == chain_id).first()
    if not db_chain:
        raise HTTPException(status_code=404, detail="接口链不存在")
    
    for key, value in chain.dict(exclude_unset=True).items():
        setattr(db_chain, key, value)
    
    db.commit()
    db.refresh(db_chain)
    return db_chain


@router.delete("/{chain_id}")
async def delete_chain(chain_id: int, db: Session = Depends(get_db)):
    """删除接口链"""
    chain = db.query(InterfaceChain).filter(InterfaceChain.id == chain_id).first()
    if not chain:
        raise HTTPException(status_code=404, detail="接口链不存在")
    
    db.delete(chain)
    db.commit()
    return {"message": "删除成功"}


@router.post("/{chain_id}/execute", response_model=ChainExecuteResponse)
async def execute_chain(
    chain_id: int, 
    request: ChainExecuteRequest, 
    db: Session = Depends(get_db)
):
    """执行接口链"""
    chain = db.query(InterfaceChain).filter(InterfaceChain.id == chain_id).first()
    if not chain:
        raise HTTPException(status_code=404, detail="接口链不存在")
    
    # 获取环境配置
    env_vars = {}
    base_url = ""
    if request.environment_id:
        env = db.query(Environment).filter(
            Environment.id == request.environment_id
        ).first()
        if env:
            env_vars = env.variables or {}
            base_url = env.base_url or ""
    
    # 初始化变量
    global_vars = {**chain.global_vars, **env_vars, **request.override_vars}
    
    # 创建执行器
    chain_executor = executor.__class__(base_url=base_url)
    
    step_results = []
    extracted_vars = {}
    total_duration = 0
    all_success = True
    
    for step in chain.steps:
        interface_id = step.get("interface_id")
        if not interface_id:
            continue
        
        # 获取接口信息
        interface = db.query(Interface).filter(Interface.id == interface_id).first()
        if not interface:
            step_results.append(ChainStepResult(
                step_name=step.get("name", f"接口{interface_id}"),
                interface_id=interface_id,
                success=False,
                error=f"接口{interface_id}不存在"
            ))
            all_success = False
            continue
        
        step_name = step.get("name", interface.name)
        
        # 处理变量映射 - 将提取的变量注入请求
        var_mapping = step.get("var_mapping", {})
        request_headers = {**interface.headers, **step.get("custom_headers", {})}
        request_params = {**interface.params, **step.get("custom_params", {})}
        request_body = {**interface.body, **step.get("custom_body", {})}
        
        # 替换变量
        for key, value in var_mapping.items():
            # 替换 header 中的变量
            for hk, hv in request_headers.items():
                if isinstance(hv, str):
                    request_headers[hk] = hv.replace(f"{{{{{key}}}}}", str(global_vars.get(key, "")))
            # 替换 params 中的变量
            for pk, pv in request_params.items():
                if isinstance(pv, str):
                    request_params[pk] = pv.replace(f"{{{{{key}}}}}", str(global_vars.get(key, "")))
            # 替换 body 中的变量
            request_body = _replace_vars_recursive(request_body, key, global_vars.get(key, ""))
        
        # 执行接口
        import time
        start_time = time.time()
        try:
            result = await chain_executor.execute(
                method=interface.method,
                url=interface.url,
                headers=request_headers,
                params=request_params,
                body=request_body,
                body_type=interface.body_type
            )
            duration_ms = int((time.time() - start_time) * 1000)
            
            # 提取变量
            extract_vars = step.get("extract_vars", {})
            step_extracted = {}
            for var_name, path in extract_vars.items():
                value = _extract_by_path(result, path)
                if value is not None:
                    step_extracted[var_name] = value
                    global_vars[var_name] = value
                    extracted_vars[var_name] = value
            
            step_results.append(ChainStepResult(
                step_name=step_name,
                interface_id=interface_id,
                success=result.get("status_code", 0) == 200,
                response=result,
                extracted_vars=step_extracted,
                duration_ms=duration_ms
            ))
            
            if result.get("status_code", 0) != 200:
                all_success = False
                # 可以选择是否继续执行
                # break
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            step_results.append(ChainStepResult(
                step_name=step_name,
                interface_id=interface_id,
                success=False,
                error=str(e),
                duration_ms=duration_ms
            ))
            all_success = False
        
        total_duration += duration_ms
    
    return ChainExecuteResponse(
        chain_name=chain.name,
        success=all_success,
        steps=step_results,
        final_vars=extracted_vars,
        total_duration_ms=total_duration
    )


def _extract_by_path(data: dict, path: str) -> any:
    """从响应中提取数据，支持路径如：body.data.token"""
    parts = path.split(".")
    current = data
    
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            current = current[int(part)]
        else:
            return None
    
    return current


def _replace_vars_recursive(data: any, var_name: str, var_value: any) -> any:
    """递归替换字典/列表中的变量"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = value.replace(f"{{{{{var_name}}}}}", str(var_value))
            else:
                result[key] = _replace_vars_recursive(value, var_name, var_value)
        return result
    elif isinstance(data, list):
        return [_replace_vars_recursive(item, var_name, var_value) for item in data]
    elif isinstance(data, str):
        return data.replace(f"{{{{{var_name}}}}}", str(var_value))
    return data
