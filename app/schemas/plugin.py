"""
Plugin Schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class PluginBase(BaseModel):
    name: str
    description: Optional[str] = None
    version: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_enabled: bool = True

class PluginCreate(PluginBase):
    pass

class PluginUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = None

class PluginResponse(PluginBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
