"""
接口自动化模块 - AI 辅助功能
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import httpx
import json

from app.core.database import get_db
from app.core.config import settings
from app.schemas.api_automation import (
    AIGenerateCasesRequest, AIGenerateCasesResponse,
    AIAnalyzeErrorRequest, AIAnalyzeErrorResponse,
    ApiTestCaseCreate
)

router = APIRouter()


async def call_ollama(prompt: str, model: str = None) -> str:
    """调用 Ollama API"""
    model = model or settings.ollama_model
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="AI 服务调用失败")
        
        data = response.json()
        return data.get("response", "")


@router.post("/ai/generate-cases")
async def ai_generate_cases(
    request: AIGenerateCasesRequest,
    db: Session = Depends(get_db)
):
    """AI 生成测试用例"""
    
    prompt = f"""你是一个专业的API测试工程师。请根据以下接口信息生成 {request.count} 个测试用例。

接口信息：
- URL: {request.url}
- 方法: {request.method}
- 描述: {request.description or '无'}

请以JSON数组格式返回测试用例，每个用例包含以下字段：
- name: 用例名称
- description: 用例描述
- method: HTTP方法
- url: 请求地址
- headers: 请求头（JSON对象）
- params: URL参数（JSON对象）
- body: 请求体（JSON对象或null）
- body_type: 请求体类型（json/form/raw）
- assertions: 断言列表（数组）

示例格式：
[
  {{
    "name": "正常获取列表",
    "description": "测试正常获取数据列表",
    "method": "{request.method}",
    "url": "{request.url}",
    "headers": {{}},
    "params": {{"page": 1, "size": 10}},
    "body": null,
    "body_type": "json",
    "assertions": [
      {{"type": "status_code", "expected": 200}},
      {{"type": "body_contains", "expected": "data"}}
    ]
  }}
]

请只返回JSON数组，不要包含其他文字说明。"""

    try:
        result = await call_ollama(prompt)
        
        # 尝试解析JSON
        # 清理可能的markdown代码块
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0]
        elif "```" in result:
            result = result.split("```")[1].split("```")[0]
        
        cases_data = json.loads(result.strip())
        
        # 格式化返回
        cases = []
        for case_data in cases_data[:request.count]:
            cases.append({
                "suite_id": 0,  # 需要前端指定
                "name": case_data.get("name", "未命名用例"),
                "description": case_data.get("description"),
                "method": case_data.get("method", request.method),
                "url": case_data.get("url", request.url),
                "headers": case_data.get("headers", {}),
                "params": case_data.get("params", {}),
                "body": case_data.get("body"),
                "body_type": case_data.get("body_type", "json"),
                "assertions": case_data.get("assertions", [])
            })
        
        return {"cases": cases}
        
    except json.JSONDecodeError:
        # 如果解析失败，返回默认用例
        return {
            "cases": [
                {
                    "suite_id": 0,
                    "name": "正常请求测试",
                    "description": "测试接口正常响应",
                    "method": request.method,
                    "url": request.url,
                    "headers": {},
                    "params": {},
                    "body": None,
                    "body_type": "json",
                    "assertions": [{"type": "status_code", "expected": 200}]
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")


@router.post("/ai/analyze-error")
async def ai_analyze_error(request: AIAnalyzeErrorRequest):
    """AI 分析错误原因"""
    
    prompt = f"""你是一个专业的API测试工程师。请分析以下接口请求失败的原因，并给出解决建议。

请求信息：
- 方法: {request.request_method}
- URL: {request.request_url}
- 响应状态码: {request.response_status or '无'}
- 错误信息: {request.error_message}

响应内容：
{request.response_body or '无'}

请以JSON格式返回分析结果：
{{
  "analysis": "错误原因分析",
  "suggestions": ["建议1", "建议2", "建议3"]
}}

请只返回JSON，不要包含其他文字说明。"""

    try:
        result = await call_ollama(prompt)
        
        # 清理可能的markdown代码块
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0]
        elif "```" in result:
            result = result.split("```")[1].split("```")[0]
        
        analysis_data = json.loads(result.strip())
        
        return {
            "analysis": analysis_data.get("analysis", "无法分析"),
            "suggestions": analysis_data.get("suggestions", [])
        }
        
    except json.JSONDecodeError:
        return {
            "analysis": f"请求失败，状态码: {request.response_status}",
            "suggestions": [
                "检查网络连接是否正常",
                "确认URL地址是否正确",
                "检查请求参数是否符合接口要求"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 分析失败: {str(e)}")


@router.post("/ai/suggest-assertions")
async def ai_suggest_assertions(
    url: str,
    method: str = "GET",
    description: str = None
):
    """AI 推荐断言规则"""
    
    prompt = f"""你是一个专业的API测试工程师。请为以下接口推荐合适的断言规则。

接口信息：
- URL: {url}
- 方法: {method}
- 描述: {description or '无'}

请以JSON数组格式返回断言规则：
[
  {{"type": "status_code", "expected": 200, "description": "状态码应为200"}},
  {{"type": "response_time", "expected": 1000, "description": "响应时间应小于1秒"}}
]

断言类型说明：
- status_code: 状态码断言
- response_time: 响应时间断言（毫秒）
- body_contains: 响应体包含指定文本
- json_path: JSONPath断言

请只返回JSON数组，不要包含其他文字说明。"""

    try:
        result = await call_ollama(prompt)
        
        # 清理可能的markdown代码块
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0]
        elif "```" in result:
            result = result.split("```")[1].split("```")[0]
        
        assertions = json.loads(result.strip())
        
        return {"assertions": assertions}
        
    except json.JSONDecodeError:
        return {
            "assertions": [
                {"type": "status_code", "expected": 200, "description": "状态码应为200"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 推荐失败: {str(e)}")
