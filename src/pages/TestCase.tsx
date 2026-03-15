import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Upload, Drawer, Spin, Checkbox, Divider, Alert } from 'antd'
import { PlusOutlined, PlayCircleOutlined, UploadOutlined, EditOutlined, DeleteOutlined, RobotOutlined, CheckCircleOutlined, ScanOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableProps } from 'antd'
import apiClient from '../services/api'

interface TestCase {
  id: number
  name: string
  description: string
  project_id: number
  interface_id?: number
  method: string
  url: string
  priority: string
  status: string
  created_at: string
}

interface Project {
  id: number
  name: string
}

interface Interface {
  id: number
  name: string
  method: string
  url: string
}

// AI 生成的测试用例类型
interface AITestCase {
  name: string
  method: string
  url: string
  description: string
  headers: Record<string, string>
  params: Record<string, string>
  body: Record<string, unknown>
  body_type: string
  assertions: { type: string; expected: unknown }[]
  tags: string[]
  checked?: boolean
}

export default function TestCase() {
  const [data, setData] = useState<TestCase[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [interfaces, setInterfaces] = useState<Interface[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [form] = Form.useForm()
  const [importForm] = Form.useForm()
  const [aiForm] = Form.useForm()

  // AI 生成相关状态
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [generatedCases, setGeneratedCases] = useState<AITestCase[]>([])
  const [selectedCases, setSelectedCases] = useState<number[]>([])
  const [baseUrl, setBaseUrl] = useState('https://api.example.com')
  const [testTypes, setTestTypes] = useState<string[]>(['function', 'performance', 'compatible'])

  // 代码扫描相关状态
  const [scanModalVisible, setScanModalVisible] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scannedEndpoints, setScannedEndpoints] = useState<any[]>([])
  const [scanResult, setScanResult] = useState<any>(null)

  // 加载用例列表
  const loadCases = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get("/api/cases/")
      setData(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load cases:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载项目列表
  const loadProjects = async () => {
    try {
      const { data } = await apiClient.get("/api/projects/")
      setProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  // 加载接口列表
  const loadInterfaces = async (projectId: number) => {
    try {
      const response = await apiClient.get("/api/interfaces/?project_id=${projectId}")
      setInterfaces(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load interfaces:', error)
    }
  }

  useEffect(() => {
    loadCases()
    loadProjects()
  }, [])

  // 新建用例
  const handleCreate = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      await apiClient.post("/api/cases/", values)
      message.success('用例创建成功')
      setModalVisible(false)
      form.resetFields()
      loadCases()
    } catch (error: any) {
      message.error(`创建失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 编辑用例
  const handleEdit = (record: TestCase) => {
    setEditingCase(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  // 更新用例
  const handleUpdate = async () => {
    if (!editingCase) return
    const values = await form.validateFields()
    setLoading(true)
    try {
      await apiClient.put(`/api/cases/${editingCase.id}`, values)
      message.success('用例更新成功')
      setModalVisible(false)
      form.resetFields()
      setEditingCase(null)
      loadCases()
    } catch (error: any) {
      message.error(`更新失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 删除用例
  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/cases/${id}`)
      message.success('删除成功')
      loadCases()
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`)
    }
  }

  // 执行用例
  const handleRun = async (id: number) => {
    setLoading(true)
    try {
      const response = await apiClient.post(`/api/cases/${id}/run`)
      const result = await response.json()
      message.success(`执行完成: ${result.status || '成功'}`)
      loadCases()
    } catch (error: any) {
      message.error(`执行失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 导入模板
  const handleImport = async () => {
    const values = await importForm.validateFields()
    setLoading(true)
    try {
      const response = await apiClient.post("/api/interfaces/import-json", { project_id: 1, content: values.content })
      if (response.ok) {
        const result = await response.json()
        message.success(result.message || '导入成功')
        setImportModalVisible(false)
        importForm.resetFields()
        loadCases()
      } else {
        message.error('导入失败')
      }
    } catch (error: any) {
      message.error(`导入失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 项目选择变化时加载接口
  const handleProjectChange = (projectId: number) => {
    loadInterfaces(projectId)
  }

  // AI 生成测试用例
  const handleAIGenerate = async () => {
    const values = await aiForm.validateFields()
    setAiLoading(true)
    setGeneratedCases([])
    setSelectedCases([])
    try {
      const response = await apiClient.post("/api/test-cases-ai/generate-test-cases", { prompt: "" })
      
      if (!response.ok) {
        throw new Error('AI 生成失败')
      }
      
      const result = await response.json()
      
      if (result.cases && result.cases.length > 0) {
        // 为每个用例添加 checked 字段
        const casesWithChecked = result.cases.map((c: AITestCase, idx: number) => ({
          ...c,
          checked: idx < 5 // 默认选中前5个
        }))
        setGeneratedCases(casesWithChecked)
        
        // 默认选中前5个
        const defaultSelected = result.cases.slice(0, 5).map((_: AITestCase, idx: number) => idx)
        setSelectedCases(defaultSelected)
        
        message.success(`AI 生成了 ${result.cases.length} 个用例，其中 ${result.valid_count} 个有效`)
      } else {
        message.warning('AI 未生成任何用例，请尝试调整需求描述')
      }
    } catch (error: any) {
      message.error(`AI 生成失败: ${error.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  // 选中/取消选中用例
  const handleCaseSelect = (idx: number, checked: boolean) => {
    if (checked) {
      setSelectedCases([...selectedCases, idx])
    } else {
      setSelectedCases(selectedCases.filter(i => i !== idx))
    }
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCases(generatedCases.map((_, idx) => idx))
    } else {
      setSelectedCases([])
    }
  }

  // 导入选中的 AI 用例
  const handleAIImport = async () => {
    if (selectedCases.length === 0) {
      message.warning('请选择要导入的用例')
      return
    }
    
    const selectedProjectId = aiForm.getFieldValue('project_id')
    if (!selectedProjectId) {
      message.warning('请选择所属项目')
      return
    }
    
    setAiLoading(true)
    try {
      const casesToImport = selectedCases.map(idx => generatedCases[idx])
      
      const response = await apiClient.post("/api/test-cases-ai/import-ai-cases", { cases: casesToImport })
      
      if (!response.ok) {
        throw new Error('导入失败')
      }
      
      const result = await response.json()
      message.success(`成功导入 ${result.created_count} 个测试用例到测试集`)
      setAiModalVisible(false)
      aiForm.resetFields()
      setGeneratedCases([])
      setSelectedCases([])
      loadCases()
    } catch (error: any) {
      message.error(`导入失败: ${error.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  // 代码扫描并生成用例
  const handleScanAndGenerate = async () => {
    setScanLoading(true)
    setScannedEndpoints([])
    setScanResult(null)
    try {
      const response = await apiClient.post("/api/scan-code/generate-cases", {})
      
      if (!response.ok) {
        throw new Error('扫描失败')
      }
      
      const result = await response.json()
      setScanResult(result)
      
      if (result.scanned?.endpoints) {
        setScannedEndpoints(result.scanned.endpoints)
      }
      
      message.success(result.message || '扫描完成')
    } catch (error: any) {
      message.error(`扫描失败: ${error.message}`)
    } finally {
      setScanLoading(false)
    }
  }

  // 导入扫描生成的用例
  const handleScanImport = async (projectId: number) => {
    if (!scanResult?.generated_cases?.length) {
      message.warning('没有可导入的用例')
      return
    }
    
    setScanLoading(true)
    try {
      const response = await apiClient.post("/api/test-cases-ai/import-ai-cases", { cases: scanResult.generated_cases })
      
      if (!response.ok) {
        throw new Error('导入失败')
      }
      
      const result = await response.json()
      message.success(`成功导入 ${result.created_count} 个测试用例`)
      setScanModalVisible(false)
      setScannedEndpoints([])
      setScanResult(null)
      loadCases()
    } catch (error: any) {
      message.error(`导入失败: ${error.message}`)
    } finally {
      setScanLoading(false)
    }
  }

  const columns: ColumnsType<TestCase> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用例名称', dataIndex: 'name', key: 'name' },
    { title: '请求方式', dataIndex: 'method', key: 'method', width: 100,
      render: (method: string) => (
        <Tag color={method === 'GET' ? 'green' : method === 'POST' ? 'blue' : method === 'PUT' ? 'orange' : 'red'}>
          {method}
        </Tag>
      )
    },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (priority: string) => {
        const color = priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'blue'
        return <Tag color={color}>{priority}</Tag>
      }
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => {
        const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'default'
        const text = status === 'pass' ? '通过' : status === 'fail' ? '失败' : '待执行'
        return <Tag color={color}>{text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: TestCase) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleRun(record.id)}>执行</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>测试用例</h1>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
            导入模板
          </Button>
          <Button type="primary" icon={<ScanOutlined />} onClick={() => setScanModalVisible(true)} style={{ background: '#13c2c2', borderColor: '#13c2c2' }}>
            代码扫描生成
          </Button>
          <Button type="primary" icon={<RobotOutlined />} onClick={() => setAiModalVisible(true)} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
            AI 一键生成
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingCase(null)
            form.resetFields()
            setModalVisible(true)
          }}>
            新建用例
          </Button>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        pagination={{ pageSize: 10 }} 
        rowKey="id"
      />

      {/* 新建/编辑用例 Modal */}
      <Modal
        title={editingCase ? '编辑用例' : '新建用例'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingCase(null)
        }}
        onOk={editingCase ? handleUpdate : handleCreate}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="用例名称" rules={[{ required: true }]}>
            <Input placeholder="请输入用例名称" />
          </Form.Item>
          <Form.Item name="project_id" label="所属项目" rules={[{ required: true }]}>
            <Select placeholder="请选择项目" onChange={handleProjectChange}>
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="interface_id" label="关联接口">
            <Select placeholder="请选择接口" allowClear>
              {interfaces.map(i => (
                <Select.Option key={i.id} value={i.id}>{i.method} - {i.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="P1">
            <Select>
              <Select.Option value="P0">P0</Select.Option>
              <Select.Option value="P1">P1</Select.Option>
              <Select.Option value="P2">P2</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="用例描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入模板 Modal */}
      <Modal
        title="导入接口模板"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false)
          importForm.resetFields()
        }}
        onOk={handleImport}
        confirmLoading={loading}
      >
        <Form form={importForm} layout="vertical">
          <Form.Item name="project_id" label="所属项目" rules={[{ required: true }]}>
            <Select placeholder="请选择项目">
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="format" label="导入格式" rules={[{ required: true }]} initialValue="postman">
            <Select>
              <Select.Option value="postman">Postman Collection</Select.Option>
              <Select.Option value="swagger">Swagger / OpenAPI</Select.Option>
              <Select.Option value="har">HAR</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="content" label="导入内容" rules={[{ required: true }]}>
            <Input.TextArea rows={10} placeholder="粘贴 Postman JSON、Swagger JSON 或 HAR 内容" />
          </Form.Item>
        </Form>
      </Modal>

      {/* AI 一键生成 Modal */}
      <Modal
        title={<><RobotOutlined style={{ marginRight: 8 }} />AI 一键生成测试用例</>}
        open={aiModalVisible}
        onCancel={() => {
          setAiModalVisible(false)
          aiForm.resetFields()
          setGeneratedCases([])
          setSelectedCases([])
        }}
        width={900}
        footer={null}
      >
        <Spin spinning={aiLoading}>
          <Form form={aiForm} layout="vertical">
            <Form.Item name="requirement" label="需求描述" rules={[{ required: true, message: '请输入需求描述' }]}>
              <Input.TextArea 
                rows={3} 
                placeholder="例如：用户登录功能，包括账号密码登录、手机验证码登录、第三方微信登录等" 
              />
            </Form.Item>
            
            <Form.Item name="base_url" label="基础 URL" initialValue={baseUrl}>
              <Input 
                placeholder="https://api.example.com" 
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </Form.Item>
            
            <Form.Item name="project_id" label="导入到项目" rules={[{ required: true, message: '请选择项目' }]}>
              <Select placeholder="请选择项目">
                {projects.map(p => (
                  <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="测试类型">
              <Checkbox.Group 
                value={testTypes}
                onChange={(vals) => setTestTypes(vals as string[])}
              >
                <Checkbox value="function">
                  <Tag color="green">功能测试</Tag>
                </Checkbox>
                <Checkbox value="performance">
                  <Tag color="blue">性能测试</Tag>
                </Checkbox>
                <Checkbox value="compatible">
                  <Tag color="orange">兼容性测试</Tag>
                </Checkbox>
              </Checkbox.Group>
            </Form.Item>
            
            <Button 
              type="primary" 
              icon={<RobotOutlined />} 
              onClick={handleAIGenerate}
              loading={aiLoading}
              block
              style={{ marginBottom: 16 }}
            >
              生成测试用例
            </Button>
          </Form>
          
          {/* 生成的用例列表 */}
          {generatedCases.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Divider orientation="left">
                <Space>
                  <span>生成的用例 ({generatedCases.length})</span>
                  <Checkbox 
                    checked={selectedCases.length === generatedCases.length}
                    indeterminate={selectedCases.length > 0 && selectedCases.length < generatedCases.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  >
                    全选
                  </Checkbox>
                  <Tag color="blue">已选 {selectedCases.length} 个</Tag>
                </Space>
              </Divider>
              
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {generatedCases.map((caseItem, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: 12, 
                      marginBottom: 8, 
                      background: selectedCases.includes(idx) ? '#f6ffed' : '#fafafa',
                      border: selectedCases.includes(idx) ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() => handleCaseSelect(idx, !selectedCases.includes(idx))}
                  >
                    <Space>
                      <Checkbox 
                        checked={selectedCases.includes(idx)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCaseSelect(idx, e.target.checked)}
                      />
                      <Tag color={caseItem.method === 'GET' ? 'green' : caseItem.method === 'POST' ? 'blue' : caseItem.method === 'PUT' ? 'orange' : 'red'}>
                        {caseItem.method}
                      </Tag>
                      <span style={{ fontWeight: 500 }}>{caseItem.name}</span>
                      {caseItem.tags?.map(tag => (
                        <Tag key={tag} color={tag === 'function' ? 'green' : tag === 'performance' ? 'blue' : 'orange'} style={{ fontSize: 10 }}>
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                    <div style={{ marginTop: 4, marginLeft: 36, fontSize: 12, color: '#666' }}>
                      {caseItem.description || caseItem.url}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={handleAIImport}
                disabled={selectedCases.length === 0}
                block
                style={{ marginTop: 16 }}
              >
                导入选中的 {selectedCases.length} 个用例
              </Button>
            </div>
          )}
        </Spin>
      </Modal>

      {/* 代码扫描生成 Modal */}
      <Modal
        title={<><ScanOutlined style={{ marginRight: 8 }} />代码扫描 - 自动生成测试用例</>}
        open={scanModalVisible}
        onCancel={() => {
          setScanModalVisible(false)
          setScannedEndpoints([])
          setScanResult(null)
        }}
        width={1000}
        footer={null}
      >
        <Spin spinning={scanLoading}>
          <div style={{ marginBottom: 16 }}>
            <Alert 
              message="代码扫描说明" 
              description="自动扫描项目代码中的 API 接口定义（FastAPI/Flask 路由），并根据接口自动生成测试用例。默认扫描项目 app 目录。" 
              type="info" 
              showIcon 
            />
          </div>
          
          <Space style={{ marginBottom: 16 }}>
            <span>测试类型：</span>
            <Checkbox.Group 
              value={testTypes}
              onChange={(vals) => setTestTypes(vals as string[])}
            >
              <Checkbox value="function"><Tag color="green">功能测试</Tag></Checkbox>
              <Checkbox value="performance"><Tag color="blue">性能测试</Tag></Checkbox>
              <Checkbox value="compatible"><Tag color="orange">兼容性测试</Tag></Checkbox>
            </Checkbox.Group>
          </Space>
          
          <Button 
            type="primary" 
            icon={<ScanOutlined />} 
            onClick={handleScanAndGenerate}
            loading={scanLoading}
            block
            style={{ marginBottom: 16 }}
          >
            扫描代码并生成测试用例
          </Button>
          
          {/* 扫描结果 */}
          {scanResult && (
            <div style={{ marginTop: 16 }}>
              <Divider orientation="left">
                <Space>
                  <span>扫描结果</span>
                  <Tag color="blue">共 {scanResult.scanned?.total || 0} 个接口</Tag>
                  {scanResult.scanned?.by_method && Object.entries(scanResult.scanned.by_method).map(([method, count]: [string, any]) => (
                    <Tag key={method} color={method === 'GET' ? 'green' : method === 'POST' ? 'blue' : method === 'PUT' ? 'orange' : 'red'}>
                      {method}: {count}
                    </Tag>
                  ))}
                </Space>
              </Divider>
              
              {/* 扫描到的接口列表 */}
              {scannedEndpoints.length > 0 && (
                <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 16 }}>
                  <Table
                    size="small"
                    columns={[
                      { title: '方法', dataIndex: 'method', width: 70, 
                        render: (m: string) => <Tag color={m === 'GET' ? 'green' : m === 'POST' ? 'blue' : m === 'PUT' ? 'orange' : 'red'}>{m}</Tag> 
                      },
                      { title: '路径', dataIndex: 'path', ellipsis: true },
                      { title: '函数', dataIndex: 'function_name', width: 150 },
                      { title: '描述', dataIndex: 'summary', ellipsis: true }
                    ]}
                    dataSource={scannedEndpoints}
                    rowKey={(r: any) => r.path + r.method}
                    pagination={false}
                    locale={{ emptyText: '无接口信息' }}
                  />
                </div>
              )}
              
              {/* 生成的用例 */}
              {scanResult.generated_cases?.length > 0 && (
                <div>
                  <Divider orientation="left">
                    <Space>
                      <span>生成的测试用例</span>
                      <Tag color="green">{scanResult.generated_cases.length} 个</Tag>
                    </Space>
                  </Divider>
                  
                  <div style={{ maxHeight: 250, overflow: 'auto' }}>
                    {scanResult.generated_cases.map((caseItem: any, idx: number) => (
                      <div key={idx} style={{ padding: '8px 12px', marginBottom: 8, background: '#fafafa', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                        <Space>
                          <Tag color={caseItem.method === 'GET' ? 'green' : caseItem.method === 'POST' ? 'blue' : caseItem.method === 'PUT' ? 'orange' : 'red'}>
                            {caseItem.method}
                          </Tag>
                          <span style={{ fontWeight: 500 }}>{caseItem.name}</span>
                        </Space>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                          {caseItem.url} - {caseItem.description || '无描述'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Form.Item label="导入到项目" style={{ marginTop: 16 }}>
                    <Select 
                      placeholder="请选择项目"
                      onChange={(projectId) => {
                        if (projectId) handleScanImport(projectId)
                      }}
                    >
                      {projects.map(p => (
                        <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              )}
              
              {!scanResult.generated_cases?.length && scannedEndpoints.length > 0 && (
                <Alert 
                  message="扫描完成但未生成用例" 
                  description="请尝试调整测试类型设置后重新扫描" 
                  type="warning" 
                  showIcon 
                />
              )}
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  )
}
