"""
定时任务 Schema
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ScheduleTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    task_type: str
    target_id: int
    is_enabled: bool = True


class ScheduleTaskCreate(ScheduleTaskBase):
    project_id: int


class ScheduleTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    task_type: Optional[str] = None
    target_id: Optional[int] = None
    is_enabled: Optional[bool] = None


class ScheduleTaskResponse(ScheduleTaskBase):
    id: int
    project_id: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduleRunBase(BaseModel):
    task_id: int
    status: str
    result: Optional[Any] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None


class ScheduleRunResponse(ScheduleRunBase):
    id: int
    started_at: datetime
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True
