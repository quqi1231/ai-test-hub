"""
Mock服务管理 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import MockService

router = APIRouter()


# Schema
class MockServiceCreate(BaseModel):
    name: str
    path: str
    method: str = "GET"
    project_id: int
    response_status: int = 200
    response_body: dict = {}
    response_headers: dict = {}
    delay_ms: int = 0
    is_enabled: bool = True
    description: Optional[str] = None


class MockServiceUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    response_status: Optional[int] = None
    response_body: Optional[dict] = None
    response_headers: Optional[dict] = None
    delay_ms: Optional[int] = None
    is_enabled: Optional[bool] = None
    description: Optional[str] = None


class MockServiceResponse(BaseModel):
    id: int
    name: str
    path: str
    method: str
    project_id: int
    response_status: int
    response_body: dict
    response_headers: dict
    delay_ms: int
    is_enabled: bool
    description: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[MockServiceResponse])
async def list_mock_services(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    """获取Mock服务列表"""
    query = db.query(MockService)
    if project_id:
        query = query.filter(MockService.project_id == project_id)
    return query.all()


@router.post("/", response_model=MockServiceResponse)
async def create_mock_service(service: MockServiceCreate, db: Session = Depends(get_db)):
    """创建Mock服务"""
    db_service = MockService(**service.dict())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.get("/{service_id}", response_model=MockServiceResponse)
async def get_mock_service(service_id: int, db: Session = Depends(get_db)):
    """获取Mock服务详情"""
    service = db.query(MockService).filter(MockService.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Mock服务不存在")
    return service


@router.put("/{service_id}", response_model=MockServiceResponse)
async def update_mock_service(service_id: int, service: MockServiceUpdate, db: Session = Depends(get_db)):
    """更新Mock服务"""
    db_service = db.query(MockService).filter(MockService.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Mock服务不存在")
    
    for key, value in service.dict(exclude_unset=True).items():
        setattr(db_service, key, value)
    
    db.commit()
    db.refresh(db_service)
    return db_service


@router.delete("/{service_id}")
async def delete_mock_service(service_id: int, db: Session = Depends(get_db)):
    """删除Mock服务"""
    db_service = db.query(MockService).filter(MockService.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Mock服务不存在")
    
    db.delete(db_service)
    db.commit()
    return {"message": "删除成功"}


@router.post("/{service_id}/test")
async def test_mock_service(service_id: int, db: Session = Depends(get_db)):
    """测试Mock服务"""
    service = db.query(MockService).filter(MockService.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Mock服务不存在")
    
    # 返回模拟的响应
    return {
        "status": service.response_status,
        "headers": service.response_headers,
        "body": service.response_body,
        "delay_ms": service.delay_ms
    }
