# 接口自动化增强功能 - 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现接口自动化增强功能：导入模板下载、接口收藏、断言配置、环境管理

**Architecture:** 前端 React + Ant Design，后端 FastAPI + SQLAlchemy，复用现有模型

**Tech Stack:** React, TypeScript, FastAPI, openpyxl, pyyaml

---

## Phase 1: 导入模板下载

### Task 1.1: 后端 - 模板下载 API

**Files:**
- Modify: `app/api/interfaces.py`

- [ ] **Step 1: 添加模板下载接口**

```python
@router.get("/template")
async def download_template(format: str = "excel"):
    """下载导入模板
    
    支持格式: excel, json, yaml
    """
    if format == "excel":
        # 生成 Excel 模板
        import io
        from openpyxl import Workbook
        
        wb = Workbook()
        ws = wb.active
        ws.title = "接口导入模板"
        
        # 表头
        headers = ["name", "method", "url", "description", "headers", "params", "body", "body_type", "var_extracts", "assertions"]
        ws.append(headers)
        
        # 示例数据
        ws.append([
            "示例接口",
            "POST",
            "https://api.example.com/users",
            "获取用户列表",
            '{"Content-Type": "application/json"}',
            '{"page": 1, "size": 10}',
            '{"name": "test"}',
            "json",
            '{"token": "$.data.token"}',
            '[{"type": "status", "expected": 200}]'
        ])
        
        # 空行示例
        ws.append(["", "", "", "", "", "", "", "", "", ""])
        
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=interface_template.xlsx"}
        )
    
    elif format == "json":
        template = [
            {
                "name": "示例接口",
                "method": "POST",
                "url": "https://api.example.com/users",
                "description": "获取用户列表",
                "headers": {"Content-Type": "application/json"},
                "params": {"page": 1, "size": 10},
                "body": {"name": "test"},
                "body_type": "json",
                "var_extracts": {"token": "$.data.token"},
                "assertions": [{"type": "status", "expected": 200}]
            }
        ]
        return Response(
            json.dumps(template, indent=2, ensure_ascii=False),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=interface_template.json"}
        )
    
    elif format == "yaml":
        template = [
            {
                "name": "示例接口",
                "method": "POST",
                "url": "https://api.example.com/users",
                "description": "获取用户列表",
                "headers": {"Content-Type": "application/json"},
                "params": {"page": 1, "size": 10},
                "body": {"name": "test"},
                "body_type": "json",
                "var_extracts": {"token": "$.data.token"},
                "assertions": [{"type": "status", "expected": 200}]
            }
        ]
        yaml_content = yaml.dump(template, allow_unicode=True, default_flow_style=False)
        return Response(
            yaml_content,
            media_type="application/x-yaml",
            headers={"Content-Disposition": "attachment; filename=interface_template.yaml"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="不支持的格式")
```

- [ ] **Step 2: 测试 API**

Run: `curl -I http://localhost:8000/api/interfaces/template?format=excel`
Expected: 返回文件下载

- [ ] **Step 3: Commit**

```bash
cd ~/ai-test-hub
git add app/api/interfaces.py
git commit -m "feat: add template download API for interface import"
```

---

### Task 1.2: 前端 - 添加下载按钮

**Files:**
- Modify: `src/pages/ApiAutomation.tsx`

- [ ] **Step 1: 添加下载函数**

```typescript
const downloadTemplate = async (format: 'excel' | 'json' | 'yaml') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/interfaces/template?format=${format}`)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interface_template.${format === 'yaml' ? 'yaml' : format}`
    a.click()
    URL.revokeObjectURL(url)
    message.success('模板下载成功')
  } catch (error) {
    message.error('模板下载失败')
  }
}
```

- [ ] **Step 2: 添加下载按钮**

在导入按钮旁边添加下拉菜单：

