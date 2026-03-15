"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import (
    interfaces, cases, ai, plugins, projects, environments, chains, 
    datasources, auth, results, webhooks, jenkins, schedule, 
    test_suites, test_execute, scan_code, knowledge, nl_execute, websocket,
    ai_chat, api_automation, api_automation_ai
)

app = FastAPI(
    title="智能软件测试平台 API",
    description="接口自动化测试 + AI 智能测试平台",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["用户认证"])
app.include_router(projects.router, prefix="/api/projects", tags=["项目管理"])
app.include_router(interfaces.router, prefix="/api/interfaces", tags=["接口管理"])
app.include_router(cases.router, prefix="/api/cases", tags=["用例管理"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI 功能"])
app.include_router(plugins.router, prefix="/api/plugins", tags=["插件管理"])
app.include_router(environments.router, prefix="/api/environments", tags=["环境配置"])
app.include_router(chains.router, prefix="/api/chains", tags=["接口链"])
app.include_router(datasources.router, prefix="/api/datasources", tags=["数据源"])
app.include_router(results.router, prefix="/api/results", tags=["测试结果"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["CI/CD Webhook"])
app.include_router(jenkins.router, prefix="/api/jenkins", tags=["Jenkins 集成"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["定时任务"])
app.include_router(test_suites.router, prefix="/api/test-suites", tags=["测试集"])
app.include_router(test_execute.router, prefix="/api", tags=["测试执行"])
app.include_router(scan_code.router, prefix="/api/scan-code", tags=["代码扫描"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["RAG 知识库"])
app.include_router(ai_chat.router, prefix="/api/ai-chat", tags=["AI 聊天"])
app.include_router(nl_execute.router, prefix="/api/nl-execute", tags=["自然语言执行"])
app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket 推送"])
# 新接口自动化模块
app.include_router(api_automation.router, prefix="/api/v2/automation", tags=["接口自动化 V2"])
app.include_router(api_automation_ai.router, prefix="/api/v2/automation", tags=["接口自动化 AI"])

@app.get("/")
async def root():
    return {"message": "智能软件测试平台 API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
