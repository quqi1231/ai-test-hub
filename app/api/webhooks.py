"""
CI/CD Webhook API - 触发外部 CI/CD 系统
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import httpx
import asyncio
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.auth import UserResponse

router = APIRouter()


# ============ 数据模型 ============

class WebhookBase(BaseModel):
    name: str
    url: str
    method: str = "POST"
    headers: dict = {}
    trigger_on: str = "manual"  # manual, on_run, on_failure, on_success
    is_enabled: bool = True


class WebhookCreate(WebhookBase):
    pass


class WebhookResponse(WebhookBase):
    id: int
    project_id: Optional[int] = None
    created_by: int
    last_triggered: Optional[datetime] = None
    last_status: Optional[int] = None
    trigger_count: int = 0
    
    class Config:
        from_attributes = True


class WebhookTriggerRequest(BaseModel):
    payload: dict = {}


# ============ 数据库模型 ============

class Webhook:
    """Webhook 模型 (使用 dict 模拟)"""
    def __init__(self):
        self.data = {}
    
    @staticmethod
    def get_table():
        return "webhooks"


# 内存存储 (生产环境应使用数据库)
webhooks_db: dict = {}


# ============ API 路由 ============

@router.get("/", response_model=List[WebhookResponse])
async def list_webhooks(
    project_id: Optional[int] = None,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """获取 Webhook 列表"""
    result = []
    for wh in webhooks_db.values():
        if project_id is None or wh.get("project_id") == project_id:
            result.append(wh)
    return result


@router.post("/", response_model=WebhookResponse)
async def create_webhook(
    webhook: WebhookCreate,
    project_id: Optional[int] = None,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """创建 Webhook"""
    wh_id = len(webhooks_db) + 1
    wh = {
        "id": wh_id,
        "name": webhook.name,
        "url": webhook.url,
        "method": webhook.method,
        "headers": webhook.headers,
        "trigger_on": webhook.trigger_on,
        "is_enabled": webhook.is_enabled,
        "project_id": project_id,
        "created_by": current_user.id,
        "last_triggered": None,
        "last_status": None,
        "trigger_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    webhooks_db[wh_id] = wh
    return wh


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """删除 Webhook"""
    if webhook_id not in webhooks_db:
        raise HTTPException(status_code=404, detail="Webhook 不存在")
    del webhooks_db[webhook_id]
    return {"message": "删除成功"}


@router.post("/{webhook_id}/trigger")
async def trigger_webhook(
    webhook_id: int,
    request: WebhookTriggerRequest = None,
    background_tasks: BackgroundTasks = None,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """手动触发 Webhook"""
    if webhook_id not in webhooks_db:
        raise HTTPException(status_code=404, detail="Webhook 不存在")
    
    wh = webhooks_db[webhook_id]
    
    if not wh.get("is_enabled", True):
        raise HTTPException(status_code=400, detail="Webhook 已禁用")
    
    payload = request.payload if request else {}
    payload.update({
        "triggered_by": current_user.username,
        "triggered_at": datetime.utcnow().isoformat(),
        "webhook_name": wh["name"]
    })
    
    # 异步发送请求
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            method = wh["method"].upper()
            headers = wh.get("headers", {})
            headers["Content-Type"] = headers.get("Content-Type", "application/json")
            
            if method == "POST":
                resp = await client.post(wh["url"], json=payload, headers=headers)
            elif method == "PUT":
                resp = await client.put(wh["url"], json=payload, headers=headers)
            elif method == "GET":
                resp = await client.get(wh["url"], params=payload, headers=headers)
            else:
                raise HTTPException(status_code=400, detail=f"不支持的方法: {method}")
            
            status = resp.status_code
            wh["last_triggered"] = datetime.utcnow().isoformat()
            wh["last_status"] = status
            wh["trigger_count"] = wh.get("trigger_count", 0) + 1
            
            return {
                "success": status < 400,
                "status_code": status,
                "response": resp.text[:500] if resp.text else ""
            }
    except httpx.RequestError as e:
        wh["last_triggered"] = datetime.utcnow().isoformat()
        wh["last_status"] = 0
        raise HTTPException(status_code=500, detail=f"请求失败: {str(e)}")


@router.post("/{webhook_id}/toggle")
async def toggle_webhook(
    webhook_id: int,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """启用/禁用 Webhook"""
    if webhook_id not in webhooks_db:
        raise HTTPException(status_code=404, detail="Webhook 不存在")
    
    wh = webhooks_db[webhook_id]
    wh["is_enabled"] = not wh.get("is_enabled", True)
    
    return {"is_enabled": wh["is_enabled"]}


# ============ 自动触发 ============

async def trigger_webhooks_by_event(project_id: int, event_type: str, payload: dict):
    """根据事件自动触发 Webhook"""
    for wh in webhooks_db.values():
        if wh.get("project_id") != project_id:
            continue
        if not wh.get("is_enabled", True):
            continue
        if wh.get("trigger_on") != event_type and wh.get("trigger_on") != "on_run":
            continue
        
        # 触发 webhook
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                payload["webhook_name"] = wh["name"]
                headers = wh.get("headers", {})
                headers["Content-Type"] = "application/json"
                
                method = wh["method"].upper()
                if method == "POST":
                    await client.post(wh["url"], json=payload, headers=headers)
                elif method == "PUT":
                    await client.put(wh["url"], json=payload, headers=headers)
        except:
            pass


@router.post("/test")
async def test_webhook_connection(
    url: str,
    method: str = "POST",
    current_user: UserResponse = Depends(get_current_active_user)
):
    """测试 Webhook 连接"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if method.upper() == "POST":
                resp = await client.post(url, json={"test": True})
            elif method.upper() == "GET":
                resp = await client.get(url)
            else:
                return {"success": False, "error": f"不支持的方法: {method}"}
            
            return {
                "success": resp.status_code < 400,
                "status_code": resp.status_code
            }
    except httpx.RequestError as e:
        return {"success": False, "error": str(e)}
