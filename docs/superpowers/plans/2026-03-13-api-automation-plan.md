# 接口自动化测试平台 - 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AI-TestHub 中实现完整的接口自动化测试平台，支持多格式导入、接口关联、批量执行、定时任务

**Architecture:** 采用单体架构，FastAPI + PostgreSQL，使用 asyncio 实现并发执行。前端已有 ApiAutomation.tsx 页面，需要增强功能。

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, React, Ant Design, asyncio, httpx

---

## 文件结构

```
ai-test-hub/
├── app/
│   ├── api/
│   │   ├── interfaces.py       # 已有，需增强
│   │   ├── test_suites.py       # 新增：测试集 API
│   │   ├── test_results.py      # 新增：测试结果 API
│   │   ├── scheduled_tasks.py   # 新增：定时任务 API
│   │   └── import_ext.py         # 新增：增强导入（Excel/CSV/YAML）
│   ├── models/
│   │   └── models.py            # 已有 Interface/TestCase/TestResult，需增强
│   ├── schemas/
│   │   ├── interface.py         # 已有
│   │   ├── test_suite.py        # 新增
│   │   └── test_result.py       # 新增
│   └── services/
│       ├── executor.py          # 已有，需增强断言功能
│       ├── import_service.py    # 已有，需增强
│       └── scheduler.py         # 新增：定时任务服务
├── src/
│   └── pages/
│       └── ApiAutomation.tsx    # 已有，需大幅增强
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-03-13-api-automation-design.md
        └── plans/
            └── 2026-03-13-api-automation-plan.md
```

---

## Chunk 1: 数据库模型增强

### Task 1.1: 增强 Interface 模型

**Files:**
- Modify: `app/models/models.py:64-82`

- [ ] **Step 1: 添加字段到 Interface 模型**

