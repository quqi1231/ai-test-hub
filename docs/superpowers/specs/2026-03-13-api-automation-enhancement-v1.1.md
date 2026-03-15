# 接口自动化增强功能 - 设计文档

**项目**: AI-TestHub 接口自动化测试模块增强  
**版本**: v1.1  
**日期**: 2026-03-13  
**状态**: 待审批

---

## 1. 功能一：导入模板下载

### 1.1 需求

- 支持 Excel/JSON/YAML 三种格式下载
- 包含全部字段：基础+请求+变量提取+断言
- 所有字段可为空，用户按需填写

### 1.2 模板字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 接口名称 |
| method | string | 是 | GET/POST/PUT/DELETE/PATCH |
| url | string | 是 | 请求 URL |
| description | string | 否 | 接口描述 |
| headers | JSON | 否 | 请求头 |
| params | JSON | 否 | URL 参数 |
| body | JSON | 否 | 请求体 |
| body_type | string | 否 | json/form-data/x-www-form-urlencoded/raw |
| var_extracts | JSON | 否 | 变量提取配置 |
| assertions | JSON | 否 | 断言配置 |

### 1.3 API 设计

```
GET /api/interfaces/template?format=excel|json|yaml
```

返回对应的模板文件下载。

---

## 2. 功能二：接口收藏

### 2.1 需求

- 标记重要/核心接口
- 快速筛选收藏接口
- 收藏接口排在列表前面

### 2.2 字段（已存在于模型）

```python
# Interface 模型已有
is_favorite = Column(Boolean, default=False)
```

### 2.3 API 设计

```
PATCH /api/interfaces/{id}/favorite
```

切换收藏状态。

---

## 3. 功能三：断言配置

### 3.1 需求

- 预设模板 + 自定义 JSONPath + 变量关联
- 可视化配置界面

### 3.2 断言类型

| 类型 | 说明 | 示例 |
|------|------|------|
| status | 状态码断言 | status == 200 |
| json | JSON 路径断言 | $.code == 0 |
| response_time | 响应时间 | elapsed_ms < 1000 |
| contains | 响应包含 | body contains "success" |

### 3.3 UI 设计

```json
// 断言配置示例
{
  "assertions": [
    {"type": "status", "expected": 200},
    {"type": "json", "path": "$.code", "expected": 0, "operator": "=="},
    {"type": "response_time", "expected": 1000, "operator": "<"}
  ]
}
```

---

## 4. 功能四：环境管理

### 4.1 需求

- 全局环境配置（项目级别）
- 测试集可覆盖环境变量
- 支持多环境切换

### 4.2 现有模型（复用）

```python
# Environment 模型已存在
class Environment(Base):
    project_id: int
    name: str           # 环境名称：开发环境/测试环境/生产环境
    base_url: str      # 基础 URL
    variables: JSON     # 环境变量
    headers: JSON       # 全局请求头
    is_active: bool    # 是否激活
```

### 4.3 API 设计

```
GET    /api/environments/?project_id=1     # 获取环境列表
POST   /api/environments/                   # 创建环境
PUT    /api/environments/{id}              # 更新环境
DELETE /api/environments/{id}              # 删除环境
POST   /api/environments/{id}/activate      # 激活环境
```

### 4.4 UI 设计

- 环境列表页面
- 环境切换下拉框
- 变量管理表格

---

## 5. 开发计划

### Phase 1: 导入模板下载
- [ ] 后端 API：模板下载接口
- [ ] 前端：添加下载按钮

### Phase 2: 接口收藏
- [ ] 后端 API：收藏切换接口
- [ ] 前端：收藏按钮 + 筛选

### Phase 3: 断言配置
- [ ] 前端：断言配置表单组件
- [ ] 测试集编辑时支持断言配置

### Phase 4: 环境管理
- [ ] 前端：环境管理页面
- [ ] 测试集选择环境

---

**审批状态**: ⏳ 待用户审批

