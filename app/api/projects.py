"""
项目管理 API - 需要认证
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.project import (
    ProjectCreate, 
    ProjectUpdate, 
    ProjectResponse,
    ProjectWithStats
)
from app.schemas.auth import UserResponse
from app.models.models import Project, Interface, TestCase

router = APIRouter()


@router.get("/", response_model=List[ProjectWithStats])
async def list_projects(
    skip: int = 0, 
    limit: int = 100, 
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取项目列表（需要登录）"""
    projects = db.query(Project).offset(skip).limit(limit).all()
    
    result = []
    for project in projects:
        interface_count = db.query(Interface).filter(
            Interface.project_id == project.id
        ).count()
        case_count = db.query(TestCase).filter(
            TestCase.project_id == project.id
        ).count()
        
        result.append(ProjectWithStats(
            id=project.id,
            name=project.name,
            description=project.description,
            created_at=project.created_at,
            updated_at=project.updated_at,
            interface_count=interface_count,
            case_count=case_count
        ))
    
    return result


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取项目详情"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建项目"""
    db_project = Project(
        name=project.name,
        description=project.description,
        owner_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project: ProjectUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新项目"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    if project.name is not None:
        db_project.name = project.name
    if project.description is not None:
        db_project.description = project.description
    
    db.commit()
    db.refresh(db_project)
    return db_project


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除项目"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查是否有关联的接口和用例
    interface_count = db.query(Interface).filter(Interface.project_id == project_id).count()
    case_count = db.query(TestCase).filter(TestCase.project_id == project_id).count()
    
    if interface_count > 0 or case_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"项目下还有 {interface_count} 个接口和 {case_count} 个用例，请先删除"
        )
    
    db.delete(project)
    db.commit()
    return {"message": "删除成功"}


@router.get("/{project_id}/summary")
async def get_project_summary(
    project_id: int,
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取项目统计摘要"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    interface_count = db.query(Interface).filter(
        Interface.project_id == project_id
    ).count()
    case_count = db.query(TestCase).filter(
        TestCase.project_id == project_id
    ).count()
    
    return {
        "project_id": project_id,
        "project_name": project.name,
        "interface_count": interface_count,
        "case_count": case_count
    }
