"""
Ollama AI 服务 - 增强版
"""
import json
import re
from typing import List, Dict, Any, Optional
from app.core.config import settings


class OllamaService:
    """Ollama 本地模型服务"""
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
    
    async def generate(self, prompt: str) -> str:
        """调用 Ollama 生成内容"""
        import httpx
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False
                    },
                    timeout=120.0
                )
                result = response.json()
                return result.get("response", "")
            except Exception as e:
                return f"AI 服务调用失败: {str(e)}"
    
    async def chat(self, messages: list) -> str:
        """调用 Ollama 聊天接口"""
        import httpx
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False
                    },
                    timeout=120.0
                )
                result = response.json()
                return result.get("message", {}).get("content", "")
            except Exception as e:
                return f"AI 服务调用失败: {str(e)}"


class TestCaseParser:
    """AI 测试用例解析器"""
    
    @staticmethod
    def parse_response(response: str, base_url: str = "https://api.example.com") -> List[Dict[str, Any]]:
        """
        解析 AI 返回的内容，提取测试用例
        
        支持格式：
        1. 纯 JSON 数组
        2. Markdown 代码块中的 JSON
        3. 带解释的混合内容
        """
        cases = []
        
        # 1. 尝试直接解析 JSON
        try:
            data = json.loads(response.strip())
            if isinstance(data, list):
                cases = data
            elif isinstance(data, dict) and 'cases' in data:
                cases = data['cases']
        except:
            pass
        
        # 2. 尝试从 Markdown 代码块提取
        if not cases:
            json_blocks = re.findall(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', response)
            for block in json_blocks:
                try:
                    data = json.loads(block)
                    if isinstance(data, list):
                        cases.extend(data)
                except:
                    continue
        
        # 3. 尝试从文本中提取 JSON 数组
        if not cases:
            json_arrays = re.findall(r'\[[\s\S]*?\]', response)
            for arr in json_arrays:
                try:
                    data = json.loads(arr)
                    if isinstance(data, list) and len(data) > 0:
                        # 检查是否像测试用例
                        if isinstance(data[0], dict) and 'name' in data[0]:
                            cases.extend(data)
                            break
                except:
                    continue
        
        # 4. 解析每行的用例（如果是文本格式）
        if not cases:
            lines = response.split('\n')
            current_case = {}
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # 尝试匹配 key: value 格式
                match = re.match(r'[-*]?\s*"?(\w+)"?\s*[:：]\s*(.+)', line)
                if match:
                    key, value = match.groups()
                    key = key.lower().strip()
                    value = value.strip().strip('"').strip("'")
                    
                    if key == 'name':
                        if current_case:
                            cases.append(current_case)
                        current_case = {'name': value}
                    elif key == 'method' and current_case:
                        current_case['method'] = value.upper()
                    elif key == 'url' and current_case:
                        current_case['url'] = value
                    elif key == 'description' and current_case:
                        current_case['description'] = value
            
            if current_case:
                cases.append(current_case)
        
        # 5. 补全和标准化每个用例
        return [TestCaseParser.normalize_case(c, base_url) for c in cases]
    
    @staticmethod
    def normalize_case(case: Dict[str, Any], base_url: str) -> Dict[str, Any]:
        """补全和标准化测试用例"""
        
        # 必填字段默认值
        normalized = {
            'name': case.get('name', '未命名用例'),
            'method': case.get('method', 'GET').upper(),
            'url': case.get('url', ''),
            'description': case.get('description', ''),
            'headers': case.get('headers', {}),
            'params': case.get('params', {}),
            'body': case.get('body', {}),
            'body_type': case.get('body_type', 'json'),
            'assertions': case.get('assertions', []),
            'tags': case.get('tags', ['function']),
            'performance': case.get('performance')
        }
        
        # 补全 URL
        if not normalized['url'] and normalized['name']:
            # 尝试从名称推断 URL
            name = normalized['name'].lower()
            if '登录' in name:
                normalized['url'] = '/api/login'
                normalized['method'] = 'POST'
            elif '获取' in name or '查询' in name:
                normalized['url'] = '/api/item'
                normalized['method'] = 'GET'
            elif '创建' in name or '新增' in name:
                normalized['url'] = '/api/item'
                normalized['method'] = 'POST'
            elif '删除' in name:
                normalized['url'] = '/api/item/1'
                normalized['method'] = 'DELETE'
            elif '更新' in name or '修改' in name:
                normalized['url'] = '/api/item/1'
                normalized['method'] = 'PUT'
            else:
                normalized['url'] = '/api/test'
        
        # 补全 tags
        if not normalized['tags']:
            normalized['tags'] = ['function']
        
        # 确保 URL 是完整路径
        if normalized['url'] and not normalized['url'].startswith('http'):
            normalized['url'] = base_url + normalized['url'] if not normalized['url'].startswith('/') else base_url + normalized['url']
        
        # 补全 body_type
        if normalized['method'] in ['GET', 'DELETE']:
            normalized['body_type'] = 'json'
            normalized['body'] = {}
        
        # 处理断言格式
        assertions = normalized.get('assertions', [])
        if isinstance(assertions, str):
            try:
                normalized['assertions'] = json.loads(assertions)
            except:
                normalized['assertions'] = []
        
        return normalized
    
    @staticmethod
    def validate_case(case: Dict[str, Any]) -> Dict[str, Any]:
        """验证测试用例，返回验证结果"""
        errors = []
        
        # 必填字段
        if not case.get('name'):
            errors.append('缺少用例名称')
        if not case.get('method'):
            errors.append('缺少请求方法')
        if not case.get('url'):
            errors.append('缺少请求 URL')
        
        # 方法验证
        if case.get('method') not in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
            errors.append(f'无效的请求方法: {case.get("method")}')
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'case': case
        }
