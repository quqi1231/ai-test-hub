"""
WebSocket 实时推送 - 测试执行过程实时展示
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List, Optional
import asyncio
import json
from datetime import datetime
from enum import Enum

router = APIRouter(tags=["WebSocket 实时推送"])


class ExecutionStatus(str, Enum):
    """执行状态"""
    STARTING = "starting"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ConnectionManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        # 存储所有活跃连接: {session_id: websocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # 存储执行的订阅者: {execution_id: [websockets]}
        self.execution_subscribers: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """客户端连接"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str):
        """客户端断开"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        # 从所有订阅中移除
        for execution_id in list(self.execution_subscribers.keys()):
            self.execution_subscribers[execution_id] = [
                ws for ws in self.execution_subscribers[execution_id]
                if ws != self.active_connections.get(session_id)
            ]
    
    async def send_personal_message(self, message: dict, session_id: str):
        """发送个人消息"""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except:
                self.disconnect(session_id)
    
    async def broadcast_execution(self, execution_id: str, message: dict):
        """广播执行消息给所有订阅者"""
        if execution_id in self.execution_subscribers:
            for websocket in self.execution_subscribers[execution_id]:
                try:
                    await websocket.send_json(message)
                except:
                    pass
    
    def subscribe(self, execution_id: str, session_id: str):
        """订阅执行进度"""
        if execution_id not in self.execution_subscribers:
            self.execution_subscribers[execution_id] = []
        ws = self.active_connections.get(session_id)
        if ws and ws not in self.execution_subscribers[execution_id]:
            self.execution_subscribers[execution_id].append(ws)
    
    def unsubscribe(self, execution_id: str, session_id: str):
        """取消订阅"""
        if execution_id in self.execution_subscribers:
            ws = self.active_connections.get(session_id)
            if ws in self.execution_subscribers[execution_id]:
                self.execution_subscribers[execution_id].remove(ws)


# 全局连接管理器
manager = ConnectionManager()


@router.websocket("/ws/execute/{execution_id}")
async def websocket_execute(websocket: WebSocket, execution_id: str, session_id: str = "default"):
    """
    WebSocket 端点 - 测试执行实时推送
    
    前端连接: new WebSocket("ws://localhost:8000/ws/execute/{execution_id}?session_id=xxx")
    
    消息格式:
    - 客户端发送: {"type": "subscribe", "execution_id": "xxx"}
    - 服务端推送: {"type": "progress", "status": "running", "progress": 50, "message": "正在执行第5个用例"}
    """
    await manager.connect(websocket, session_id)
    
    try:
        # 发送连接成功消息
        await websocket.send_json({
            "type": "connected",
            "execution_id": execution_id,
            "message": "已连接到实时推送服务"
        })
        
        # 保持连接，处理消息
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type == "subscribe":
                    # 订阅执行进度
                    exec_id = message.get("execution_id", execution_id)
                    manager.subscribe(exec_id, session_id)
                    await websocket.send_json({
                        "type": "subscribed",
                        "execution_id": exec_id
                    })
                
                elif msg_type == "unsubscribe":
                    # 取消订阅
                    exec_id = message.get("execution_id", execution_id)
                    manager.unsubscribe(exec_id, session_id)
                
                elif msg_type == "ping":
                    # 心跳
                    await websocket.send_json({"type": "pong"})
                
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)


@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket, session_id: str = "default"):
    """
    WebSocket 端点 - 日志实时推送
    用于推送执行日志
    """
    await manager.connect(websocket, session_id)
    
    try:
        await websocket.send_json({
            "type": "connected",
            "message": "已连接到日志服务"
        })
        
        while True:
            data = await websocket.receive_text()
            # 这里可以处理日志过滤等
            pass
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)


# ==================== 辅助函数 ====================

async def send_execution_progress(
    execution_id: str,
    status: ExecutionStatus,
    progress: int,
    message: str,
    details: Optional[dict] = None
):
    """发送执行进度（供其他 API 调用）"""
    await manager.broadcast_execution(execution_id, {
        "type": "progress",
        "execution_id": execution_id,
        "status": status.value,
        "progress": progress,
        "message": message,
        "details": details or {},
        "timestamp": datetime.now().isoformat()
    })


async def send_execution_log(execution_id: str, log: str, level: str = "info"):
    """发送执行日志"""
    await manager.broadcast_execution(execution_id, {
        "type": "log",
        "execution_id": execution_id,
        "log": log,
        "level": level,
        "timestamp": datetime.now().isoformat()
    })


async def send_execution_result(
    execution_id: str,
    success: bool,
    total: int,
    passed: int,
    failed: int,
    duration_ms: int
):
    """发送执行结果"""
    await manager.broadcast_execution(execution_id, {
        "type": "result",
        "execution_id": execution_id,
        "success": success,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": f"{(passed/total*100):.1f}%" if total > 0 else "0%"
        },
        "duration_ms": duration_ms,
        "timestamp": datetime.now().isoformat()
    })


# ==================== REST API（可选） ====================

@router.post("/execute/{execution_id}/progress")
async def trigger_progress_notification(execution_id: str):
    """手动触发进度通知（测试用）"""
    await send_execution_progress(
        execution_id,
        ExecutionStatus.RUNNING,
        50,
        "正在执行第5个测试用例",
        {"current_case": "用户登录测试", "total_cases": 10}
    )
    return {"message": "已发送进度通知"}
