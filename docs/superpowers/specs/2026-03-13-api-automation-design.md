# 接口自动化测试平台 - 设计文档

**项目**: AI-TestHub 接口自动化测试模块  
**版本**: v1.0  
**日期**: 2026-03-13  
**状态**: 待审批

---

## 1. 概述

### 1.1 项目背景

为 AI-TestHub 平台新增接口自动化测试功能，支持在网页端直接进行接口测试、批量执行、生成报告。面向内部团队技术人员和业务人员，采用双模式设计。

### 1.2 核心目标

- 支持多格式导入（Excel、CSV、YAML、JSON）
- 自动识别接口信息（方法、参数、响应结构）
- 支持接口关联（参数提取与传递）
- 冒烟测试 + 回归测试场景
- 支持 10-50 并发执行

### 1.3 目标用户

- 技术人员：完整功能模式
- 业务人员：简易模式（可视化操作）

---

## 2. 系统架构

### 2.1 技术选型

| 层级 | 技术栈 |
|------|--------|
| 前端 | React + TypeScript + Ant Design |
| 后端 | FastAPI + SQLAlchemy + Pydantic |
| 数据库 | PostgreSQL |
| 任务执行 | Python asyncio（异步） |
| 导入解析 | Python (pandas + openpyxl + pyyaml) |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  手动测试   │  │  批量执行   │  │  报告查看   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP API
┌────────────────────────▼────────────────────────────────┐
│                    后端 (FastAPI)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  接口管理   │  │  测试执行    │  │  导入解析   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                         │                               │
│                    Async Task                           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   数据库 (PostgreSQL)                    │
│  interfaces | test_cases | test_suites | test_results  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 功能模块

### 3.1 模块一：接口管理

#### 3.1.1 功能列表

| 功能 | 描述 | 模式 |
|------|------|------|
| 手动添加 | 填写接口信息（名称、URL、方法等） | 通用 |
| 批量导入 | 从文件导入接口 | 通用 |
| 接口编辑 | 修改接口信息 | 通用 |
| 接口删除 | 删除接口 | 通用 |
| 接口调试 | 单个接口快速测试 | 通用 |
| 接口收藏 | 标记常用接口 | 简易 |

#### 3.1.2 接口字段

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | int | 是 | 主键 |
| name | string | 是 | 接口名称 |
| url | string | 是 | 请求 URL |
| method | enum | 是 | GET/POST/PUT/DELETE/PATCH |
| description | string | 否 | 接口描述 |
| headers | json | 否 | 请求头 |
| params | json | 否 | URL 参数 |
| body | json | 否 | 请求体 |
| body_type | enum | 否 | json/form-data/raw |
| project_id | int | 否 | 所属项目 |

### 3.2 模块二：文件导入

#### 3.2.1 支持格式

| 格式 | 扩展名 | 解析库 |
|------|--------|--------|
| Excel | .xlsx, .xls | openpyxl |
| CSV | .csv | pandas |
| YAML | .yaml, .yml | pyyaml |
| JSON | .json | json |

#### 3.2.2 自动识别规则

| 识别项 | 规则 |
|--------|------|
| 请求方法 | 解析 URL 或 method 列；默认 GET |
| URL 参数 | 识别 `?key=value` 或独立 params 列 |
| Headers | 解析 headers 列或专用列 |
| Body | 解析 body 列，支持 JSON 字符串 |
| 响应字段 | 首次请求后自动解析 JSON 结构 |

#### 3.2.3 导入模板

```yaml
# YAML 示例
- name: "用户登录"
  method: "POST"
  url: "{{base_url}}/api/login"
  headers:
    Content-Type: "application/json"
  body:
    username: "{{username}}"
    password: "{{password}}"

- name: "获取用户信息"
  method: "GET"
  url: "{{base_url}}/api/user/{{user_id}}"
  headers:
    Authorization: "Bearer {{token}}"
```

```json
// JSON 示例
[
  {
    "name": "用户登录",
    "method": "POST",
    "url": "{{base_url}}/api/login",
    "body": {"username": "{{username}}", "password": "{{password}}"}
  }
]
```

### 3.3 模块三：接口关联

#### 3.3.1 变量提取

| 类型 | 语法 | 示例 |
|------|------|------|
| JSON 路径 | `{{$resp.data.token}}` | 从响应中提取 token |
| Header | `{{$resp.headers.session_id}}` | 从响应头提取 |
| 状态码 | `{{$resp.status_code}}` | 提取状态码 |

