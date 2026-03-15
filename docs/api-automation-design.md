# AI-TestHub 接口自动化模块设计文档

## 一、概述

### 1.1 设计目标
打造一个**简洁、高效、智能化**的接口自动化测试平台，支持：
- 接口的快速录入与管理
- 单接口调试与执行
- 测试用例编排与批量执行
- AI 辅助测试能力

### 1.2 设计原则
- **简洁优先**：减少不必要的复杂度，核心功能突出
- **开箱即用**：无需复杂配置即可开始使用
- **渐进增强**：基础功能简单易用，高级功能按需开启
- **AI 赋能**：智能生成测试用例、智能断言、智能诊断

---

## 二、核心功能模块

### 2.1 模块架构

```
接口自动化
├── 接口管理        # 接口的增删改查、分类、收藏
├── 用例管理        # 测试用例的创建、编排
├── 执行中心        # 单接口执行、批量执行、历史记录
└── AI 助手         # 智能生成、智能断言、智能诊断
```

### 2.2 功能清单

| 模块 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| **接口管理** | 接口列表 | P0 | 表格展示，支持搜索、筛选、分页 |
| | 新建接口 | P0 | 简洁表单，核心字段：名称、URL、方法、请求体 |
| | 编辑接口 | P0 | 支持修改所有字段 |
| | 删除接口 | P0 | 支持单个删除 |
| | 收藏接口 | P1 | 快速标记常用接口 |
| | 分类管理 | P2 | 支持文件夹/标签分类 |
| **用例管理** | 用例列表 | P0 | 展示所有测试用例 |
| | 创建用例 | P0 | 关联接口，添加断言 |
| | 批量执行 | P0 | 执行多个用例 |
| | 执行历史 | P1 | 查看历史执行结果 |
| **执行中心** | 快捷执行 | P0 | 无需保存，直接执行请求 |
| | 单接口执行 | P0 | 执行已保存的接口 |
| | 执行历史 | P0 | 查看执行记录和响应 |
| | 批量执行 | P1 | 批量执行多个接口/用例 |
| **AI 助手** | 智能生成用例 | P1 | 根据接口自动生成测试用例 |
| | 智能断言 | P1 | 自动推荐断言规则 |
| | 智能诊断 | P2 | 分析失败原因并给出建议 |

---

## 三、数据模型设计

### 3.1 核心实体关系

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Folder    │       │  Interface  │       │  TestCase   │
│  (分类)     │       │   (接口)    │       │  (测试用例)  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ name        │◄──────│ folder_id   │       │ interface_id│──────►
│ parent_id   │       │ name        │◄──────│ name        │
│ created_at  │       │ method      │       │ assertions  │
└─────────────┘       │ url         │       │ variables   │
                      │ headers     │       │ created_at  │
                      │ params      │       └─────────────┘
                      │ body        │
                      │ is_favorite │
                      │ created_at  │
                      └─────────────┘