```python
# 在 Interface 类中添加以下字段（现有字段保留）
is_favorite = Column(Boolean, default=False)  # 是否收藏
var_extracts = Column(JSON)  # 变量提取配置，如 {"token": "$.data.token"}
created_at = Column(DateTime, default=datetime.utcnow)
updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 2: 验证模型**

Run: `cd ~/ai-test-hub && python -c "from app.models.models import Interface; print('OK')"`
Expected: OK

- [ ] **Step 3: 生成迁移**

Run: `cd ~/ai-test-hub && alembic revision --autogenerate -m "add interface favorites and var_extracts"`
Expected: 生成迁移文件

- [ ] **Step 4: 执行迁移**

Run: `cd ~/ai-test-hub && alembic upgrade head`
Expected: 迁移成功

- [ ] **Step 5: Commit**

```bash
cd ~/ai-test-hub
git add app/models/models.py
git commit -m "feat: enhance Interface model with favorites and var_extracts"
```

---

### Task 1.2: 创建 TestSuite 模型

**Files:**
- Create: `app/models/test_suite.py`

- [ ] **Step 1: 创建 TestSuite 模型**

```python
# app/models/test_suite.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class TestSuite(Base):
    """测试集表"""
    __tablename__ = "test_suites"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    environment = Column(JSON)  # 环境变量 {"base_url": "...", "token": "..."}
    concurrency = Column(Integer, default=1)  # 并发数
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TestSuiteItem(Base):
    """测试集-接口关联表"""
    __tablename__ = "test_suite_items"
    
    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("test_suites.id"), nullable=False)
    interface_id = Column(Integer, ForeignKey("interfaces.id"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    assertions = Column(JSON)  # 断言配置 [{"type": "status", "expected": 200}, {"type": "json", "path": "$.code", "expected": 0}]
    var_extracts = Column(JSON)  # 变量提取 {"token": "$.data.token"}
    delay_ms = Column(Integer, default=0)  # 延迟毫秒
    enabled = Column(Boolean, default=True)


class TestSuiteResult(Base):
    """测试集执行结果表"""
    __tablename__ = "test_suite_results"
    
    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("test_suites.id"), nullable=False)
    status = Column(String(20), nullable=False)  # running, success, failed
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    duration_ms = Column(Integer)
    details = Column(JSON)  # 每个接口的执行结果
    environment = Column(JSON)  # 执行时的环境变量
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
```

- [ ] **Step 2: 创建迁移**

Run: `cd ~/ai-test-hub && alembic revision --autogenerate -m "create test_suite models"`
Expected: 生成迁移文件

- [ ] **Step 3: 执行迁移**

Run: `cd ~/ai-test-hub && alembic upgrade head`
Expected: 迁移成功

- [ ] **Step 4: Commit**

```bash
cd ~/ai-test-hub
git add app/models/test_suite.py
git commit -m "feat: add TestSuite, TestSuiteItem, TestSuiteResult models"
```

---

## Chunk 2: 后端 API 开发

### Task 2.1: 创建测试集 API

**Files:**
- Create: `app/api/test_suites.py`
- Create: `app/schemas/test_suite.py`

- [ ] **Step 1: 创建 Schema**

```python
# app/schemas/test_suite.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class AssertionRule(BaseModel):
    """断言规则"""
    type: str  # status, json, response_time, contains
    path: Optional[str] = None  # JSON path
    expected: Any  # 期望值
    operator: str = "=="  # ==, !=, >, <, >=, <=, contains


class VarExtract(BaseModel):
    """变量提取"""
    var_name: str  # 变量名
    path: str  # JSON path，如 $.data.token
    from_response: str = "body"  # body, headers


class TestSuiteItemCreate(BaseModel):
    """测试集项目创建"""
    interface_id: int
    order_index: int = 0
    assertions: Optional[List[Dict]] = None
    var_extracts: Optional[Dict[str, str]] = None
    delay_ms: int = 0
    enabled: bool = True


class TestSuiteCreate(BaseModel):
    """测试集创建"""
    project_id: int
    name: str
    description: Optional[str] = None
    environment: Optional[Dict[str, str]] = None
    concurrency: int = 1
    items: Optional[List[TestSuiteItemCreate]] = None


class TestSuiteResponse(BaseModel):
    """测试集响应"""
    id: int
    project_id: int
    name: str
    description: Optional[str]
    environment: Optional[Dict]
    concurrency: int
    is_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TestSuiteWithItems(TestSuiteResponse):
    """带项目的测试集"""
    items: List[Dict] = []
```

- [ ] **Step 2: 创建 API**

```python
# app/api/test_suites.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.test_suite import (
    TestSuiteCreate, TestSuiteResponse, TestSuiteWithItems,
    TestSuiteItemCreate
)
from app.models.test_suite import TestSuite, TestSuiteItem

router = APIRouter()


@router.get("/", response_model=List[TestSuiteResponse])
async def list_test_suites(project_id: int, db: Session = Depends(get_db)):
    """获取测试集列表"""
    return db.query(TestSuite).filter(TestSuite.project_id == project_id).all()


@router.post("/", response_model=TestSuiteResponse)
async def create_test_suite(suite: TestSuiteCreate, db: Session = Depends(get_db)):
    """创建测试集"""
    db_suite = TestSuite(
        project_id=suite.project_id,
        name=suite.name,
        description=suite.description,
        environment=suite.environment,
        concurrency=suite.concurrency
    )
    db.add(db_suite)
    db.commit()
    db.refresh(db_suite)
    
    # 添加项目
    if suite.items:
        for item in suite.items:
            db_item = TestSuiteItem(
                suite_id=db_suite.id,
                interface_id=item.interface_id,
                order_index=item.order_index,
                assertions=item.assertions,
                var_extracts=item.var_extracts,
                delay_ms=item.delay_ms,
                enabled=item.enabled
            )
            db.add(db_item)
        db.commit()
    
    return db_suite


@router.get("/{suite_id}", response_model=TestSuiteWithItems)
async def get_test_suite(suite_id: int, db: Session = Depends(get_db)):
    """获取测试集详情（含项目）"""
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    items = db.query(TestSuiteItem).filter(
        TestSuiteItem.suite_id == suite_id
    ).order_by(TestSuiteItem.order_index).all()
    
    return {
        "id": suite.id,
        "project_id": suite.project_id,
        "name": suite.name,
        "description": suite.description,
        "environment": suite.environment,
        "concurrency": suite.concurrency,
        "is_enabled": suite.is_enabled,
        "created_at": suite.created_at,
        "updated_at": suite.updated_at,
        "items": [
            {
                "id": item.id,
                "interface_id": item.interface_id,
                "order_index": item.order_index,
                "assertions": item.assertions,
                "var_extracts": item.var_extracts,
                "delay_ms": item.delay_ms,
                "enabled": item.enabled
            }
            for item in items
        ]
    }


