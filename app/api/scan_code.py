"""
代码扫描接口识别 & 自动生成测试用例 API
"""
import ast
import os
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ScannedEndpoint(BaseModel):
    """扫描到的接口端点"""
    path: str
    method: str
    function_name: str
    file_path: str
    summary: str = ""
    request_body: Optional[Dict[str, Any]] = None
    query_params: List[str] = []
    path_params: List[str] = []


def parse_python_file(file_path: str) -> List[ScannedEndpoint]:
    """解析 Python 文件，提取 FastAPI 接口定义"""
    endpoints = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content)
        
        # 遍历 AST 树
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # 检查装饰器
                for decorator in node.decorator_list:
                    method = None
                    path = ""
                    
                    # 解析装饰器名称
                    if isinstance(decorator, ast.Call):
                        # @router.get("/path")
                        if isinstance(decorator.func, ast.Attribute):
                            method = decorator.func.attr.lower()
                            if method in ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']:
                                # 获取路径参数
                                if decorator.args:
                                    if isinstance(decorator.args[0], ast.Constant):
                                        path = decorator.args[0].value
                                elif decorator.keywords:
                                    for kw in decorator.keywords:
                                        if kw.arg == 'path':
                                            if isinstance(kw.value, ast.Constant):
                                                path = kw.value.value
                    
                    if method and path:
                        # 提取函数文档字符串
                        summary = ast.get_docstring(node) or ""
                        # 简化文档字符串，取第一行
                        if summary:
                            summary = summary.split('\n')[0].strip()
                        
                        # 提取参数
                        query_params = []
                        path_params = []
                        request_body = None
                        
                        for arg in node.args.args:
                            param_name = arg.arg
                            if param_name not in ['self', 'db', 'request', 'current_user', 'kwargs', 'args']:
                                # 检查是否有默认值
                                if arg.default:
                                    query_params.append(param_name)
                                elif not path_params:
                                    # 可能是 path 参数
                                    pass
                                else:
                                    query_params.append(param_name)
                        
                        # 检查函数体中的 Body 参数
                        if node.args.args:
                            for arg in node.args.args:
                                if arg.arg in ['body', 'data', 'item', 'schema']:
                                    request_body = {"type": "json", "description": f"Request body for {arg.arg}"}
                        
                        # 转换方法名为大写
                        method = method.upper()
                        
                        endpoints.append(ScannedEndpoint(
                            path=path,
                            method=method,
                            function_name=node.name,
                            file_path=file_path,
                            summary=summary,
                            request_body=request_body,
                            query_params=query_params,
                            path_params=path_params
                        ))
    
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    
    return endpoints


def scan_directory_for_endpoints(directory: str, prefix: str = "/api") -> List[ScannedEndpoint]:
    """扫描目录下的所有 Python 文件，提取接口"""
    all_endpoints = []
    
    for root, dirs, files in os.walk(directory):
        # 跳过 __pycache__ 和隐藏目录
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
        
        for file in files:
            if file.endswith('.py') and not file.startswith('__'):
                file_path = os.path.join(root, file)
                
                # 解析文件
                endpoints = parse_python_file(file_path)
                
                # 添加前缀
                for endpoint in endpoints:
                    endpoint.path = prefix + endpoint.path
                
                all_endpoints.extend(endpoints)
    
    return all_endpoints


@router.get("/scan-code/interfaces")
async def scan_project_interfaces(
    project_path: str = "app",
    base_url: str = "http://localhost:8000"
):
    """
    扫描项目代码，识别所有 API 接口
    
    参数:
    - project_path: 项目代码路径，默认 "app"
    - base_url: 基础 URL
    
    返回:
    {
        "endpoints": [...],
        "total": 10,
        "by_method": {"GET": 5, "POST": 3, "PUT": 2}
    }
    """
    import os
    
    # 获取项目根目录
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scan_path = os.path.join(project_root, project_path)
    
    if not os.path.exists(scan_path):
        raise HTTPException(status_code=404, detail=f"项目路径不存在: {scan_path}")
    
    # 扫描接口
    endpoints = scan_directory_for_endpoints(scan_path, prefix=base_url)
    
    # 统计
    by_method = {}
    for ep in endpoints:
        by_method[ep.method] = by_method.get(ep.method, 0) + 1
    
    return {
        "endpoints": [ep.model_dump() for ep in endpoints],
        "total": len(endpoints),
        "by_method": by_method,
        "message": f"成功扫描 {len(endpoints)} 个接口"
    }


@router.post("/scan-code/generate-cases")
async def scan_and_generate_cases(
    project_path: str = "app",
    base_url: str = "http://localhost:8000",
    test_types: Optional[List[str]] = None
):
    """
    扫描项目代码并自动生成测试用例
    
    参数:
    - project_path: 项目代码路径
    - base_url: 基础 URL
    - test_types: 测试类型 ['function', 'performance', 'compatible']
    
    返回:
    {
        "scanned": {"total": 10, "by_method": {...}},
        "generated_cases": [...],
        "message": "..."
    }
    """
    import os
    from app.services.ai_service import OllamaService, TestCaseParser
    
    if test_types is None:
        test_types = ['function']
    
    # 扫描接口
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scan_path = os.path.join(project_root, project_path)
    
    if not os.path.exists(scan_path):
        raise HTTPException(status_code=404, detail=f"项目路径不存在: {scan_path}")
    
    endpoints = scan_directory_for_endpoints(scan_path, prefix=base_url)
    
    if not endpoints:
        return {
            "scanned": {"total": 0, "by_method": {}},
            "generated_cases": [],
            "message": "未扫描到任何接口"
        }
    
    # 构建扫描摘要
    by_method = {}
    for ep in endpoints:
        by_method[ep.method] = by_method.get(ep.method, 0) + 1
    
    # 构建需求描述
    interfaces_summary = "\n".join([
        f"- {ep.method} {ep.path} - {ep.summary or ep.function_name}"
        for ep in endpoints[:20]  # 最多20个
    ])
    
    # 调用 AI 生成测试用例
    prompt = f"""你是一个专业的测试工程师。请根据以下扫描到的 API 接口自动生成测试用例。

项目接口列表：
{interfaces_summary}
{"..." if len(endpoints) > 20 else ""}

请为每个接口生成以下测试用例：
1. 正常场景：用正确的数据调用接口
2. 异常场景：空参数、错误参数、无权限等
3. 边界值：最大/最小值、特殊字符

返回 JSON 数组格式，每个用例包含：
{{
    "name": "用例名称",
    "method": "GET/POST/PUT/DELETE",
    "url": "/api/xxx",
    "description": "用例描述",
    "headers": {{}},
    "params": {{}},
    "body": {{}},
    "body_type": "json",
    "assertions": [{{"type": "status", "expected": 200}}]
}}

只需返回 JSON 数组，不要其他文字。"""
    
    ai_service = OllamaService()
    raw_response = await ai_service.generate(prompt)
    
    # 解析响应
    cases = TestCaseParser.parse_response(raw_response, base_url)
    
    # 验证用例
    valid_cases = []
    for case in cases:
        validation = TestCaseParser.validate_case(case)
        if validation['valid']:
            valid_cases.append(case)
    
    return {
        "scanned": {
            "total": len(endpoints),
            "by_method": by_method,
            "endpoints": [ep.model_dump() for ep in endpoints[:10]]  # 返回前10个
        },
        "generated_cases": valid_cases,
        "raw_response": raw_response[:500],
        "message": f"扫描到 {len(endpoints)} 个接口，生成 {len(valid_cases)} 个测试用例"
    }
