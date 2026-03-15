"""
接口执行服务 - 支持多接口关联、表单数据等
"""
import httpx
import json
from typing import Dict, Any, List, Optional
from urllib.parse import urlencode
from sqlalchemy.orm import Session
from app.models.models import TestCase, TestResult


class AssertionExecutor:
    """断言执行器"""
    
    @staticmethod
    def execute_assertions(response: dict, assertions: list) -> dict:
        """执行断言"""
        results = []
        all_passed = True
        
        for assertion in assertions:
            assertion_type = assertion.get("type", "status")
            passed = False
            message = ""
            
            try:
                if assertion_type == "status":
                    expected = assertion.get("expected")
                    actual = response.get("status_code")
                    passed = actual == expected
                    message = f"状态码: {actual} == {expected}" if passed else f"状态码: {actual} != {expected}"
                
                elif assertion_type == "json":
                    path = assertion.get("path", "$.data")
                    expected = assertion.get("expected")
                    actual = AssertionExecutor._extract_json_path(response.get("body", {}), path)
                    passed = actual == expected
                    message = f"{path}: {actual} == {expected}" if passed else f"{path}: {actual} != {expected}"
                
                elif assertion_type == "response_time":
                    expected = assertion.get("expected")
                    actual = response.get("elapsed_ms", 0)
                    operator = assertion.get("operator", "<")
                    passed = AssertionExecutor._compare(actual, operator, expected)
                    message = f"响应时间: {actual}ms {operator} {expected}ms"
                
                elif assertion_type == "contains":
                    expected = str(assertion.get("expected", ""))
                    actual = str(response.get("body", ""))
                    passed = expected in actual
                    message = f"包含: '{expected}' in response" if passed else f"未包含: '{expected}'"
                
            except Exception as e:
                passed = False
                message = f"断言执行错误: {str(e)}"
            
            results.append({
                "type": assertion_type,
                "passed": passed,
                "message": message
            })
            
            if not passed:
                all_passed = False
        
        return {
            "all_passed": all_passed,
            "results": results
        }
    
    @staticmethod
    def _extract_json_path(data: dict, path: str):
        """提取 JSON 路径，支持 $.data.token 格式"""
        if not path.startswith("$."):
            return data.get(path)
        
        parts = path[2:].split(".")
        current = data
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list) and part.isdigit():
                current = current[int(part)]
            else:
                return None
        return current
    
    @staticmethod
    def _compare(actual, operator, expected) -> bool:
        """比较操作"""
        ops = {
            "==": lambda a, e: a == e,
            "!=": lambda a, e: a != e,
            ">": lambda a, e: a > e,
            "<": lambda a, e: a < e,
            ">=": lambda a, e: a >= e,
            "<=": lambda a, e: a <= e,
        }
        return ops.get(operator, lambda a, e: False)(actual, expected)


class VariableExtractor:
    """变量提取器"""
    
    @staticmethod
    def extract(response: dict, var_config: dict) -> dict:
        """从响应中提取变量"""
        variables = {}
        
        for var_name, path in var_config.items():
            try:
                if path.startswith("$."):
                    value = AssertionExecutor._extract_json_path(response.get("body", {}), path)
                elif path.startswith("$resp.headers."):
                    header_name = path.replace("$resp.headers.", "")
                    value = response.get("headers", {}).get(header_name)
                elif path == "$resp.status_code":
                    value = response.get("status_code")
                else:
                    value = response.get("body", {}).get(path)
                variables[var_name] = value
            except:
                variables[var_name] = None
        
        return variables


