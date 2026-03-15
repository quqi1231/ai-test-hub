# AI-TestHub API 接口文档

> 智能软件测试平台 - 后端接口文档

## 基础信息

- **Base URL**: `http://localhost:8000`
- **文档地址**: `http://localhost:8000/docs`
- **数据格式**: JSON

---

## 目录

1. [项目管理](#项目管理)
2. [接口管理](#接口管理)
3. [用例管理](#用例管理)
4. [环境配置](#环境配置)
5. [接口链](#接口链)
6. [数据源](#数据源)
7. [AI 功能](#ai-功能)
8. [插件管理](#插件管理)
9. [系统接口](#系统接口)

---

## 项目管理

### 获取项目列表

```
GET /api/projects/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skip | int | 否 | 跳过条数，默认 0 |
| limit | int | 否 | 返回条数，默认 100 |

**Response:**
```json
[
  {
    "id": 1,
    "name": "项目名称",
    "description": "项目描述",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00",
    "interface_count": 10,
    "case_count": 20
  }
]
```

---

### 获取项目详情

```
GET /api/projects/{project_id}
```

**Path Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| project_id | int | 项目 ID |

**Response:**
```json
{
  "id": 1,
  "name": "项目名称",
  "description": "项目描述",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00",
  "interface_count": 10,
  "case_count": 20
}
```

---

### 创建项目

```
POST /api/projects/
```

**Request Body:**
```json
{
  "name": "项目名称",
  "description": "项目描述（可选）"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "项目名称",
  "description": "项目描述",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

---

### 更新项目

```
PUT /api/projects/{project_id}
```

**Request Body:**
```json
{
  "name": "新名称（可选）",
  "description": "新描述（可选）"
}
```

---

### 删除项目

```
DELETE /api/projects/{project_id}
```

> ⚠️ 删除前需先删除关联的接口和用例

---

### 获取项目统计摘要

```
GET /api/projects/{project_id}/summary
```

**Response:**
```json
{
  "project_id": 1,
  "project_name": "项目名称",
  "interface_count": 10,
  "case_count": 20
}
```

---

## 接口管理

### 获取接口列表

```
GET /api/interfaces/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 是 | 项目 ID |
| skip | int | 否 | 跳过条数 |
| limit | int | 否 | 返回条数 |

---

### 获取接口详情

```
GET /api/interfaces/{interface_id}
```

---

### 创建接口

```
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
  "headers": {
    "Content-Type": "application/json"
  },
  "params": {},
  "body": {
    "username": "{{username}}",
    "password": "{{password}}"
  },
  "body_type": "json"
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 是 | 所属项目 ID |
| name | string | 是 | 接口名称 |
| method | string | 是 | 请求方法：GET/POST/PUT/DELETE |
| url | string | 是 | 请求 URL |
| description | string | 否 | 接口描述 |
| headers | object | 否 | 请求头 |
| params | object | 否 | URL 参数 |
| body | object | 否 | 请求体 |
| body_type | string | 否 | 请求体类型：json/form-data/x-www-form-urlencoded/raw |
| content_type | string | 否 | Content-Type |

---

### 更新接口

```
PUT /api/interfaces/{interface_id}
```

---

### 删除接口

```
DELETE /api/interfaces/{interface_id}
```

---

### 导入接口

```
POST /api/interfaces/import
```

**Request Body:**
```json
{
  "project_id": 1,
  "interfaces": [
    {
      "name": "接口名称",
      "method": "GET",
      "url": "/api/test"
    }
  ]
}
```

---

### 执行单个接口

```
POST /api/interfaces/execute
```

**Request Body:**
```json
{
  "method": "POST",
  "url": "http://example.com/api/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "params": {},
  "body": {
    "username": "test",
    "password": "123456"
  },
  "body_type": "json"
}
```

**Response:**
```json
{
  "status_code": 200,
  "headers": {},
  "body": {
    "token": "xxx",
    "userId": 123
  },
  "elapsed_ms": 150
}
```

---

### 执行接口链

```
POST /api/interfaces/execute-chain
```

**Request Body:**
```json
{
  "interfaces": [
    {
      "name": "登录",
      "method": "POST",
      "url": "/api/login",
      "body": {"username": "test", "password": "123"},
      "var_name": "login"
    },
    {
      "name": "获取用户信息",
      "method": "GET",
      "url": "/api/user/info",
      "headers": {
        "Authorization": "{{login.response.token}}"
      }
    }
  ],
  "global_vars": {}
}
```

---

### 批量执行接口

```
POST /api/interfaces/execute-batch
```

**Request Body:**
```json
{
  "interfaces": [1, 2, 3],
  "environment_id": 1
}
```

---

## 用例管理

### 获取用例列表

```
GET /api/cases/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 否 | 项目 ID |
| skip | int | 否 | 跳过条数 |
| limit | int | 否 | 返回条数 |

---

### 获取用例详情

```
GET /api/cases/{case_id}
```

---

### 创建用例

```
POST /api/cases/
```

**Request Body:**
```json
{
  "project_id": 1,
  "interface_id": 1,
  "name": "登录成功用例",
  "description": "测试正常登录",
  "request_config": {},
  "assertions": {
    "status_code": 200,
    "body.token": "${not_empty}"
  }
}
```

---

### 更新用例

```
PUT /api/cases/{case_id}
```

---

### 删除用例

```
DELETE /api/cases/{case_id}
```

---

### 执行用例

```
POST /api/cases/{case_id}/run
```

**Response:**
```json
{
  "status_code": 200,
  "body": {},
  "elapsed_ms": 150
}
```

---

## 环境配置

### 获取环境列表

```
GET /api/environments/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 是 | 项目 ID |

---

### 获取环境详情

```
GET /api/environments/{env_id}
```

---

### 创建环境

```
POST /api/environments/
```

**Request Body:**
```json
{
  "project_id": 1,
  "name": "测试环境",
  "base_url": "http://test.example.com",
  "variables": {
    "username": "testuser",
    "password": "123456"
  },
  "headers": {
    "Authorization": "Bearer {{token}}"
  },
  "description": "测试环境配置",
  "is_active": true
}
```

---

### 更新环境

```
PUT /api/environments/{env_id}
```

---

### 删除环境

```
DELETE /api/environments/{env_id}
```

---

### 激活环境

```
POST /api/environments/{env_id}/activate
```

> 激活后会取消其他环境的激活状态

---

## 接口链

### 获取接口链列表

```
GET /api/chains/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 是 | 项目 ID |
| skip | int | 否 | 跳过条数 |
| limit | int | 否 | 返回条数 |

---

### 获取接口链详情

```
GET /api/chains/{chain_id}
```

---

### 创建接口链

```
POST /api/chains/
```

**Request Body:**
```json
{
  "project_id": 1,
  "name": "用户登录流程",
  "description": "登录并获取用户信息",
  "steps": [
    {
      "interface_id": 1,
      "name": "用户登录",
      "extract_vars": {
        "token": "body.data.token",
        "userId": "body.data.id"
      }
    },
    {
      "interface_id": 2,
      "name": "获取用户信息",
      "var_mapping": {
        "token": "{{token}}"
      }
    }
  ],
  "global_vars": {
    "username": "test"
  }
}
```

**Steps 字段说明:**
| 字段 | 类型 | 说明 |
|------|------|------|
| interface_id | int | 接口 ID |
| name | string | 步骤名称 |
| extract_vars | object | 响应提取变量，格式：`{"变量名": "响应路径"}` |
| var_mapping | object | 变量映射，将提取的变量注入请求 |
| custom_headers | object | 自定义请求头（覆盖） |
| custom_params | object | 自定义参数（覆盖） |
| custom_body | object | 自定义请求体（覆盖） |
| condition | string | 条件执行，如：`{{var}} == "value"` |
| assertions | array | 断言配置 |

**响应路径语法:**
- `body.data.token` - 响应体中的嵌套字段
- `headers.set-cookie` - 响应头
- `body.list.0.id` - 数组中第一个元素的 id

---

### 更新接口链

```
PUT /api/chains/{chain_id}
```

---

### 删除接口链

```
DELETE /api/chains/{chain_id}
```

---

### 执行接口链

```
POST /api/chains/{chain_id}/execute
```

**Request Body:**
```json
{
  "environment_id": 1,
  "override_vars": {
    "username": "custom_user"
  }
}
```

**Response:**
```json
{
  "chain_name": "用户登录流程",
  "success": true,
  "steps": [
    {
      "step_name": "用户登录",
      "interface_id": 1,
      "success": true,
      "response": {
        "status_code": 200,
        "body": {"data": {"token": "xxx", "id": 123}}
      },
      "extracted_vars": {
        "token": "xxx",
        "userId": 123
      },
      "duration_ms": 150
    },
    {
      "step_name": "获取用户信息",
      "interface_id": 2,
      "success": true,
      "response": {},
      "extracted_vars": {},
      "duration_ms": 100
    }
  ],
  "final_vars": {
    "token": "xxx",
    "userId": 123
  },
  "total_duration_ms": 250
}
```

---

## 数据源

### 获取数据源列表

```
GET /api/datasources/
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 是 | 项目 ID |
| skip | int | 否 | 跳过条数 |
| limit | int | 否 | 返回条数 |

---

### 获取数据源详情

```
GET /api/datasources/{ds_id}
```

---

### 创建数据源

```
POST /api/datasources/
```

**Request Body:**
```json
{
  "project_id": 1,
  "name": "用户数据",
  "source_type": "json",
  "data": [
    {"username": "user1", "password": "123"},
    {"username": "user2", "password": "456"}
  ],
  "description": "测试用户数据"
}
```

---

### 上传数据源文件

```
POST /api/datasources/upload
```

**Form Data:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| project_id | int | 是 | 项目 ID |
| name | string | 是 | 数据源名称 |
| source_type | string | 是 | 文件类型：csv、json |
| file | file | 是 | 上传文件 |

---

### 更新数据源

```
PUT /api/datasources/{ds_id}
```

---

### 删除数据源

```
DELETE /api/datasources/{ds_id}
```

---

### 参数化测试执行

```
POST /api/datasources/parametric-test
```

**Request Body:**
```json
{
  "interface_id": 1,
  "data_source_id": 1,
  "environment_id": 1,
  "global_vars": {
    "base_url": "http://example.com"
  }
}
```

或使用内联参数：

```json
{
  "interface_id": 1,
  "params_list": [
    {"username": "user1", "password": "123"},
    {"username": "user2", "password": "456"}
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "success": 2,
  "fail": 0,
  "results": [
    {
      "params": {"username": "user1", "password": "123"},
      "result": {
        "status_code": 200,
        "body": {"code": 0}
      },
      "success": true
    },
    {
      "params": {"username": "user2", "password": "456"},
      "result": {
        "status_code": 200,
        "body": {"code": 0}
      },
      "success": true
    }
  ]
}
```

---

## AI 功能

### AI 生成测试用例

```
POST /api/ai/generate-cases
```

**Request Body:**
```json
{
  "requirement": "测试用户登录功能，需要覆盖正常登录、密码错误、用户不存在等场景",
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
      "name": "正常登录",
      "description": "测试正确的用户名和密码",
      "request_config": {},
      "assertions": {"status_code": 200}
    }
  ]
}
```

---

### AI 总结

```
POST /api/ai/summary
```

**Request Body:**
```json
{
  "content": "要总结的内容..."
}
```

**Response:**
```json
{
  "summary": "总结内容..."
}
```

---

### AI 分析错误

```
POST /api/ai/analyze-error
```

**Request Body:**
```json
{
  "error": "错误信息",
  "response": "响应内容"
}
```

**Response:**
```json
{
  "analysis": "分析结果..."
}
```

---

## 插件管理

### 获取插件列表

```
GET /api/plugins/
```

---

### 获取插件详情

```
GET /api/plugins/{plugin_id}
```

---

### 创建插件

```
POST /api/plugins/
```

**Request Body:**
```json
{
  "name": "自定义插件",
  "description": "插件描述",
  "version": "1.0.0",
  "config": {},
  "is_enabled": true
}
```

---

### 更新插件

```
PUT /api/plugins/{plugin_id}
```

---

### 删除插件

```
DELETE /api/plugins/{plugin_id}
```

---

### 切换插件状态

```
POST /api/plugins/{plugin_id}/toggle
```

---

## 系统接口

### 根路径

```
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

### 健康检查

```
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

---

## 变量语法说明

### 变量引用

在请求中使用 `{{变量名}}` 引用变量：

```json
{
  "headers": {
    "Authorization": "Bearer {{token}}"
  },
  "body": {
    "username": "{{username}}"
  }
}
```

### 变量类型

1. **环境变量** - 环境配置中定义的变量
2. **全局变量** - 接口链或请求中定义的变量
3. **响应提取变量** - 从上一个接口响应中提取的变量

### 响应提取路径

| 路径示例 | 说明 |
|----------|------|
| `body.data.token` | 响应 body 中的嵌套字段 |
| `body.list.0.id` | 数组第一个元素的 id |
| `headers.set-cookie` | 响应头中的 set-cookie |
| `body.users.*.name` | 所有用户的 name（需扩展） |

---

## 错误响应

**错误响应格式:**

```json
{
  "detail": "错误信息"
}
```

**常见状态码:**

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |

---

*文档生成时间: 2024*
