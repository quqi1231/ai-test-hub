"""
环境管理 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Environment
from app.schemas.environment import (
    EnvironmentCreate, 
    EnvironmentUpdate, 
    EnvironmentResponse
)

router = APIRouter(tags=["环境管理"])


@router.get("", response_model=List[EnvironmentResponse])
def get_environments(
    project_id: int = Query(..., description="项目ID"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取项目下的所有环境"""
    environments = db.query(Environment).filter(
        Environment.project_id == project_id
    ).offset(skip).limit(limit).all()
    return environments


@router.get("/{env_id}", response_model=EnvironmentResponse)
def get_environment(env_id: int, db: Session = Depends(get_db)):
    """获取单个环境详情"""
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")
    return env


@router.post("", response_model=EnvironmentResponse)
def create_environment(
    env: EnvironmentCreate,
    db: Session = Depends(get_db)
):
    """创建新环境"""
    db_env = Environment(**env.model_dump())
    db.add(db_env)
    db.commit()
    db.refresh(db_env)
    return db_env


@router.put("/{env_id}", response_model=EnvironmentResponse)
def update_environment(
    env_id: int,
    env: EnvironmentUpdate,
    db: Session = Depends(get_db)
):
    """更新环境"""
    db_env = db.query(Environment).filter(Environment.id == env_id).first()
    if not db_env:
        raise HTTPException(status_code=404, detail="环境不存在")
    
    update_data = env.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_env, field, value)
    
    db.commit()
    db.refresh(db_env)
    return db_env


@router.delete("/{env_id}")
def delete_environment(env_id: int, db: Session = Depends(get_db)):
    """删除环境"""
    db_env = db.query(Environment).filter(Environment.id == env_id).first()
    if not db_env:
        raise HTTPException(status_code=404, detail="环境不存在")
    
    db.delete(db_env)
    db.commit()
    return {"message": "删除成功"}


@router.post("/{env_id}/activate")
def activate_environment(env_id: int, db: Session = Depends(get_db)):
    """激活环境"""
    db_env = db.query(Environment).filter(Environment.id == env_id).first()
    if not db_env:
        raise HTTPException(status_code=404, detail="环境不存在")
    
    # 先停用该项目下的其他环境
    db.query(Environment).filter(
        Environment.project_id == db_env.project_id
    ).update({"is_active": False})
    
    # 激活当前环境
    db_env.is_active = True
    db.commit()
    return {"message": "激活成功", "environment_id": env_id}
