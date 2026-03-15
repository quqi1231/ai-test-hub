"""
测试结果 API - 持久化存储
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.auth import UserResponse
from app.models.models import TestResult, TestCase
from pydantic import BaseModel

router = APIRouter()


# Schema
class TestResultCreate(BaseModel):
    case_id: int
    status: str  # success, fail, error
    response: Optional[dict] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None


class TestResultResponse(BaseModel):
    id: int
    case_id: int
    status: str
    response: Optional[dict]
    error_message: Optional[str]
    duration_ms: Optional[int]
    executed_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[TestResultResponse])
async def list_results(
    case_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取测试结果列表"""
    query = db.query(TestResult)
    
    if case_id:
        query = query.filter(TestResult.case_id == case_id)
    if status:
        query = query.filter(TestResult.status == status)
    
    results = query.order_by(TestResult.executed_at.desc()).offset(skip).limit(limit).all()
    return results


@router.get("/case/{case_id}", response_model=List[TestResultResponse])
async def get_case_results(
    case_id: int,
    limit: int = Query(50, le=500),
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取指定用例的测试结果"""
    # 验证用例存在
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    
    results = db.query(TestResult).filter(
        TestResult.case_id == case_id
    ).order_by(TestResult.executed_at.desc()).limit(limit).all()
    
    return results


@router.post("/", response_model=TestResultResponse)
async def create_result(
    result: TestResultCreate,
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建测试结果"""
    # 验证用例存在
    case = db.query(TestCase).filter(TestCase.id == result.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    
    db_result = TestResult(
        case_id=result.case_id,
        status=result.status,
        response=result.response,
        error_message=result.error_message,
        duration_ms=result.duration_ms
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    return db_result


@router.get("/stats")
async def get_result_stats(
    days: int = Query(7, le=90),
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取测试结果统计"""
    from sqlalchemy import func
    
    # 统计指定天数内的数据
    results = db.query(
        TestResult.status,
        func.count(TestResult.id).label('count'),
        func.avg(TestResult.duration_ms).label('avg_duration')
    ).filter(
        TestResult.executed_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
    ).group_by(TestResult.status).all()
    
    total = sum(r.count for r in results)
    success_count = next((r.count for r in results if r.status == 'success'), 0)
    
    return {
        "total": total,
        "success": success_count,
        "failed": next((r.count for r in results if r.status == 'failed'), 0),
        "error": next((r.count for r in results if r.status == 'error'), 0),
        "pass_rate": round(success_count / total * 100, 2) if total > 0 else 0,
        "avg_duration_ms": round(next((r.avg_duration for r in results if r.avg_duration), 0), 2)
    }


@router.get("/trend")
async def get_result_trend(
    days: int = Query(7, le=30),
    current_user: UserResponse = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取测试结果趋势"""
    from sqlalchemy import func
    
    results = []
    for i in range(days):
        date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        date = date.replace(day=date.day - i)
        
        day_results = db.query(
            TestResult.status,
            func.count(TestResult.id).label('count')
        ).filter(
            func.date(TestResult.executed_at) == date.date()
        ).group_by(TestResult.status).all()
        
        total = sum(r.count for r in day_results)
        success = next((r.count for r in day_results if r.status == 'success'), 0)
        
        results.append({
            "date": date.strftime("%Y-%m-%d"),
            "total": total,
            "success": success,
            "pass_rate": round(success / total * 100, 2) if total > 0 else 0
        })
    
    return list(reversed(results))