@router.put("/{suite_id}", response_model=TestSuiteResponse)
async def update_test_suite(suite_id: int, suite: TestSuiteCreate, db: Session = Depends(get_db)):
    """更新测试集"""
    db_suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not db_suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    db_suite.name = suite.name
    db_suite.description = suite.description
    db_suite.environment = suite.environment
    db_suite.concurrency = suite.concurrency
    
    db.commit()
    db.refresh(db_suite)
    return db_suite


@router.delete("/{suite_id}")
async def delete_test_suite(suite_id: int, db: Session = Depends(get_db)):
    """删除测试集"""
    db_suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not db_suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    # 删除关联项目
    db.query(TestSuiteItem).filter(TestSuiteItem.suite_id == suite_id).delete()
    db.delete(db_suite)
    db.commit()
    
    return {"message": "删除成功"}
```

- [ ] **Step 3: 注册路由**

Modify: `app/main.py` - 添加路由

```python
from app.api import test_suites

app.include_router(test_suites.router, prefix="/api/test-suites", tags=["测试集"])
```

- [ ] **Step 4: 测试 API**

Run: `cd ~/ai-test-hub && uvicorn app.main:app --reload`
Expected: 服务启动成功

- [ ] **Step 5: Commit**

```bash
cd ~/ai-test-hub
git add app/api/test_suites.py app/schemas/test_suite.py app/main.py
git commit -m "feat: add test suite API endpoints"
```

---

### Task 2.2: 增强导入服务（Excel/CSV/YAML）

**Files:**
- Modify: `app/services/import_service.py`

- [ ] **Step 1: 添加依赖**

Run: `pip install openpyxl pyyaml pandas`
Expected: 安装成功

- [ ] **Step 2: 增强 import_service.py**

```python
# app/services/import_service.py 新增函数

def parse_excel(content: bytes, project_id: int) -> list:
    """解析 Excel 文件"""
    import io
    import pandas as pd
    
    df = pd.read_excel(io.BytesIO(content))
    return _normalize_interfaces(df.to_dict('records'), project_id)


def parse_csv(content: bytes, project_id: int) -> list:
    """解析 CSV 文件"""
    import io
    import pandas as pd
    
    df = pd.read_csv(io.BytesIO(content))
    return _normalize_interfaces(df.to_dict('records'), project_id)


def parse_yaml(content: bytes, project_id: int) -> list:
    """解析 YAML 文件"""
    import yaml
    
    data = yaml.safe_load(content)
    if isinstance(data, list):
        interfaces = data
    elif isinstance(data, dict) and 'interfaces' in data:
        interfaces = data['interfaces']
    else:
        raise ValueError("YAML 格式不正确")
    
    return [_normalize_single(i, project_id) for i in interfaces]


def _normalize_interfaces(records: list, project_id: int) -> list:
    """规范化接口数据（从表格）"""
    results = []
    for record in records:
        # 处理各种可能的列名
        interface = {
            "name": record.get("name", record.get("接口名称", "未命名")),
            "method": record.get("method", record.get("方法", "GET")).upper(),
            "url": record.get("url", record.get("地址", "")),
            "description": record.get("description", record.get("描述", "")),
            "headers": _parse_json_field(record.get("headers", record.get("请求头", "{}"))),
            "params": _parse_json_field(record.get("params", record.get("参数", "{}"))),
            "body": _parse_json_field(record.get("body", record.get("请求体", "{}"))),
            "body_type": record.get("body_type", record.get("类型", "json")),
            "project_id": project_id
        }
        if interface["url"]:
            results.append(interface)
    return results


def _normalize_single(data: dict, project_id: int) -> dict:
    """规范化单个接口数据（从 YAML/JSON）"""
    return {
        "name": data.get("name", "未命名"),
        "method": data.get("method", "GET").upper(),
        "url": data.get("url", data.get("path", "")),
        "description": data.get("description", ""),
        "headers": data.get("headers", {}),
        "params": data.get("params", {}),
        "body": data.get("body", {}),
        "body_type": data.get("body_type", "json"),
        "project_id": project_id
    }


