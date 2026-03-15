"""
定时任务 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.schemas.schedule import (
    ScheduleTaskCreate, ScheduleTaskUpdate, ScheduleTaskResponse,
    ScheduleRunResponse
)
from app.models.models import ScheduleTask, ScheduleRun

router = APIRouter()


@router.get("/tasks", response_model=List[ScheduleTaskResponse])
async def list_tasks(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    """获取项目下的定时任务列表"""
    return db.query(ScheduleTask).filter(
        ScheduleTask.project_id == project_id
    ).offset(skip).limit(limit).all()


@router.get("/tasks/{task_id}", response_model=ScheduleTaskResponse)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """获取任务详情"""
    task = db.query(ScheduleTask).filter(ScheduleTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.post("/tasks", response_model=ScheduleTaskResponse)
async def create_task(
    task: ScheduleTaskCreate,
    db: Session = Depends(get_db)
):
    """创建定时任务"""
    db_task = ScheduleTask(**task.dict())
    
    # 计算下次执行时间
    if db_task.interval_minutes:
        db_task.next_run_at = datetime.utcnow() + timedelta(minutes=db_task.interval_minutes)
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.put("/tasks/{task_id}", response_model=ScheduleTaskResponse)
async def update_task(
    task_id: int,
    task: ScheduleTaskUpdate,
    db: Session = Depends(get_db)
):
    """更新定时任务"""
    db_task = db.query(ScheduleTask).filter(ScheduleTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    for key, value in task.dict(exclude_unset=True).items():
        setattr(db_task, key, value)
    
    # 更新下次执行时间
    if db_task.interval_minutes:
        db_task.next_run_at = datetime.utcnow() + timedelta(minutes=db_task.interval_minutes)
    
    db.commit()
    db.refresh(db_task)
    return db_task


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """删除定时任务"""
    task = db.query(ScheduleTask).filter(ScheduleTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    db.delete(task)
    db.commit()
    return {"message": "删除成功"}


@router.post("/tasks/{task_id}/run")
async def run_task(task_id: int, db: Session = Depends(get_db)):
    """手动执行任务"""
    task = db.query(ScheduleTask).filter(ScheduleTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 创建执行记录
    run = ScheduleRun(
        task_id=task_id,
        status="running",
        started_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    # TODO: 实际执行任务（调用接口/链/用例）
    # 这里先模拟执行
    run.status = "success"
    run.finished_at = datetime.utcnow()
    run.duration_ms = 100
    
    task.last_run_at = datetime.utcnow()
    if task.interval_minutes:
        task.next_run_at = datetime.utcnow() + timedelta(minutes=task.interval_minutes)
    
    db.commit()
    db.refresh(run)
    
    return {"message": "执行成功", "run_id": run.id}


@router.get("/runs", response_model=List[ScheduleRunResponse])
async def list_runs(
    task_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    """获取执行历史"""
    query = db.query(ScheduleRun)
    if task_id:
        query = query.filter(ScheduleRun.task_id == task_id)
    return query.order_by(ScheduleRun.started_at.desc()).offset(skip).limit(limit).all()