```tsx
<Dropdown
  menu={{
    items: [
      { key: 'excel', label: 'Excel (.xlsx)', onClick: () => downloadTemplate('excel') },
      { key: 'json', label: 'JSON', onClick: () => downloadTemplate('json') },
      { key: 'yaml', label: 'YAML', onClick: () => downloadTemplate('yaml') },
    ]
  }}
>
  <Button icon={<DownloadOutlined />}>下载模板</Button>
</Dropdown>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ApiAutomation.tsx
git commit -m "feat: add template download buttons to import modal"
```

---

## Phase 2: 接口收藏

### Task 2.1: 后端 - 收藏 API

**Files:**
- Modify: `app/api/interfaces.py`

- [ ] **Step 1: 添加收藏切换接口**

```python
@router.patch("/{interface_id}/favorite")
async def toggle_favorite(interface_id: int, db: Session = Depends(get_db)):
    """切换接口收藏状态"""
    interface = db.query(Interface).filter(Interface.id == interface_id).first()
    if not interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    
    interface.is_favorite = not interface.is_favorite
    db.commit()
    
    return {"id": interface.id, "is_favorite": interface.is_favorite}


@router.get("/", response_model=List[InterfaceResponse])
async def list_interfaces(
    project_id: int = None, 
    favorites_only: bool = False,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """获取接口列表
    
    Args:
        project_id: 项目ID筛选
        favorites_only: 仅返回收藏的接口
    """
    query = db.query(Interface)
    if project_id:
        query = query.filter(Interface.project_id == project_id)
    if favorites_only:
        query = query.filter(Interface.is_favorite == True)
    
    # 收藏的接口排在前面
    query = query.order_by(Interface.is_favorite.desc(), Interface.id.desc())
    
    return query.offset(skip).limit(limit).all()
```

- [ ] **Step 2: Commit**

```bash
git add app/api/interfaces.py
git commit -m "feat: add favorite toggle API and favorites filter"
```

---

### Task 2.2: 前端 - 收藏按钮和筛选

**Files:**
- Modify: `src/pages/ApiAutomation.tsx`

- [ ] **Step 1: 添加收藏状态和函数**

```typescript
const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

const toggleFavorite = async (id: number, current: boolean) => {
  try {
    await fetch(`${API_BASE_URL}/api/interfaces/${id}/favorite`, { method: 'PATCH' })
    loadInterfaces()
  } catch (error) {
    message.error('操作失败')
  }
}
```

- [ ] **Step 2: 修改表格列**

```tsx
{
  title: '收藏',
  dataIndex: 'is_favorite',
  key: 'favorite',
  width: 60,
  render: (favorite: boolean, record: InterfaceData) => (
    <Button 
      type="text" 
      icon={<StarFilled style={{ color: favorite ? '#faad14' : '#ccc' }} />}
      onClick={() => toggleFavorite(record.id!, favorite)}
    />
  )
}
```

- [ ] **Step 3: 添加筛选按钮**

```tsx
<Button 
  type={showFavoritesOnly ? 'primary' : 'default'}
  icon={<StarOutlined />}
  onClick={() => {
    setShowFavoritesOnly(!showFavoritesOnly)
    // 重新加载接口，传入 favorites_only 参数
  }}
>
  收藏
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ApiAutomation.tsx
git commit -m "feat: add favorite toggle and filter UI"
```

---

## Phase 3: 断言配置

### Task 3.1: 前端 - 断言配置组件

**Files:**
- Create: `src/components/api-automation/AssertionConfig.tsx`

- [ ] **Step 1: 创建断言配置组件**

