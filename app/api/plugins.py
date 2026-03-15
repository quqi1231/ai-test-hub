"""
插件管理 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.plugin import PluginCreate, PluginUpdate, PluginResponse

router = APIRouter()

@router.get("/", response_model=List[PluginResponse])
async def list_plugins(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取插件列表"""
    return db.query(Plugin).offset(skip).limit(limit).all()

@router.get("/{plugin_id}", response_model=PluginResponse)
async def get_plugin(plugin_id: int, db: Session = Depends(get_db)):
    """获取插件详情"""
    plugin = db.query(Plugin).filter(Plugin.id == plugin_id).first()
    if not plugin:
        raise HTTPException(status_code=404, detail="插件不存在")
    return plugin

@router.post("/", response_model=PluginResponse)
async def create_plugin(plugin: PluginCreate, db: Session = Depends(get_db)):
    """创建插件"""
    db_plugin = Plugin(**plugin.dict())
    db.add(db_plugin)
    db.commit()
    db.refresh(db_plugin)
    return db_plugin

@router.put("/{plugin_id}", response_model=PluginResponse)
async def update_plugin(plugin_id: int, plugin: PluginUpdate, db: Session = Depends(get_db)):
    """更新插件"""
    db_plugin = db.query(Plugin).filter(Plugin.id == plugin_id).first()
    if not db_plugin:
        raise HTTPException(status_code=404, detail="插件不存在")
    
    for key, value in plugin.dict(exclude_unset=True).items():
        setattr(db_plugin, key, value)
    
    db.commit()
    db.refresh(db_plugin)
    return db_plugin

@router.delete("/{plugin_id}")
async def delete_plugin(plugin_id: int, db: Session = Depends(get_db)):
    """删除插件"""
    db_plugin = db.query(Plugin).filter(Plugin.id == plugin_id).first()
    if not db_plugin:
        raise HTTPException(status_code=404, detail="插件不存在")
    
    db.delete(db_plugin)
    db.commit()
    return {"message": "删除成功"}

@router.post("/{plugin_id}/toggle")
async def toggle_plugin(plugin_id: int, db: Session = Depends(get_db)):
    """启用/禁用插件"""
    db_plugin = db.query(Plugin).filter(Plugin.id == plugin_id).first()
    if not db_plugin:
        raise HTTPException(status_code=404, detail="插件不存在")
    
    db_plugin.is_enabled = not db_plugin.is_enabled
    db.commit()
    
    return {"message": f"插件已{'启用' if db_plugin.is_enabled else '禁用'}"}