#### 3.3.2 内置变量

| 变量 | 描述 |
|------|------|
| `{{$timestamp}}` | 当前时间戳（毫秒） |
| `{{$date}}` | 当前日期 YYYY-MM-DD |
| `{{$randomInt}}` | 随机整数 |
| `{{$randomStr}}` | 随机字符串 |
| `{{$uuid}}` | UUID |

#### 3.3.3 执行顺序

接口按导入顺序执行，前一个接口的响应变量可供后续接口使用。

### 3.4 模块四：测试集管理

#### 3.4.1 测试集结构

```
测试集 (TestSuite)
  ├── 名称
  ├── 描述
  ├── 包含接口列表（按顺序）
  ├── 环境配置
  └── 并发数配置
```

#### 3.4.2 测试集操作

| 操作 | 描述 |
|------|------|
| 创建测试集 | 从已有接口勾选组成 |
| 编辑测试集 | 修改名称、接口顺序 |
| 删除测试集 | 删除测试集 |
| 复制测试集 | 复制为新测试集 |

### 3.5 模块五：测试执行

#### 3.5.1 执行模式

| 模式 | 描述 | 并发 |
|------|------|------|
| 单次执行 | 运行一次 | 1 |
| 批量执行 | 运行整个测试集 | 可配置 1-50 |
| 定时任务 | 定时自动运行 | 可配置 |

#### 3.5.2 断言规则

| 断言类型 | 语法 | 示例 |
|----------|------|------|
| 状态码 | `status_code == 200` | 断言返回 200 |
| JSON 路径 | `$.data.name == "test"` | 断言响应内容 |
| 响应时间 | `response_time < 1000` | 断言响应时间(ms) |
| 包含 | `$.message contains "success"` | 断言包含字符串 |

#### 3.5.3 执行结果

| 字段 | 描述 |
|------|------|
| 执行 ID | 唯一标识 |
| 开始时间 | 执行开始时间 |
| 结束时间 | 执行结束时间 |
| 耗时 | 总耗时(ms) |
| 通过数 | 断言通过数 |
| 失败数 | 断言失败数 |
| 详情 | 每个接口的执行结果 |

### 3.6 模块六：报告查看

#### 3.6.1 报告内容

- 执行概览（通过率、耗时、接口数）
- 成功/失败接口列表
- 失败接口详情（实际 vs 预期）
- 响应时间趋势

#### 3.6.2 报告导出

- HTML 报告
- JSON 原始数据

---

## 4. 数据库设计

### 4.1 表结构

#### 4.1.1 interfaces（接口表）

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Integer | PK | 主键 |
| name | String(200) | NOT NULL | 接口名称 |
| url | String(500) | NOT NULL | 请求 URL |
| method | String(10) | NOT NULL | 请求方法 |
| description | Text | NULL | 描述 |
| headers | JSON | NULL | 请求头 |
| params | JSON | NULL | URL 参数 |
| body | JSON | NULL | 请求体 |
| body_type | String(20) | NULL | body 类型 |
| project_id | Integer | FK | 所属项目 |
| created_at | DateTime | DEFAULT | 创建时间 |
| updated_at | DateTime | DEFAULT | 更新时间 |

#### 4.1.2 test_suites（测试集表）

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Integer | PK | 主键 |
| name | String(200) | NOT NULL | 测试集名称 |
| description | Text | NULL | 描述 |
| environment | JSON | NULL | 环境变量配置 |
| concurrency | Integer | DEFAULT 1 | 并发数 |
| project_id | Integer | FK | 所属项目 |
| created_at | DateTime | DEFAULT | 创建时间 |
| updated_at | DateTime | DEFAULT | 更新时间 |

#### 4.1.3 test_suite_items（测试集-接口关联表）

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Integer | PK | 主键 |
| suite_id | Integer | FK | 测试集 ID |
| interface_id | Integer | FK | 接口 ID |
| order_index | Integer | NOT NULL | 执行顺序 |
| assertions | JSON | NULL | 断言规则 |

