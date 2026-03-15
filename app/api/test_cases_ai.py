"""
AI 测试用例生成 API - 增强版
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.services.ai_service import OllamaService, TestCaseParser
from app.models.models import Interface
from app.models.test_suite import TestSuite, TestSuiteItem

router = APIRouter()


@router.post("/generate-test-cases")
async def generate_test_cases(
    requirement: str,
    base_url: str = "https://api.example.com",
    test_types: Optional[List[str]] = None
):
    """
    AI 生成测试用例 - 支持功能/性能/兼容性
    
    请求参数:
    - requirement: 需求描述，如 "用户登录功能"
    - base_url: 基础 URL
    - test_types: 测试类型 ['function', 'performance', 'compatible']，默认全部
    
    返回:
    {
        "cases": [...],
        "raw_response": "...",
        "parsed_count": 5,
        "valid_count": 3
    }
    """
    # 默认生成全部类型
    if test_types is None:
        test_types = ['function', 'performance', 'compatible']
    
    # 构建 prompt
    test_type_prompts = {
        'function': """
1. 功能测试（必须包含）：
   - 正常流程：用正确数据验证功能正常
   - 边界值：空值、最大值、特殊字符
   - 异常流程：错误数据、超时、无权限
   - 每个功能至少 3-5 个用例""",
        
        'performance': """
2. 性能测试（必须包含）：
   - 响应时间：100ms, 500ms, 1s, 3s
   - 并发测试：10, 50, 100 并发
   - 吞吐量：10, 50, 100 QPS
   - 至少 3 个用例""",
        
        'compatible': """
3. 兼容性测试（必须包含）：
   - 不同浏览器：Chrome, Firefox, Safari, Edge
   - 至少 2 个用例"""
    }
    
    prompt = f"""你是一个专业的测试工程师，擅长生成高质量的测试用例。

请根据需求生成测试用例。

需求：{requirement}
Base URL：{base_url}

请生成以下类型的测试用例：

{chr(10).join([test_type_prompts.get(t, '') for t in test_types])}

重要要求：
1. 每个用例必须是完整的、可执行的 HTTP 请求
2. 请严格按照 JSON 数组格式返回，不要包含任何解释文字
3. 返回格式示例：
[
    {{
        "name": "正常登录-功能测试",
        "method": "POST",
        "url": "/api/login",
        "description": "使用正确的用户名密码登录",
        "headers": {{"Content-Type": "application/json"}},
        "params": {{}},
        "body": {{"username": "test", "password": "123456"}},
        "body_type": "json",
        "assertions": [
            {{"type": "status", "expected": 200}},
            {{"type": "json", "path": "$.code", "expected": 0}}
        ],
        "tags": ["function"],
        "performance": null
    }},
    {{
        "name": "登录性能-响应时间",
        "method": "POST",
        "url": "/api/login",
        "description": "登录响应时间应小于1秒",
        "headers": {{}},
        "params": {{}},
        "body": {{"username": "test", "password": "123456"}},
        "body_type": "json",
        "assertions": [],
        "tags": ["performance"],
        "performance": {{"maxResponseTime": 1000}}
    }}
]

请生成至少 10 个测试用例，覆盖不同场景。只需返回 JSON 数组，不要有任何其他文字说明。"""
    
    # 调用 AI
    ai_service = OllamaService()
    raw_response = await ai_service.generate(prompt)
    
    # 解析响应
    cases = TestCaseParser.parse_response(raw_response, base_url)
    
    # 验证每个用例
    valid_cases = []
    invalid_cases = []
    for case in cases:
        validation = TestCaseParser.validate_case(case)
        if validation['valid']:
            valid_cases.append(case)
        else:
            invalid_cases.append({
                'case': case,
                'errors': validation['errors']
            })
    
    return {
        "cases": valid_cases,
        "raw_response": raw_response[:500],  # 截取部分原始响应
        "parsed_count": len(cases),
        "valid_count": len(valid_cases),
        "invalid_count": len(invalid_cases),
        "invalid_cases": invalid_cases[:3],  # 最多显示 3 个
        "message": f"解析到 {len(cases)} 个用例，其中 {len(valid_cases)} 个有效"
    }


@router.post("/import-ai-cases")
async def import_ai_cases(
    project_id: int,
    suite_name: str,
    cases: List[dict],
    db: Session = Depends(get_db)
):
    """
    批量导入 AI 生成的测试用例，创建测试集
    
    请求:
    {
        "project_id": 1,
        "suite_name": "用户登录测试集",
        "cases": [...]
    }
    """
    if not cases:
        raise HTTPException(status_code=400, detail="用例列表不能为空")
    
    if not suite_name:
        raise HTTPException(status_code=400, detail="测试集名称不能为空")
    
    # 验证并标准化用例
    valid_cases = []
    for case in cases:
        # 确保必要字段
        if not case.get('url'):
            continue
        
        normalized = {
            'name': case.get('name', '未命名'),
            'method': case.get('method', 'GET').upper(),
            'url': case.get('url', ''),
            'description': case.get('description', ''),
            'headers': case.get('headers', {}),
            'params': case.get('params', {}),
            'body': case.get('body', {}),
            'body_type': case.get('body_type', 'json'),
        }
        valid_cases.append(normalized)
    
    if not valid_cases:
        raise HTTPException(status_code=400, detail="没有有效的用例可以导入")
    
    # 创建测试集
    suite = TestSuite(
        project_id=project_id,
        name=suite_name,
        description=f"AI 自动生成 - {suite_name}"
    )
    db.add(suite)
    db.commit()
    db.refresh(suite)
    
    # 创建接口和测试集项目
    created_count = 0
    for i, case in enumerate(valid_cases):
        # 创建接口
        interface = Interface(
            project_id=project_id,
            name=case['name'],
            method=case['method'],
            url=case['url'],
            description=case.get('description', ''),
            headers=case.get('headers'),
            params=case.get('params'),
            body=case.get('body'),
            body_type=case.get('body_type', 'json')
        )
        db.add(interface)
        db.commit()
        db.refresh(interface)
        
        # 创建测试集项目
        item = TestSuiteItem(
            suite_id=suite.id,
            interface_id=interface.id,
            order_index=i,
            enabled=True
        )
        db.add(item)
        created_count += 1
    
    db.commit()
    
    return {
        "suite_id": suite.id,
        "suite_name": suite_name,
        "total_cases": len(valid_cases),
        "created_count": created_count,
        "message": f"成功创建测试集 '{suite_name}'，包含 {created_count} 个测试用例"
    }


@router.get("/validate-case")
async def validate_case(case: dict):
    """验证单个测试用例"""
    validation = TestCaseParser.validate_case(case)
    return validation