class InterfaceExecutor:
    """接口执行器"""
    
    def __init__(self, base_url: str = ""):
        self.base_url = base_url
        self.variables = {}
    
    def replace_variables(self, value: str) -> str:
        """替换变量，支持 {{variable}} 格式"""
        if not isinstance(value, str):
            return value
        import re
        pattern = r'\{\{(\w+)\}\}'
        matches = re.findall(pattern, value)
        for var_name in matches:
            if var_name in self.variables:
                value = value.replace(f'{{{{{var_name}}}}}', str(self.variables[var_name]))
        return value
    
    def set_variable(self, name: str, value: any):
        """设置变量"""
        self.variables[name] = value
    
    def get_variables(self) -> Dict[str, any]:
        """获取所有变量"""
        return self.variables
    
    def _build_url(self, url: str, params: Dict[str, Any] = None) -> str:
        """构建完整URL"""
        full_url = f"{self.base_url}{url}" if not url.startswith("http") else url
        if params:
            query_string = urlencode(params)
            full_url = f"{full_url}?{query_string}"
        return full_url
    
    def _build_headers(self, headers: Dict[str, Any] = None, content_type: str = None) -> Dict[str, str]:
        """构建请求头"""
        result = {}
        if headers:
            result.update(headers)
        if content_type:
            result["Content-Type"] = content_type
        elif not result.get("Content-Type"):
            result["Content-Type"] = "application/json"
        return result
    
    def _build_body(self, body: Any, body_type: str = "json") -> Any:
        """根据body_type构建请求体"""
        if body_type == "json":
            return json.dumps(body) if isinstance(body, dict) else body
        elif body_type == "form-data":
            # 返回 dict，httpx会自动处理
            return body
        elif body_type == "x-www-form-urlencoded":
            # URL编码格式
            if isinstance(body, dict):
                return urlencode(body)
            return body
        elif body_type == "raw":
            return body
        return body
    
    async def execute(
        self,
        method: str,
        url: str,
        headers: Dict[str, Any] = None,
        params: Dict[str, Any] = None,
        body: Any = None,
        body_type: str = "json",
        timeout: int = 30
    ) -> Dict[str, Any]:
        """执行单个接口"""
        full_url = self._build_url(url, params)
        req_headers = self._build_headers(headers)
        
        # 根据body_type设置Content-Type
        if body_type == "json":
            req_headers["Content-Type"] = "application/json"
        elif body_type == "x-www-form-urlencoded":
            req_headers["Content-Type"] = "application/x-www-form-urlencoded"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method.upper(),
                    url=full_url,
                    headers=req_headers,
                    content=self._build_body(body, body_type) if body else None,
                    timeout=timeout
                )
                
                return {
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": self._parse_response(response),
                    "elapsed_ms": int(response.elapsed.total_seconds() * 1000)
                }
            except httpx.TimeoutException:
                return {
                    "status_code": 0,
                    "error": "请求超时",
                    "elapsed_ms": timeout * 1000
                }
            except Exception as e:
                return {
                    "status_code": 0,
                    "error": str(e),
                    "elapsed_ms": 0
                }
    
    def _parse_response(self, response: httpx.Response) -> Any:
        """解析响应体"""
        try:
            return response.json()
        except:
            return response.text
    
    async def execute_chain(
        self,
        interfaces: List[Dict[str, Any]],
        global_vars: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """执行接口链 - 支持多接口关联
        
        接口关联方式：
        1. {{前一个接口.response.data.token}} - 引用上一接口响应
        2. {{前一个接口.response.headers.set-cookie}} - 引用响应头
        """
        results = []
        vars_dict = global_vars or {}
        
        for i, iface in enumerate(interfaces):
            # 替换变量
            url = self._replace_vars(str(iface.get("url", "")), vars_dict)
            headers = self._replace_vars_dict(iface.get("headers", {}), vars_dict)
            params = self._replace_vars_dict(iface.get("params", {}), vars_dict)
            body = self._replace_vars_dict(iface.get("body", {}), vars_dict)
            
            # 执行接口
            result = await self.execute(
                method=iface.get("method", "GET"),
                url=url,
                headers=headers,
                params=params,
                body=body,
                body_type=iface.get("body_type", "json"),
                timeout=iface.get("timeout", 30)
            )
            
            # 保存结果到变量
            var_name = iface.get("var_name", f"interface_{i+1}")
            vars_dict[var_name] = result
            
            # 保存响应数据供后续接口引用
            if "body" in result and isinstance(result["body"], dict):
                vars_dict[f"{var_name}.response"] = result
                vars_dict[f"{var_name}.response.body"] = result["body"]
                
                # 尝试提取常见字段
                if "data" in result["body"]:
                    vars_dict[f"{var_name}.response.data"] = result["body"]["data"]
                if "token" in result["body"]:
                    vars_dict[f"{var_name}.response.token"] = result["body"]["token"]
                if "id" in result["body"]:
                    vars_dict[f"{var_name}.response.id"] = result["body"]["id"]
            
            results.append({
                "interface": iface.get("name", f"接口{i+1}"),
                "result": result
            })
        
        return results
    
    def _replace_vars(self, text: str, vars_dict: Dict[str, Any]) -> str:
        """替换文本中的变量"""
        if not text:
            return text
        
        for key, value in vars_dict.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in text:
                # 递归替换
                text = text.replace(placeholder, str(value))
        
        return text
    
    def _replace_vars_dict(self, data: Dict[str, Any], vars_dict: Dict[str, Any]) -> Dict[str, Any]:
        """替换字典中的变量"""
        if not data:
            return data
        
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = self._replace_vars(value, vars_dict)
            elif isinstance(value, dict):
                result[key] = self._replace_vars_dict(value, vars_dict)
            elif isinstance(value, list):
                result[key] = [
                    self._replace_vars_dict(item, vars_dict) if isinstance(item, dict) 
                    else self._replace_vars(item, vars_dict) if isinstance(item, str) 
                    else item
                    for item in value
                ]
            else:
                result[key] = value
        
        return result


# 执行器单例
executor = InterfaceExecutor()


async def execute_test_case(case, db: Session = None):
    """
    执行测试用例
    
    Args:
        case: TestCase 模型对象
        db: 数据库会话（可选）
    
    Returns:
        执行结果字典
    """
    from app.models.models import TestResult
    from datetime import datetime
    
    request_config = case.request_config or {}
    assertions = case.assertions or {}
    
    # 构建请求参数
    method = request_config.get("method", "GET")
    url = request_config.get("url", "")
    headers = request_config.get("headers", {})
    params = request_config.get("params", {})
    body = request_config.get("body", {})
    body_type = request_config.get("body_type", "json")
    
    # 执行请求
    exec_instance = InterfaceExecutor()
    result = await exec_instance.execute(
        method=method,
        url=url,
        headers=headers,
        params=params,
        body=body,
        body_type=body_type
    )
    
    # 验证断言
    assertion_results = []
    is_success = True
    
    for assertion in assertions.get("checks", []):
        assertion_type = assertion.get("type", "status_code")
        expected = assertion.get("expected")
        actual = None
        
        if assertion_type == "status_code":
            actual = result.get("status_code")
        elif assertion_type == "response_body":
            # 支持 JSONPath 简单提取
            key = assertion.get("key")
            if key:
                body = result.get("body", {})
                actual = body.get(key) if isinstance(body, dict) else None
        elif assertion_type == "response_time":
            actual = result.get("elapsed_ms")
        
        passed = actual == expected
        if not passed:
            is_success = False
        
        assertion_results.append({
            "type": assertion_type,
            "expected": expected,
            "actual": actual,
            "passed": passed
        })
    
    # 保存测试结果
    if db:
        test_result = TestResult(
            case_id=case.id,
            status="success" if is_success else "fail",
            response=result,
            error_message=None if is_success else f"断言失败: {assertion_results}",
            duration_ms=result.get("elapsed_ms", 0)
        )
        db.add(test_result)
        db.commit()
    
    return {
        "case_id": case.id,
        "case_name": case.name,
        "status": "success" if is_success else "fail",
        "response": result,
        "assertions": assertion_results,
        "duration_ms": result.get("elapsed_ms", 0)
    }