def _parse_json_field(value: str) -> dict:
    """解析 JSON 字符串"""
    import json
    if isinstance(value, dict):
        return value
    if not value:
        return {}
    try:
        return json.loads(value)
    except:
        return {}
```

- [ ] **Step 3: 更新主导入函数**

Modify: `app/services/import_service.py` - 更新 import_interfaces 函数

```python
def import_interfaces(content: bytes, filename: str, project_id: int) -> list:
    """导入接口 - 支持多种格式"""
    ext = filename.lower().split('.')[-1]
    
    if ext in ['xlsx', 'xls']:
        return parse_excel(content, project_id)
    elif ext == 'csv':
        return parse_csv(content, project_id)
    elif ext in ['yaml', 'yml']:
        return parse_yaml(content, project_id)
    elif ext == 'json':
        return parse_json(content, project_id)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")
```

- [ ] **Step 4: 测试导入**

Run: `cd ~/ai-test-hub && python -c "from app.services.import_service import import_interfaces; print('OK')"`
Expected: OK

- [ ] **Step 5: Commit**

```bash
cd ~/ai-test-hub
git add app/services/import_service.py
git commit -m "feat: enhance import service with Excel/CSV/YAML support"
```

---

### Task 2.3: 增强执行器（断言 + 变量提取）

**Files:**
- Modify: `app/services/executor.py`

- [ ] **Step 1: 添加断言执行器**

```python
# 在 executor.py 中添加

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
    def _extract_json_path(data: dict, path: str) -> Any:
        """提取 JSON 路径"""
        import json
        # 简单实现，支持 $.data.token 格式
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
```

- [ ] **Step 2: 添加测试**

```python
# tests/test_executor.py
import pytest
from app.services.executor import AssertionExecutor

def test_status_assertion():
    response = {"status_code": 200, "body": {}, "elapsed_ms": 100}
    assertions = [{"type": "status", "expected": 200}]
    
    result = AssertionExecutor.execute_assertions(response, assertions)
    assert result["all_passed"] == True

def test_json_assertion():
    response = {"status_code": 200, "body": {"code": 0, "data": {"token": "abc"}}}
    assertions = [{"type": "json", "path": "$.code", "expected": 0}]
    
    result = AssertionExecutor.execute_assertions(response, assertions)
    assert result["all_passed"] == True

def test_response_time_assertion():
    response = {"status_code": 200, "body": {}, "elapsed_ms": 50}
    assertions = [{"type": "response_time", "expected": 100, "operator": "<"}]
    
    result = AssertionExecutor.execute_assertions(response, assertions)
    assert result["all_passed"] == True
```

- [ ] **Step 3: 运行测试**

Run: `cd ~/ai-test-hub && pytest tests/test_executor.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd ~/ai-test-hub
git add app/services/executor.py tests/test_executor.py
git commit -m "feat: add assertion and variable extraction to executor"
```

---

### Task 2.4: 测试集执行 API

**Files:**
- Create: `app/api/test_execute.py`

- [ ] **Step 1: 创建执行 API**

```python
# app/api/test_execute.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Interface
from app.models.test_suite import TestSuite, TestSuiteItem, TestSuiteResult
from app.services.executor import InterfaceExecutor, AssertionExecutor, VariableExtractor

router = APIRouter()
executor = InterfaceExecutor()


