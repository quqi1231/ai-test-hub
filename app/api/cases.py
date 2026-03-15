"""
用例管理 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Interface, TestCase
from app.schemas.case import TestCaseCreate, TestCaseUpdate, TestCaseResponse
from app.services.executor import executor

router = APIRouter()

@router.get("/", response_model=List[TestCaseResponse])
async def list_cases(project_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取用例列表"""
    query = db.query(TestCase)
    if project_id:
        query = query.filter(TestCase.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.get("/{case_id}", response_model=TestCaseResponse)
async def get_case(case_id: int, db: Session = Depends(get_db)):
    """获取用例详情"""
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    return case

@router.post("/", response_model=TestCaseResponse)
async def create_case(case: TestCaseCreate, db: Session = Depends(get_db)):
    """创建用例"""
    db_case = TestCase(**case.dict())
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

@router.put("/{case_id}", response_model=TestCaseResponse)
async def update_case(case_id: int, case: TestCaseUpdate, db: Session = Depends(get_db)):
    """更新用例"""
    db_case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="用例不存在")
    
    for key, value in case.dict(exclude_unset=True).items():
        setattr(db_case, key, value)
    
    db.commit()
    db.refresh(db_case)
    return db_case

@router.delete("/{case_id}")
async def delete_case(case_id: int, db: Session = Depends(get_db)):
    """删除用例"""
    db_case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="用例不存在")
    
    db.delete(db_case)
    db.commit()
    return {"message": "删除成功"}

@router.post("/{case_id}/run")
async def run_case(case_id: int, db: Session = Depends(get_db)):
    """执行用例"""
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    
    # 获取关联的接口信息
    interface = None
    if case.interface_id:
        interface = db.query(Interface).filter(Interface.id == case.interface_id).first()
    
    if not interface:
        raise HTTPException(status_code=400, detail="用例未关联接口")
    
    # 执行接口
    result = await executor.execute(
        method=interface.method,
        url=interface.url,
        headers=interface.headers,
        params=interface.params,
        body=interface.body,
        body_type=interface.body_type
    )
    return result
