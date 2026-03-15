"""
Jenkins CI/CD 集成
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import httpx
import base64

router = APIRouter()


# ============ 数据模型 ============

class JenkinsConfig(BaseModel):
    url: str  # Jenkins URL
    username: str  # Jenkins 用户名
    token: str  # API Token
    name: str  # 配置名称


class JenkinsJob(BaseModel):
    name: str
    url: str
    color: str
    lastBuild: Optional[dict] = None


class JenkinsBuild(BaseModel):
    number: int
    url: str
    result: Optional[str]
    timestamp: int
    duration: int


class JenkinsTriggerRequest(BaseModel):
    job_name: str
    parameters: dict = {}


# ============ 内存存储 ============

jenkins_configs: dict = {}


# ============ 辅助函数 ============

def get_jenkins_auth(username: str, token: str) -> str:
    """生成 Jenkins Basic Auth 头"""
    credentials = f"{username}:{token}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


async def call_jenkins(method: str, url: str, config: JenkinsConfig, data: dict = None):
    """通用的 Jenkins API 调用"""
    headers = {
        "Authorization": get_jenkins_auth(config.username, config.token),
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=60) as client:
        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, json=data, headers=headers)
        else:
            raise ValueError(f"不支持的方法: {method}")
        
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=f"Jenkins API 错误: {resp.text}")
        
        return resp.json()


# ============ API 路由 ============

@router.post("/configs")
async def create_jenkins_config(config: JenkinsConfig):
    """添加 Jenkins 配置"""
    config_id = len(jenkins_configs) + 1
    jenkins_configs[config_id] = {
        "id": config_id,
        "url": config.url.rstrip("/"),
        "username": config.username,
        "token": config.token,
        "name": config.name,
        "created_at": datetime.utcnow().isoformat()
    }
    return {"id": config_id, "message": "配置添加成功"}


@router.get("/configs")
async def list_jenkins_configs():
    """获取 Jenkins 配置列表"""
    return list(jenkins_configs.values())


@router.delete("/configs/{config_id}")
async def delete_jenkins_config(config_id: int):
    """删除 Jenkins 配置"""
    if config_id not in jenkins_configs:
        raise HTTPException(status_code=404, detail="配置不存在")
    del jenkins_configs[config_id]
    return {"message": "删除成功"}


@router.get("/configs/{config_id}/jobs")
async def list_jobs(config_id: int):
    """获取 Jenkins 任务列表"""
    if config_id not in jenkins_configs:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    config = JenkinsConfig(**jenkins_configs[config_id])
    api_url = f"{config.url}/api/json?tree=jobs[name,url,color,lastBuild[number,result,timestamp,duration]]"
    
    try:
        data = await call_jenkins("GET", api_url, config)
        return data.get("jobs", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configs/{config_id}/build")
async def trigger_build(config_id: int, request: JenkinsTriggerRequest):
    """触发 Jenkins 构建"""
    if config_id not in jenkins_configs:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    config = JenkinsConfig(**jenkins_configs[config_id])
    
    # 构建 URL
    build_url = f"{config.url}/job/{request.job_name}/buildWithParameters" if request.parameters else f"{config.url}/job/{request.job_name}/build"
    
    try:
        # Jenkins 构建 API 返回 201 表示成功
        await call_jenkins("POST", build_url, config, request.parameters if request.parameters else {})
        return {"message": "构建已触发", "job": request.job_name}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 201:
            return {"message": "构建已触发", "job": request.job_name}
        raise HTTPException(status_code=e.response.status_code, detail=f"触发失败: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/configs/{config_id}/build/{job_name}")
async def get_build_info(config_id: int, job_name: str, build_number: int = None):
    """获取构建信息"""
    if config_id not in jenkins_configs:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    config = JenkinsConfig(**jenkins_configs[config_id])
    
    # 获取最新构建或指定构建
    if build_number:
        api_url = f"{config.url}/job/{job_name}/{build_number}/api/json"
    else:
        api_url = f"{config.url}/job/{job_name}/lastBuild/api/json"
    
    try:
        data = await call_jenkins("GET", api_url, config)
        return {
            "number": data.get("number"),
            "result": data.get("result"),
            "timestamp": datetime.fromtimestamp(data.get("timestamp", 0) / 1000).isoformat(),
            "duration": data.get("duration", 0) / 1000,  # 转换为秒
            "url": data.get("url"),
            "building": data.get("building", False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/configs/{config_id}/builds/{job_name}")
async def get_build_history(config_id: int, job_name: str, limit: int = 10):
    """获取构建历史"""
    if config_id not in jenkins_configs:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    config = JenkinsConfig(**jenkins_configs[config_id])
    api_url = f"{config.url}/job/{job_name}/api/json?tree=builds[number,result,timestamp,duration,url]"
    
    try:
        data = await call_jenkins("GET", api_url, config)
        builds = data.get("builds", [])[:limit]
        return [{
            "number": b.get("number"),
            "result": b.get("result"),
            "timestamp": datetime.fromtimestamp(b.get("timestamp", 0) / 1000).isoformat(),
            "duration": b.get("duration", 0) / 1000,
            "url": b.get("url")
        } for b in builds]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configs/{config_id}/test")
async def test_jenkins_connection(config_id: int):
    """测试 Jenkins 连接"""
    if config_id not in jenkins_configs:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    config = JenkinsConfig(**jenkins_configs[config_id])
    api_url = f"{config.url}/api/json"
    
    try:
        data = await call_jenkins("GET", api_url, config)
        return {
            "success": True,
            "version": data.get("version"),
            "mode": data.get("mode"),
            "description": data.get("description")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============ Webhook 集成 ============

@router.post("/webhook/jenkins")
async def jenkins_webhook(payload: dict):
    """Jenkins Webhook 回调"""
    # 解析 Jenkins Webhook payload
    job_name = payload.get("job_name", "")
    build_status = payload.get("build_status", payload.get("result", "UNKNOWN"))
    build_number = payload.get("build_number", 0)
    
    # 可以在这里添加触发后续测试等逻辑
    return {
        "received": True,
        "job": job_name,
        "status": build_status,
        "build": build_number
    }