```

### 3.2 接口表 (interfaces)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 是 | 自增 | 主键 |
| folder_id | INTEGER | 否 | NULL | 所属分类 |
| name | VARCHAR(100) | 是 | - | 接口名称 |
| method | VARCHAR(10) | 是 | GET | HTTP 方法 |
| url | VARCHAR(500) | 是 | - | 请求地址 |
| description | TEXT | 否 | NULL | 描述 |
| headers | JSON | 否 | {} | 请求头 |
| params | JSON | 否 | {} | URL 参数 |
| body | JSON | 否 | NULL | 请求体 |
| body_type | VARCHAR(20) | 否 | json | body 类型: json/form/raw |
| is_favorite | BOOLEAN | 否 | FALSE | 是否收藏 |
| created_at | DATETIME | 否 | NOW | 创建时间 |
| updated_at | DATETIME | 否 | NOW | 更新时间 |

### 3.3 测试用例表 (test_cases)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 是 | 自增 | 主键 |
| interface_id | INTEGER | 否 | NULL | 关联接口 ID |
| name | VARCHAR(100) | 是 | - | 用例名称 |
| description | TEXT | 否 | NULL | 描述 |
| request_config | JSON | 否 | NULL | 请求配置(覆盖接口默认值) |
| assertions | JSON | 否 | [] | 断言规则列表 |
| variables | JSON | 否 | {} | 变量定义 |
| created_at | DATETIME | 否 | NOW | 创建时间 |
| updated_at | DATETIME | 否 | NOW | 更新时间 |

### 3.4 执行历史表 (execution_logs)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 是 | 自增 | 主键 |
| interface_id | INTEGER | 否 | NULL | 接口 ID |
| test_case_id | INTEGER | 否 | NULL | 用例 ID |
| request_url | VARCHAR(500) | 是 | - | 请求地址 |
| request_method | VARCHAR(10) | 是 | - | 请求方法 |
| request_headers | JSON | 否 | NULL | 请求头 |
| request_body | JSON | 否 | NULL | 请求体 |
| response_status | INTEGER | 否 | NULL | 响应状态码 |
| response_headers | JSON | 否 | NULL | 响应头 |
| response_body | TEXT | 否 | NULL | 响应体 |
| duration_ms | INTEGER | 否 | NULL | 耗时(毫秒) |
| status | VARCHAR(20) | 是 | - | 状态: success/failed/error |
| error_message | TEXT | 否 | NULL | 错误信息 |
| executed_at | DATETIME | 否 | NOW | 执行时间 |

---

## 四、API 接口设计

### 4.1 接口管理 API

#### 获取接口列表
```
GET /api/interfaces
Query: 
  - page: 页码 (默认 1)
  - page_size: 每页数量 (默认 20)
  - search: 搜索关键词
  - method: 按方法筛选
  - folder_id: 按分类筛选
Response:
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

#### 创建接口
```
POST /api/interfaces
Body:
{
  "name": "获取用户列表",
  "method": "GET",
  "url": "https://api.example.com/users",
  "description": "获取所有用户",
  "headers": {},
  "params": {"page": 1},
  "body": null,
  "folder_id": null
}
Response:
{
  "id": 1,
  "name": "获取用户列表",
  ...
}
```

#### 更新接口
```
PUT /api/interfaces/{id}
Body: 同创建
```

#### 删除接口
```
DELETE /api/interfaces/{id}
Response: {"success": true}
```

#### 切换收藏
```
PATCH /api/interfaces/{id}/favorite
Response: {"id": 1, "is_favorite": true}
```

### 4.2 执行 API

#### 快捷执行（无需保存）
```
POST /api/execute
Body:
{
  "url": "https://api.example.com/users",
  "method": "GET",
  "headers": {},
  "params": {},
  "body": null,
  "timeout": 30
}
Response:
{
  "success": true,
  "status_code": 200,
  "headers": {...},
  "body": {...},
  "duration_ms": 150
}
```

#### 执行已保存接口
```
POST /api/interfaces/{id}/execute
Response: 同上
```

#### 获取执行历史
```
GET /api/execution-logs
Query:
  - page: 页码
  - page_size: 每页数量
  - interface_id: 按接口筛选
  - status: 按状态筛选
Response:
{
  "items": [...],
  "total": 50
}
```

---

## 五、前端页面设计

### 5.1 页面布局

采用**左右分栏**布局，左侧为导航树，右侧为内容区：