```tsx
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { Select, InputNumber, Button } from 'antd'

const { Option } = Select

interface Assertion {
  type: 'status' | 'json' | 'response_time' | 'contains'
  path?: string
  expected: any
  operator?: string
}

export default function AssertionConfig({ 
  value, 
  onChange 
}: { 
  value?: Assertion[], 
  onChange: (value: Assertion[]) => void 
}) {
  const assertions = value || []

  const addAssertion = () => {
    onChange([...assertions, { type: 'status', expected: 200 }])
  }

  const updateAssertion = (index: number, field: string, val: any) => {
    const newAssertions = [...assertions]
    newAssertions[index] = { ...newAssertions[index], [field]: val }
    onChange(newAssertions)
  }

  const removeAssertion = (index: number) => {
    onChange(assertions.filter((_, i) => i !== index))
  }

  return (
    <div>
      {assertions.map((assertion, index) => (
        <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Select
            value={assertion.type}
            onChange={(val) => updateAssertion(index, 'type', val)}
            style={{ width: 120 }}
          >
            <Option value="status">状态码</Option>
            <Option value="json">JSON断言</Option>
            <Option value="response_time">响应时间</Option>
            <Option value="contains">包含</Option>
          </Select>
          
          {assertion.type === 'json' && (
            <Input 
              placeholder="$.data.code" 
              value={assertion.path}
              onChange={(e) => updateAssertion(index, 'path', e.target.value)}
              style={{ width: 150 }}
            />
          )}
          
          <Input
            placeholder="期望值"
            value={assertion.expected}
            onChange={(e) => updateAssertion(index, 'expected', e.target.value)}
            style={{ width: 100 }}
          />
          
          {assertion.type === 'response_time' && (
            <Select
              value={assertion.operator || '<'}
              onChange={(val) => updateAssertion(index, 'operator', val)}
              style={{ width: 80 }}
            >
              <Option value="<">&lt;</Option>
              <Option value=">">&gt;</Option>
              <Option value="==">==</Option>
            </Select>
          )}
          
          <Button icon={<DeleteOutlined />} danger onClick={() => removeAssertion(index)} />
        </div>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={addAssertion}>
        添加断言
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/api-automation/AssertionConfig.tsx
git commit -m "feat: add assertion configuration component"
```

---

## Phase 4: 环境管理

### Task 4.1: 后端 - 环境管理 API（已有基础）

已有 Environment 模型和 API，检查并增强。

- [ ] **Step 1: 检查现有 API**

Run: `cat app/api/environments.py`
Expected: 已有 CRUD 接口

- [ ] **Step 2: 如需增强，添加激活接口**

```python
@router.post("/{env_id}/activate")
async def activate_environment(env_id: int, db: Session = Depends(get_db)):
    """激活环境（取消其他环境的激活状态）"""
    # 取消其他环境激活状态
    db.query(Environment).filter(
        Environment.project_id == db.query(Environment).get(env_id).project_id
    ).update({"is_active": False})
    
    # 激活指定环境
    env = db.query(Environment).filter(Environment.id == env_id).first()
    env.is_active = True
    db.commit()
    
    return {"id": env.id, "name": env.name, "is_active": True}
```

- [ ] **Step 3: 提交**

```bash
git add app/api/environments.py
git commit -m "feat: add environment activation API"
```

---

### Task 4.2: 前端 - 环境管理页面

**Files:**
- Create: `src/components/api-automation/Environments.tsx`

- [ ] **Step 1: 创建环境管理组件**

参考现有的 TestSuites 组件，创建类似的环境管理页面：
- 环境列表
- 创建/编辑环境
- 激活/切换环境

- [ ] **Step 2: 提交**

```bash
git add src/components/api-automation/Environments.tsx
git commit -m "feat: add environment management component"
```

---

## 总结

### 实现顺序

1. **Phase 1** - 导入模板下载（后端 API + 前端按钮）
2. **Phase 2** - 接口收藏（后端 API + 前端按钮）
3. **Phase 3** - 断言配置（前端组件）
4. **Phase 4** - 环境管理（增强 API + 前端页面）

### 预计工作量

| Phase | 任务数 | 预估时间 |
|-------|--------|----------|
| 1 | 2 | 30 min |
| 2 | 2 | 30 min |
| 3 | 1 | 30 min |
| 4 | 2 | 30 min |
| **总计** | **7** | **~2 h** |
