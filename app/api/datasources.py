"""
数据源 API - 支持 CSV/JSON/Excel 参数化
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import json
from app.core.database import get_db
from app.schemas.extended import (
    DataSourceCreate, DataSourceUpdate, DataSourceResponse,
    ParametricTestRequest, ParametricTestResult
)
from app.models.models import DataSource, Interface, Environment
from app.services.executor import executor

router = APIRouter()


@router.get("/", response_model=List[DataSourceResponse])
async def list_datasources(
    project_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """获取数据源列表"""
    return db.query(DataSource).filter(
        DataSource.project_id == project_id
    ).offset(skip).limit(limit).all()


@router.get("/{ds_id}", response_model=DataSourceResponse)
async def get_datasource(ds_id: int, db: Session = Depends(get_db)):
    """获取数据源详情"""
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return ds


@router.post("/", response_model=DataSourceResponse)
async def create_datasource(ds: DataSourceCreate, db: Session = Depends(get_db)):
    """创建数据源"""
    db_ds = DataSource(**ds.dict())
    db.add(db_ds)
    db.commit()
    db.refresh(db_ds)
    return db_ds


@router.post("/upload")
async def upload_datasource(
    project_id: int,
    name: str,
    source_type: str,  # csv, json
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传数据源文件"""
    content = await file.read()
    
    data = []
    if source_type == "csv":
        # 解析 CSV
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        data = list(reader)
    elif source_type == "json":
        # 解析 JSON
        data = json.loads(content)
    else:
        raise HTTPException(status_code=400, detail="不支持的文件类型")
    
    # 保存数据源
    db_ds = DataSource(
        project_id=project_id,
        name=name,
        source_type=source_type,
        file_path=file.filename,
        data=data
    )
    db.add(db_ds)
    db.commit()
    db.refresh(db_ds)
    
    return {
        "id": db_ds.id,
        "name": db_ds.name,
        "source_type": db_ds.source_type,
        "row_count": len(data),
        "preview": data[:5] if data else []
    }


@router.put("/{ds_id}", response_model=DataSourceResponse)
async def update_datasource(
    ds_id: int, 
    ds: DataSourceUpdate, 
    db: Session = Depends(get_db)
):
    """更新数据源"""
    db_ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not db_ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    for key, value in ds.dict(exclude_unset=True).items():
        setattr(db_ds, key, value)
    
    db.commit()
    db.refresh(db_ds)
    return db_ds


@router.delete("/{ds_id}")
async def delete_datasource(ds_id: int, db: Session = Depends(get_db)):
    """删除数据源"""
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    db.delete(ds)
    db.commit()
    return {"message": "删除成功"}


@router.post("/parametric-test", response_model=ParametricTestResult)
async def parametric_test(
    request: ParametricTestRequest,
    db: Session = Depends(get_db)
):
    """参数化测试执行"""
    # 获取接口
    interface = db.query(Interface).filter(
        Interface.id == request.interface_id
    ).first()
    if not interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    
    # 获取参数列表
    params_list = []
    if request.data_source_id:
        ds = db.query(DataSource).filter(
            DataSource.id == request.data_source_id
        ).first()
        if ds:
            params_list = ds.data or []
    elif request.params_list:
        params_list = request.params_list
    
    if not params_list:
        raise HTTPException(status_code=400, detail="请提供参数数据")
    
    # 获取环境配置
    base_url = ""
    env_vars = {}
    if request.environment_id:
        env = db.query(Environment).filter(
            Environment.id == request.environment_id
        ).first()
        if env:
            base_url = env.base_url or ""
            env_vars = env.variables or {}
    
    # 创建执行器
    test_executor = executor.__class__(base_url=base_url)
    
    results = []
    success_count = 0
    fail_count = 0
    
    for params in params_list:
        # 合并全局变量
        merged_vars = {**env_vars, **request.global_vars, **params}
        
        # 替换变量
        url = _replace_vars(interface.url, merged_vars)
        headers = _replace_vars_dict(interface.headers, merged_vars)
        req_params = _replace_vars_dict(interface.params, merged_vars)
        body = _replace_vars_dict(interface.body, merged_vars)
        
        # 执行
        try:
            result = await test_executor.execute(
                method=interface.method,
                url=url,
                headers=headers,
                params=req_params,
                body=body,
                body_type=interface.body_type
            )
            
            is_success = result.get("status_code", 0) == 200
            if is_success:
                success_count += 1
            else:
                fail_count += 1
            
            results.append({
                "params": params,
                "result": result,
                "success": is_success
            })
        except Exception as e:
            fail_count += 1
            results.append({
                "params": params,
                "error": str(e),
                "success": False
            })
    
    return ParametricTestResult(
        total=len(params_list),
        success=success_count,
        fail=fail_count,
        results=results
    )


def _replace_vars(text: str, vars_dict: dict) -> str:
    """替换文本中的变量"""
    if not text:
        return text
    for key, value in vars_dict.items():
        placeholder = f"{{{{{key}}}}}"
        if placeholder in text:
            text = text.replace(placeholder, str(value))
    return text


def _replace_vars_dict(data: dict, vars_dict: dict) -> dict:
    """替换字典中的变量"""
    if not data:
        return data
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = _replace_vars(value, vars_dict)
        elif isinstance(value, dict):
            result[key] = _replace_vars_dict(value, vars_dict)
        elif isinstance(value, list):
            result[key] = [
                _replace_vars_dict(item, vars_dict) if isinstance(item, dict)
                else _replace_vars(item, vars_dict) if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            result[key] = value
    return result