```
┌────────────────────────────────────────────────────────────┐
│  AI-TestHub 接口自动化                    [搜索] [新建] [AI] │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│  📁 全部接口  │    接口列表 / 编辑器 / 执行结果              │
│  ⭐ 收藏     │                                             │
│  📂 分类1    │    ┌─────────────────────────────────────┐ │
│  📂 分类2    │    │ 名称 │ 方法 │ URL │ 状态 │ 操作     │ │
│  ─────────   │    ├─────────────────────────────────────┤ │
│  📋 测试用例 │    │ ...  │ ...  │ ... │ ...  │ 执行/编辑 │ │
│  📜 执行历史 │    └─────────────────────────────────────┘ │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

### 5.2 核心页面

#### 5.2.1 接口列表页
- **表格展示**：名称、方法(带颜色标签)、URL、状态、操作
- **快捷操作**：执行、编辑、删除、收藏
- **筛选功能**：按方法筛选、搜索
- **批量操作**：批量执行、批量删除

#### 5.2.2 接口编辑器
采用**抽屉式编辑器**，从右侧滑出：

```
┌─────────────────────────────────┐
│ 新建接口                    [×] │
├─────────────────────────────────┤
│ 接口名称                        │
│ ┌─────────────────────────────┐ │
│ │ 获取用户列表                 │ │
│ └─────────────────────────────┘ │
│                                 │
│ 请求方法          请求地址      │
│ [GET ▼]          ┌────────────┐│
│                   │ /api/users ││
│                   └────────────┘│
│                                 │
│ ┌─ Params ─ Headers ─ Body ───┐│
│ │ key         value    操作    ││
│ │ page        1        [×]     ││
│ │ [+ 添加参数]                 ││
│ └─────────────────────────────┘│
│                                 │
│        [取消]  [保存并执行] [保存]│
└─────────────────────────────────┘
```

#### 5.2.3 执行中心页
- **快捷执行区**：顶部卡片，输入 URL 直接执行
- **执行结果区**：
  - 响应状态、耗时
  - 响应头（可折叠）
  - 响应体（JSON 格式化）
- **历史记录区**：最近执行的请求列表

### 5.3 交互设计

#### 执行流程
```
用户点击"执行" 
  → 显示 Loading 状态
  → 请求后端执行接口
  → 返回结果
  → 显示响应（自动格式化 JSON）
  → 记录到执行历史
```

#### 表单验证
- URL 必填，格式校验
- 方法必选
- JSON 字段格式校验（实时）

---

## 六、技术架构

### 6.1 前端技术栈
- **框架**：React 19 + TypeScript 5
- **构建**：Vite 7
- **UI 组件**：Ant Design 6
- **状态管理**：Zustand 5
- **HTTP 客户端**：Axios
- **代码编辑器**：Monaco Editor（可选，用于 Body 编辑）

### 6.2 后端技术栈
- **框架**：FastAPI
- **数据库**：SQLite（开发）/ PostgreSQL（生产）
- **ORM**：SQLAlchemy 2
- **验证**：Pydantic 2
- **HTTP 客户端**：httpx（支持异步）

### 6.3 关键设计

#### 前后端分离
- 前端通过 Axios 调用后端 REST API
- 后端返回标准 JSON 格式
- 错误统一处理：`{ "detail": "错误信息" }`

#### 状态管理
```typescript
// stores/interfaceStore.ts
interface InterfaceStore {
  interfaces: Interface[]
  loading: boolean
  fetchInterfaces: () => Promise<void>
  createInterface: (data: InterfaceCreate) => Promise<void>
  executeInterface: (id: number) => Promise<ExecuteResult>
}
```

---

## 七、实施计划

### 阶段一：核心功能（1-2 天）
- [ ] 接口列表展示
- [ ] 新建/编辑/删除接口
- [ ] 单接口执行
- [ ] 执行结果展示

### 阶段二：完善功能（1-2 天）
- [ ] 执行历史记录
- [ ] 收藏功能
- [ ] 快捷执行（无需保存）
- [ ] 批量执行

### 阶段三：AI 增强（可选）
- [ ] AI 生成测试用例
- [ ] AI 智能断言推荐
- [ ] AI 失败诊断

---

## 八、确认事项

请确认以下设计是否符合您的需求：

1. **页面布局**：是否采用左右分栏布局？还是更喜欢单页全屏？
2. **编辑方式**：抽屉式编辑器 vs 弹窗式编辑器？
3. **分类功能**：是否需要分类（文件夹）功能？还是简单的列表即可？
4. **测试用例**：是否需要独立的测试用例模块？还是接口 + 断言即可？
5. **AI 功能**：AI 辅助功能的优先级如何？

请回复确认或提出修改意见，我将根据您的反馈开始实现。
