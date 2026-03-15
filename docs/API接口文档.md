# AI-TestHub API 接口文档

**版本：** v1.0  
**更新时间：** 2026-03-12

---

## 目录

1. [项目管理 API](#1-项目管理-api) - 待实现
2. [接口管理 API](#2-接口管理-api)
3. [用例管理 API](#3-用例管理-api)
4. [AI 功能 API](#4-ai-功能-api)
5. [插件管理 API](#5-插件管理-api)

---

## 1. 项目管理 API

**基础路径：** `/api/projects`

> ⚠️ 当前后端未实现，需补充

### 1.1 获取项目列表

```http
GET /api/projects/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skip | int | 否 | 跳过条数（默认0）|
| limit | int | 否 | 返回条数（默认100）|

**Response:**
```json
[
  {
    "id": 1,
    "name": "电商平台测试",
    "description": "负责电商前后端测试",
    "created_at": "2026-03-01T00:00:00",
    "updated_at": "2026-03-01T00:00:00"
  }
]
```

### 1.2 获取项目详情

```http
GET /api/projects/{project_id}
```

**Response:**
```json
{
  "id": 1,
  "name": "电商平台测试",
  "description": "负责电商前后端测试",
  "created_at": "2026-03-01T00:00:00",
  "updated_at": "2026-03-01T00:00:00"
}
```

### 1.3 创建项目

```http
POST /api/projects/
```

**Request Body:**
```json
{
  "name": "项目名称",
  "description": "项目描述"
}
```

### 1.4 更新项目

```http
PUT /api/projects/{project_id}
```

**Request Body:**
```json
{
  "name": "新名称",
  "description": "新描述"
}
```

### 1.5 删除项目

```http
DELETE /api/projects/{project_id}
```

---

## 2. 接口管理 API

**基础路径：** `/api/interfaces`

### 2.1 获取接口列表

```http
GET /api/interfaces/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 否 | 项目ID筛选 |
| skip | int | 否 | 跳过条数 |
| limit | int | 否 | 返回条数 |

**Response:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "name": "用户登录",
    "method": "POST",
    "url": "/api/login",
    "description": "用户登录接口",
    "headers": {"Content-Type": "application/json"},
    "params": {},
    "body": {"username": "", "password": ""},
    "body_type": "json",
    "created_at": "2026-03-01T00:00:00",
    "updated_at": "2026-03-01T00:00:00"
  }
]
```

### 2.2 获取接口详情

```http
GET /api/interfaces/{interface_id}
```

### 2.3 创建接口

```http
POST /api/interfaces/
```

**Request Body:**
```json
{
  "project_id": 1,
  "name": "用户登录",
  "method": "POST",
  "url": "/api/login",
  "description": "用户登录接口",
  "headers": {"Content-Type": "application/json"},
  "params": {},
  "body": {"username": "", "password": ""},
  "body_type": "json"
}
```

### 2.4 更新接口

```http
PUT /api/interfaces/{interface_id}
```

**Request Body:**
```json
{
  "name": "新名称",
  "url": "/api/new-url"
}
```

### 2.5 删除接口

```http
DELETE /api/interfaces/{interface_id}
```

### 2.6 导入接口

```http
POST /api/interfaces/import?project_id=1
```

**Content-Type:** `multipart/form-data`

**Form Data:**
| 参数 | 类型 | 说明 |
|------|------|------|
| project_id | int | 项目ID |
| file | file | 导入文件（支持 Excel, CSV, YAML, JSON）|

**支持格式：**

**Excel/CSV 表头：**
- name, method, url, description, headers(JSON), params(JSON), body(JSON), body_type

**JSON 格式：**
```json
{
  "interfaces": [
    {"name": "登录", "method": "POST", "url": "/api/login"}
  ]
}
```

### 2.7 执行单个接口

```http
POST /api/interfaces/execute
```

**Request Body:**
```json
{
  "interface_id": 1,
  "base_url": "https://api.example.com"
}
```

**Response:**
```json
{
  "interface": {
    "id": 1,
    "name": "用户登录",
    "method": "POST",
    "url": "/api/login"
  },
  "result": {
    "status_code": 200,
    "headers": {},
    "body": {"token": "abc123"},
    "elapsed_ms": 150
  }
}
```

### 2.8 执行接口链

```http
POST /api/interfaces/execute-chain
```

**Request Body:**
```json
{
  "base_url": "https://api.example.com",
  "global_vars": {"token": "abc123"},
  "interfaces": [
    {
      "name": "登录",
      "method": "POST",
      "url": "/api/login",
      "body": {"username": "test", "password": "123456"},
      "body_type": "json",
      "var_name": "login"
    },
    {
      "name": "获取用户信息",
      "method": "GET",
      "url": "/api/user/info",
      "headers": {"Authorization": "{{login.response.token}}"},
      "var_name": "user_info"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "interface": "登录",
      "result": {
        "status_code": 200,
        "body": {"token": "xyz", "user_id": 1}
      }
    }
  ],
  "summary": {
    "total": 2,
    "success": 2,
    "failed": 0
  }
}
```

### 2.9 批量执行接口

```http
POST /api/interfaces/execute-batch
```

**Request Body:**
```json
{
  "interface_ids": [1, 2, 3],
  "base_url": "https://api.example.com"
}
```

---

## 3. 用例管理 API

**基础路径：** `/api/cases`

### 3.1 获取用例列表

```http
GET /api/cases/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 否 | 项目ID筛选 |
| skip | int | 否 | 跳过条数 |
| limit | int | 否 | 返回条数 |

### 3.2 获取用例详情

```http
GET /api/cases/{case_id}
```

### 3.3 创建用例

```http
POST /api/cases/
```

**Request Body:**
```json
{
  "project_id": 1,
  "interface_id": 1,
  "name": "登录成功用例",
  "description": "验证正确账号密码登录成功",
  "request_config": {
    "method": "POST",
    "url": "/api/login",
    "body": {"username": "test", "password": "123456"}
  },
  "assertions": {
    "status_code": 200,
    "body.token": {"type": "exists"}
  }
}
```

### 3.4 更新用例

```http
PUT /api/cases/{case_id}
```

### 3.5 删除用例

```http
DELETE /api/cases/{case_id}
```

### 3.6 执行用例

```http
POST /api/cases/{case_id}/run
```

**Response:**
```json
{
  "case_id": 1,
  "status": "success",
  "response": {...},
  "duration_ms": 150,
  "executed_at": "2026-03-12T00:00:00"
}
```

---

## 4. AI 功能 API

**基础路径：** `/api/ai`

### 4.1 AI 生成测试用例

```http
POST /api/ai/generate-cases
```

**Request Body:**
```json
{
  "requirement": "用户登录功能测试，需要覆盖正确账号、错误密码、账号不存在等场景",
  "interface_data": {
    "method": "POST",
    "url": "/api/login",
    "body": {"username": "", "password": ""}
  }
}
```

**Response:**
```json
{
  "cases": [
    {
      "name": "正确账号密码登录成功",
      "steps": ["输入正确账号", "输入正确密码", "点击登录"],
      "expected_result": "登录成功，返回token",
      "priority": "P0"
    }
  ],
  "model": "llama3"
}
```

### 4.2 AI 总结测试报告

```http
POST /api/ai/summary
```

**Request Body:**
```json
{
  "test_results": "总用例10个，通过8个，失败2个。失败用例：登录接口返回500错误"
}
```

**Response:**
```json
{
  "summary": "## 测试报告总结\n\n### 总体概述\n...\n### 通过率分析\n...\n### 失败原因分析\n...",
  "model": "llama3"
}
```

### 4.3 AI 分析错误

```http
POST /api/ai/analyze-error
```

**Request Body:**
```json
{
  "error_description": "ConnectionError: 连接超时"
}
```

**Response:**
```json
{
  "analysis": "## 错误分析\n\n### 错误原因\n...\n### 修复建议\n...",
  "model": "llama3"
}
```

---

## 5. 插件管理 API

**基础路径：** `/api/plugins`

### 5.1 获取插件列表

```http
GET /api/plugins/
```

### 5.2 获取插件详情

```http
GET /api/plugins/{plugin_id}
```

### 5.3 创建插件

```http
POST /api/plugins/
```

**Request Body:**
```json
{
  "name": "自定义验证器",
  "description": "自定义响应验证插件",
  "version": "1.0.0",
  "config": {"rule": "..."},
  "is_enabled": true
}
```

### 5.4 更新插件

```http
PUT /api/plugins/{plugin_id}
```

### 5.5 删除插件

```http
DELETE /api/plugins/{plugin_id}
```

### 5.6 启用/禁用插件

```http
POST /api/plugins/{plugin_id}/toggle
```

---

## 6. 通用接口

### 6.1 健康检查

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

### 6.2 根路径

```http
GET /
```

**Response:**
```json
{
  "message": "智能软件测试平台 API",
  "version": "1.0.0"
}
```

---

## 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

**常见错误码：**
- `404` - 资源不存在
- `400` - 请求参数错误
- `500` - 服务器内部错误