@router.post("/test-suites/{suite_id}/execute")
async def execute_test_suite(
    suite_id: int,
    base_url: str = None,
    db: Session = Depends(get_db)
):
    """执行测试集"""
    # 获取测试集
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    # 获取测试项目
    items = db.query(TestSuiteItem).filter(
        TestSuiteItem.suite_id == suite_id,
        TestSuiteItem.enabled == True
    ).order_by(TestSuiteItem.order_index).all()
    
    if not items:
        raise HTTPException(status_code=400, detail="测试集为空")
    
    # 创建执行结果记录
    test_result = TestSuiteResult(
        suite_id=suite_id,
        status="running",
        total_count=len(items)
    )
    db.add(test_result)
    db.commit()
    db.refresh(test_result)
    
    # 设置环境变量
    env_vars = suite.environment or {}
    if base_url:
        env_vars["base_url"] = base_url
    
    # 执行每个接口
    results = []
    success_count = 0
    fail_count = 0
    
    executor.base_url = env_vars.get("base_url", "")
    
    for item in items:
        # 获取接口信息
        interface = db.query(Interface).filter(Interface.id == item.interface_id).first()
        if not interface:
            continue
        
        # 替换变量
        url = _replace_variables(interface.url, env_vars)
        headers = _replace_variables_dict(interface.headers or {}, env_vars)
        params = _replace_variables_dict(interface.params or {}, env_vars)
        body = _replace_variables_dict(interface.body or {}, env_vars)
        
        # 执行接口
        response = await executor.execute(
            method=interface.method,
            url=url,
            headers=headers,
            params=params,
            body=body,
            body_type=interface.body_type or "json"
        )
        
        # 执行断言
        assertion_result = {"all_passed": True, "results": []}
        if item.assertions:
            assertion_result = AssertionExecutor.execute_assertions(response, item.assertions)
        
        # 提取变量
        extracted_vars = {}
        if item.var_extracts:
            extracted_vars = VariableExtractor.extract(response, item.var_extracts)
            env_vars.update(extracted_vars)  # 传递给后续接口
        
        # 记录结果
        item_result = {
            "interface_id": interface.id,
            "interface_name": interface.name,
            "method": interface.method,
            "url": url,
            "status_code": response.get("status_code"),
            "elapsed_ms": response.get("elapsed_ms"),
            "assertions": assertion_result,
            "extracted_vars": extracted_vars
        }
        results.append(item_result)
        
        if assertion_result["all_passed"]:
            success_count += 1
        else:
            fail_count += 1
        
        # 延迟
        if item.delay_ms > 0:
            import asyncio
            await asyncio.sleep(item.delay_ms / 1000)
    
    # 更新执行结果
    test_result.status = "success" if fail_count == 0 else "failed"
    test_result.success_count = success_count
    test_result.fail_count = fail_count
    test_result.details = {"items": results}
    test_result.finished_at = datetime.utcnow()
    test_result.duration_ms = sum(r.get("elapsed_ms", 0) for r in results)
    db.commit()
    
    return {
        "result_id": test_result.id,
        "status": test_result.status,
        "total": test_result.total_count,
        "success": success_count,
        "failed": fail_count,
        "duration_ms": test_result.duration_ms,
        "details": results
    }


def _replace_variables(text: str, vars: dict) -> str:
    """替换变量 {{var_name}}"""
    if not text:
        return text
    for key, value in vars.items():
        text = text.replace(f"{{{{{key}}}}}", str(value))
    return text


def _replace_variables_dict(data: dict, vars: dict) -> dict:
    """替换字典中的变量"""
    if not data:
        return data
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = _replace_variables(value, vars)
        elif isinstance(value, dict):
            result[key] = _replace_variables_dict(value, vars)
        else:
            result[key] = value
    return result
```

- [ ] **Step 2: 注册路由**

Modify: `app/main.py`

```python
from app.api import test_execute
app.include_router(test_execute.router, prefix="/api", tags=["测试执行"])
```

- [ ] **Step 3: Commit**

```bash
cd ~/ai-test-hub
git add app/api/test_execute.py app/main.py
git commit -m "feat: add test suite execution API"
```

---

## Chunk 3: 前端开发

### Task 3.1: 增强 ApiAutomation 页面

**Files:**
- Modify: `src/pages/ApiAutomation.tsx`

- [ ] **Step 1: 添加 Tab 结构**

```tsx
// 在现有基础上添加更多 Tab
<Tabs defaultActiveKey="manual" items={[
  { key: 'manual', label: '手动测试', children: <ManualTest /> },
  { key: 'management', label: '接口管理', children: <InterfaceManagement /> },
  { key: 'suites', label: '测试集', children: <TestSuites /> },
  { key: 'execution', label: '测试执行', children: <TestExecution /> },
  { key: 'reports', label: '报告查看', children: <Reports /> },
]} />
```

- [ ] **Step 2: 实现测试集管理组件 TestSuites**

```tsx
// src/components/TestSuites.tsx
import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Tag } from 'antd'