#### 4.1.4 test_results（测试结果表）

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Integer | PK | 主键 |
| suite_id | Integer | FK | 测试集 ID |
| status | String(20) | NOT NULL | running/success/failed |
| total_count | Integer | NOT NULL | 接口总数 |
| success_count | Integer | NOT NULL | 成功数 |
| fail_count | Integer | NOT NULL | 失败数 |
| duration_ms | Integer | NULL | 耗时(毫秒) |
| started_at | DateTime | NOT NULL | 开始时间 |
| finished_at | DateTime | NULL | 结束时间 |
| details | JSON | NULL | 详细结果 |

#### 4.1.5 scheduled_tasks（定时任务表）

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Integer | PK | 主键 |
| suite_id | Integer | FK | 测试集 ID |
| cron_expression | String(50) | NOT NULL | Cron 表达式 |
| enabled | Boolean | DEFAULT true | 是否启用 |
| last_run_at | DateTime | NULL | 上次运行时间 |
| created_at | DateTime | DEFAULT | 创建时间 |

---

## 5. API 设计

### 5.1 接口列表

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/interfaces/import | 导入接口（文件） |
| GET | /api/interfaces/ | 获取接口列表 |
| POST | /api/interfaces/ | 创建接口 |
| PUT | /api/interfaces/{id} | 更新接口 |
| DELETE | /api/interfaces/{id} | 删除接口 |
| POST | /api/interfaces/execute | 执行单个接口 |
| GET | /api/test-suites/ | 获取测试集列表 |
| POST | /api/test-suites/ | 创建测试集 |
| POST | /api/test-suites/{id}/execute | 执行测试集 |
| GET | /api/test-results/ | 获取测试结果 |
| GET | /api/test-results/{id} | 获取结果详情 |
| POST | /api/scheduled-tasks/ | 创建定时任务 |
| GET | /api/scheduled-tasks/ | 获取定时任务列表 |
| POST | /api/scheduled-tasks/{id}/run | 手动触发定时任务 |

---

## 6. 前端页面设计

### 6.1 页面结构

```
接口自动化
├── 手动测试（简易模式）
│   ├── 接口列表（卡片/表格）
│   ├── 快速测试（填参数 → 发送）
│   └── 结果展示
│
├── 接口管理（技术模式）
│   ├── 接口列表
│   ├── 接口编辑（完整表单）
│   ├── 批量导入
│   └── 调试窗口
│
├── 测试集管理
│   ├── 测试集列表
│   ├── 创建/编辑测试集
│   └── 包含接口配置
│
├── 测试执行
│   ├── 执行历史
│   ├── 执行详情
│   └── 报告查看
│
└── 定时任务
    ├── 任务列表
    └── 创建/编辑任务
```

### 6.2 简易模式 vs 技术模式

| 功能 | 简易模式 | 技术模式 |
|------|----------|----------|
| 添加接口 | 可视化表单 | JSON 编辑器 |
| 断言 | 预设模板 | 自定义表达式 |
| 变量提取 | 自动识别 | 手动配置 |
| 导入 | 拖拽上传 | 高级选项 |

---

## 7. 非功能需求

### 7.1 性能

- 单接口响应时间 < 200ms
- 50 接口并发执行 < 30s
- 页面加载时间 < 2s

### 7.2 安全

- 接口数据传输 HTTPS
- 敏感信息加密存储
- 操作日志记录

### 7.3 可用性

- 支持 Chrome、Firefox、Edge 最新版本
- 响应式布局（支持平板）
- 错误提示友好

---

## 8. 开发计划

### 8.1 第一阶段（MVP）

- [ ] 接口管理 CRUD
- [ ] 单接口调试
- [ ] 测试集管理
- [ ] 批量执行（串行）
- [ ] 基础报告

### 8.2 第二阶段

- [ ] 文件导入（Excel/CSV/YAML/JSON）
- [ ] 接口关联（变量提取）
- [ ] 断言规则
- [ ] 报告导出

### 8.3 第三阶段

- [ ] 并发执行优化
- [ ] 定时任务
- [ ] 简易模式 UI
- [ ] 性能优化

---

## 9. 风险与依赖

### 9.1 风险

| 风险 | 影响 | 应对 |
|------|------|------|
| 导入格式解析失败 | 中 | 提供模板下载 + 错误提示 |
| 并发执行不稳定 | 中 | 先做串行，验证后优化 |
| 数据库性能 | 低 | PostgreSQL 足够 |

### 9.2 依赖

- Python 3.10+
- PostgreSQL 14+
- Node.js 18+
- 前端依赖已安装

---

**审批状态**: ⏳ 待用户审批