const { Option } = Select

export default function TestSuites({ projectId }) {
  const [suites, setSuites] = useState([])
  const [interfaces, setInterfaces] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadSuites()
    loadInterfaces()
  }, [projectId])

  const loadSuites = async () => {
    const res = await fetch(`${API_BASE_URL}/api/test-suites/?project_id=${projectId}`)
    const data = await res.json()
    setSuites(data)
  }

  const loadInterfaces = async () => {
    const res = await fetch(`${API_BASE_URL}/api/interfaces/?project_id=${projectId}&limit=1000`)
    const data = await res.json()
    setInterfaces(data)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    await fetch(`${API_BASE_URL}/api/test-suites/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, project_id: projectId })
    })
    setModalVisible(false)
    loadSuites()
  }

  const handleExecute = async (suiteId) => {
    const res = await fetch(`${API_BASE_URL}/api/test-suites/${suiteId}/execute`, {
      method: 'POST'
    })
    const result = await res.json()
    message.success(`执行完成: ${result.success}/${result.total} 通过`)
  }

  return (
    <div>
      <Button type="primary" onClick={() => setModalVisible(true)}>创建测试集</Button>
      <Table
        dataSource={suites}
        rowKey="id"
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description' },
          { title: '并发', dataIndex: 'concurrency' },
          { 
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button onClick={() => handleExecute(record.id)}>执行</Button>
                <Button>编辑</Button>
              </Space>
            )
          }
        ]}
      />
      
      <Modal title="创建测试集" open={modalVisible} onOk={handleSave} onCancel={() => setModalVisible(false)}>
        <Form form={form}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="concurrency" label="并发数" initialValue={1}>
            <Select>
              <Option value={1}>1</Option>
              <Option value={10}>10</Option>
              <Option value={50}>50</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: 实现测试执行组件**

```tsx
// src/components/TestExecution.tsx
import { Table, Tag, Button, Space, Timeline } from 'antd'

export default function TestExecution({ projectId }) {
  const [results, setResults] = useState([])

  // 加载执行历史...

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { 
      title: '状态', 
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '通过' : '失败'}
        </Tag>
      )
    },
    { title: '通过/总数', render: (_, r) => `${r.success_count}/${r.total_count}` },
    { title: '耗时', render: (_, r) => `${r.duration_ms}ms` },
    { title: '执行时间', dataIndex: 'started_at' },
    {
      title: '操作',
      render: (_, record) => <Button type="link">查看详情</Button>
    }
  ]

  return <Table dataSource={results} columns={columns} rowKey="id" />
}
```

- [ ] **Step 4: 添加文件导入增强**

```tsx
// 在 InterfaceManagement 中添加
const handleFileImport = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('project_id', projectId)
  
  const res = await fetch(`${API_BASE_URL}/api/interfaces/import?project_id=${projectId}`, {
    method: 'POST',
    body: formData
  })
  const result = await res.json()
  message.success(result.message)
  loadInterfaces()
}

// 支持的文件类型
const acceptTypes = '.xlsx,.xls,.csv,.yaml,.yml,.json'
```

- [ ] **Step 5: Commit**

```bash
cd ~/ai-test-hub
git add src/pages/ApiAutomation.tsx
git commit -m "feat: enhance ApiAutomation page with test suites and execution"
```

---

## Chunk 4: 定时任务（可选）

### Task 4.1: 定时任务服务

如设计文档中的定时任务功能。

---

## 总结

### 实现顺序

1. **数据库模型** → 增强 Interface，创建 TestSuite 模型
2. **后端 API** → 测试集 CRUD + 执行
3. **导入增强** → Excel/CSV/YAML 解析
4. **断言功能** → 增强执行器
5. **前端页面** → 增强 ApiAutomation

### 预计工作量

| 阶段 | 任务数 | 预估时间 |
|------|--------|----------|
| Chunk 1 | 2 | 30 min |
| Chunk 2 | 4 | 2 h |
| Chunk 3 | 1 | 2 h |
| 总计 | 7 | ~4.5 h |
