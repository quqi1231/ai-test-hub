/**
 * 接口自动化模块 V2
 * 层级结构：项目 > 测试集合 > 测试用例
 * 简化布局：直接展示项目列表和测试集合
 */
import { useState, useEffect } from 'react'
import {
  Card, Button, Table, Space, Tag, Modal, Form, Input, Select,
  Drawer, Tabs, message, Popconfirm, Badge, Empty, Spin,
  Row, Col, Statistic, Divider, Alert, Collapse, List
} from 'antd'
import {
  FolderOutlined, FolderAddOutlined, PlusOutlined,
  DeleteOutlined, EditOutlined, PlayCircleOutlined,
  ApiOutlined, ProjectOutlined,
  RobotOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, RightOutlined, DownOutlined
} from '@ant-design/icons'
import axios from 'axios'

const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse

// 使用相对路径，让浏览器自动使用当前域名
const API_BASE_URL = ''

// ==================== 类型定义 ====================

interface ApiProject {
  id: number
  name: string
  description?: string
  is_active: boolean
  suite_count: number
  case_count: number
  created_at: string
}

interface ApiTestSuite {
  id: number
  project_id: number
  name: string
  description?: string
  cases: ApiTestCase[]
  case_count: number
}

interface ApiTestCase {
  id: number
  suite_id: number
  name: string
  description?: string
  method: string
  url: string
  headers?: Record<string, any>
  params?: Record<string, any>
  body?: any
  body_type: string
  assertions?: any[]
  last_status?: string
  last_status_code?: number
  last_response_time?: number
}

interface ExecuteResult {
  success: boolean
  status_code: number
  response_body?: any
  duration_ms: number
  error?: string
}

// ==================== 主组件 ====================

export default function ApiAutomationV2() {
  // 状态
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [projectSuites, setProjectSuites] = useState<Record<number, ApiTestSuite[]>>({})
  const [loading, setLoading] = useState(false)
  
  // 抽屉状态
  const [projectDrawerVisible, setProjectDrawerVisible] = useState(false)
  const [suiteDrawerVisible, setSuiteDrawerVisible] = useState(false)
  const [caseDrawerVisible, setCaseDrawerVisible] = useState(false)
  const [resultDrawerVisible, setResultDrawerVisible] = useState(false)
  
  // 当前操作
  const [currentProject, setCurrentProject] = useState<ApiProject | null>(null)
  const [currentSuite, setCurrentSuite] = useState<ApiTestSuite | null>(null)
  const [currentCase, setCurrentCase] = useState<ApiTestCase | null>(null)
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null)
  
  // 表单
  const [projectForm] = Form.useForm()
  const [suiteForm] = Form.useForm()
  const [caseForm] = Form.useForm()

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v2/automation/projects`)
      setProjects(res.data)
      
      // 自动加载每个项目的测试集合
      for (const p of res.data) {
        loadSuites(p.id)
      }
    } catch (e) {
      console.error('加载项目失败:', e)
    } finally {
      setLoading(false)
    }
  }

  // 加载测试集合
  const loadSuites = async (projectId: number) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v2/automation/projects/${projectId}/suites`)
      setProjectSuites(prev => ({ ...prev, [projectId]: res.data }))
    } catch (e) {
      console.error('加载测试集合失败:', e)
    }
  }

  // 初始化
  useEffect(() => {
    loadProjects()
  }, [])

  // ==================== 项目操作 ====================

  const handleCreateProject = () => {
    setCurrentProject(null)
    projectForm.resetFields()
    setProjectDrawerVisible(true)
  }

  const handleEditProject = (project: ApiProject) => {
    setCurrentProject(project)
    projectForm.setFieldsValue(project)
    setProjectDrawerVisible(true)
  }

  const handleSaveProject = async () => {
    try {
      const values = await projectForm.validateFields()
      if (currentProject) {
        await axios.put(`${API_BASE_URL}/api/v2/automation/projects/${currentProject.id}`, values)
        message.success('项目已更新')
      } else {
        await axios.post(`${API_BASE_URL}/api/v2/automation/projects`, values)
        message.success('项目已创建')
      }
      setProjectDrawerVisible(false)
      loadProjects()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '操作失败')
    }
  }

  const handleDeleteProject = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v2/automation/projects/${id}`)
      message.success('项目已删除')
      loadProjects()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  // ==================== 测试集合操作 ====================

  const handleCreateSuite = (projectId: number) => {
    setCurrentProject(projects.find(p => p.id === projectId) || null)
    setCurrentSuite(null)
    suiteForm.resetFields()
    setSuiteDrawerVisible(true)
  }

  const handleEditSuite = (suite: ApiTestSuite) => {
    setCurrentSuite(suite)
    suiteForm.setFieldsValue(suite)
    setSuiteDrawerVisible(true)
  }

  const handleSaveSuite = async () => {
    try {
      const values = await suiteForm.validateFields()
      if (currentSuite) {
        await axios.put(`${API_BASE_URL}/api/v2/automation/suites/${currentSuite.id}`, values)
        message.success('测试集合已更新')
      } else {
        await axios.post(`${API_BASE_URL}/api/v2/automation/suites`, {
          ...values,
          project_id: currentProject?.id
        })
        message.success('测试集合已创建')
      }
      setSuiteDrawerVisible(false)
      if (currentProject) {
        loadSuites(currentProject.id)
      } else {
        loadProjects()
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '操作失败')
    }
  }

  const handleDeleteSuite = async (suite: ApiTestSuite) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v2/automation/suites/${suite.id}`)
      message.success('测试集合已删除')
      loadSuites(suite.project_id)
      loadProjects()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  // ==================== 测试用例操作 ====================

  const handleCreateCase = (suite: ApiTestSuite) => {
    setCurrentSuite(suite)
    setCurrentCase(null)
    caseForm.resetFields()
    caseForm.setFieldsValue({ method: 'GET', body_type: 'json' })
    setCaseDrawerVisible(true)
  }

  const handleEditCase = (c: ApiTestCase, suite: ApiTestSuite) => {
    setCurrentSuite(suite)
    setCurrentCase(c)
    caseForm.setFieldsValue({
      ...c,
      headers: JSON.stringify(c.headers || {}, null, 2),
      params: JSON.stringify(c.params || {}, null, 2),
      body: JSON.stringify(c.body || {}, null, 2)
    })
    setCaseDrawerVisible(true)
  }

  const handleSaveCase = async () => {
    try {
      const values = await caseForm.validateFields()
      const data = {
        ...values,
        suite_id: currentSuite?.id,
        headers: JSON.parse(values.headers || '{}'),
        params: JSON.parse(values.params || '{}'),
        body: values.body ? JSON.parse(values.body) : null
      }

      if (currentCase) {
        await axios.put(`${API_BASE_URL}/api/v2/automation/cases/${currentCase.id}`, data)
        message.success('测试用例已更新')
      } else {
        await axios.post(`${API_BASE_URL}/api/v2/automation/cases`, data)
        message.success('测试用例已创建')
      }
      setCaseDrawerVisible(false)
      if (currentSuite) {
        loadSuites(currentSuite.project_id)
      }
    } catch (e: any) {
      if (e.message?.includes('JSON')) {
        message.error('JSON 格式错误')
      } else {
        message.error(e.response?.data?.detail || '操作失败')
      }
    }
  }

  const handleDeleteCase = async (c: ApiTestCase) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v2/automation/cases/${c.id}`)
      message.success('测试用例已删除')
      if (currentSuite) {
        loadSuites(currentSuite.project_id)
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  // ==================== 执行操作 ====================

  const handleExecuteCase = async (c: ApiTestCase) => {
    try {
      message.loading({ content: '执行中...', key: 'exec' })
      const res = await axios.post(`${API_BASE_URL}/api/v2/automation/cases/${c.id}/execute`)
      setExecuteResult(res.data)
      setCurrentCase(c)
      setResultDrawerVisible(true)
      message.success({ content: '执行完成', key: 'exec' })
      // 刷新数据
      loadProjects()
    } catch (e: any) {
      message.error({ content: e.response?.data?.detail || '执行失败', key: 'exec' })
    }
  }

  const handleExecuteSuite = async (suite: ApiTestSuite) => {
    try {
      message.loading({ content: '执行测试集合...', key: 'exec' })
      await axios.post(`${API_BASE_URL}/api/v2/automation/suites/${suite.id}/execute`)
      message.success({ content: '测试集合执行完成', key: 'exec' })
      loadSuites(suite.project_id)
      loadProjects()
    } catch (e: any) {
      message.error({ content: e.response?.data?.detail || '执行失败', key: 'exec' })
    }
  }

  // ==================== AI 功能 ====================

  const handleAIGenerate = (suite: ApiTestSuite) => {
    Modal.confirm({
      title: 'AI 生成测试用例',
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label>接口 URL：</label>
            <Input id="ai-url" placeholder="https://api.example.com/users" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>请求方法：</label>
            <Select id="ai-method" defaultValue="GET" style={{ width: '100%' }}>
              <Option value="GET">GET</Option>
              <Option value="POST">POST</Option>
              <Option value="PUT">PUT</Option>
              <Option value="DELETE">DELETE</Option>
            </Select>
          </div>
          <div>
            <label>生成数量：</label>
            <Select id="ai-count" defaultValue={3} style={{ width: '100%' }}>
              <Option value={1}>1 个</Option>
              <Option value={3}>3 个</Option>
              <Option value={5}>5 个</Option>
            </Select>
          </div>
        </div>
      ),
      onOk: async () => {
        const url = (document.getElementById('ai-url') as HTMLInputElement)?.value
        const method = (document.getElementById('ai-method') as HTMLSelectElement)?.value
        const count = parseInt((document.getElementById('ai-count') as HTMLSelectElement)?.value || '3')

        if (!url) {
          message.error('请输入接口 URL')
          return
        }

        try {
          message.loading({ content: 'AI 生成中...', key: 'ai' })
          const res = await axios.post(`${API_BASE_URL}/api/v2/automation/ai/generate-cases`, {
            url, method, count
          })

          for (const caseData of res.data.cases) {
            await axios.post(`${API_BASE_URL}/api/v2/automation/cases`, {
              ...caseData,
              suite_id: suite.id
            })
          }

          message.success({ content: `已生成 ${res.data.cases.length} 个用例`, key: 'ai' })
          loadSuites(suite.project_id)
        } catch (e: any) {
          message.error({ content: e.response?.data?.detail || 'AI 生成失败', key: 'ai' })
        }
      }
    })
  }

  // ==================== 渲染 ====================

  const methodColors: Record<string, string> = {
    GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red', PATCH: 'cyan'
  }

  const renderStatus = (status?: string) => {
    if (!status) return <Tag>未执行</Tag>
    switch (status) {
      case 'success': return <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>
      case 'failed': return <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>
      default: return <Tag color="warning" icon={<ExclamationCircleOutlined />}>错误</Tag>
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}><ApiOutlined /> 接口自动化</h1>
            <p style={{ margin: 0, color: '#999' }}>项目 {'>'} 测试集合 {'>'} 测试用例</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
            新建项目
          </Button>
        </div>
      </Card>

      {/* 项目列表 */}
      {projects.length === 0 ? (
        <Card>
          <Empty description="暂无项目，点击上方按钮创建" />
        </Card>
      ) : (
        projects.map(project => {
          const suites = projectSuites[project.id] || []
          return (
            <Card 
              key={project.id} 
              title={
                <Space>
                  <ProjectOutlined />
                  <span>{project.name}</span>
                  <Badge count={project.case_count} style={{ backgroundColor: '#1890ff' }} />
                </Space>
              }
              extra={
                <Space>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => handleCreateSuite(project.id)}>
                    新建测试集合
                  </Button>
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEditProject(project)} />
                  <Popconfirm title="确定删除项目？" onConfirm={() => handleDeleteProject(project.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              {project.description && (
                <p style={{ color: '#999', marginTop: -8, marginBottom: 16 }}>{project.description}</p>
              )}

              {suites.length === 0 ? (
                <Empty description="暂无测试集合" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Collapse defaultActiveKey={suites.map(s => `suite-${s.id}`)}>
                  {suites.map(suite => (
                    <Panel
                      key={`suite-${suite.id}`}
                      header={
                        <Space>
                          <FolderOutlined />
                          <span>{suite.name}</span>
                          <Badge count={suite.case_count} style={{ backgroundColor: '#52c41a' }} />
                        </Space>
                      }
                      extra={
                        <Space onClick={e => e.stopPropagation()}>
                          <Button 
                            size="small" 
                            type="primary" 
                            ghost
                            icon={<PlayCircleOutlined />}
                            onClick={() => handleExecuteSuite(suite)}
                          >
                            执行全部
                          </Button>
                          <Button 
                            size="small" 
                            icon={<RobotOutlined />}
                            onClick={() => handleAIGenerate(suite)}
                          >
                            AI生成
                          </Button>
                          <Button size="small" icon={<PlusOutlined />} onClick={() => handleCreateCase(suite)}>
                            新建用例
                          </Button>
                          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditSuite(suite)} />
                          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteSuite(suite)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      }
                    >
                      {suite.cases && suite.cases.length > 0 ? (
                        <Table
                          size="small"
                          dataSource={suite.cases}
                          rowKey="id"
                          pagination={false}
                          columns={[
                            {
                              title: '用例名称',
                              dataIndex: 'name',
                              render: (name, record: ApiTestCase) => (
                                <Space>
                                  <Tag color={methodColors[record.method]}>{record.method}</Tag>
                                  {name}
                                </Space>
                              )
                            },
                            { title: 'URL', dataIndex: 'url', ellipsis: true },
                            { title: '状态', dataIndex: 'last_status', width: 80, render: renderStatus },
                            { title: '耗时', dataIndex: 'last_response_time', width: 70, render: (t: number) => t ? `${t}ms` : '-' },
                            {
                              title: '操作',
                              width: 150,
                              render: (_: any, record: ApiTestCase) => (
                                <Space>
                                  <Button size="small" type="primary" ghost icon={<PlayCircleOutlined />} onClick={() => handleExecuteCase(record)} />
                                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEditCase(record, suite)} />
                                  <Popconfirm title="删除？" onConfirm={() => handleDeleteCase(record)}>
                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                </Space>
                              )
                            }
                          ]}
                        />
                      ) : (
                        <Empty description="暂无测试用例" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </Panel>
                  ))}
                </Collapse>
              )}
            </Card>
          )
        })
      )}

      {/* 项目抽屉 */}
      <Drawer
        title={currentProject ? '编辑项目' : '新建项目'}
        open={projectDrawerVisible}
        onClose={() => setProjectDrawerVisible(false)}
        width={400}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setProjectDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveProject}>保存</Button>
          </Space>
        }
      >
        <Form form={projectForm} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="输入项目名称" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <TextArea rows={3} placeholder="输入项目描述" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 测试集合抽屉 */}
      <Drawer
        title={currentSuite ? '编辑测试集合' : '新建测试集合'}
        open={suiteDrawerVisible}
        onClose={() => setSuiteDrawerVisible(false)}
        width={400}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setSuiteDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveSuite}>保存</Button>
          </Space>
        }
      >
        <Form form={suiteForm} layout="vertical">
          <Form.Item name="name" label="集合名称" rules={[{ required: true }]}>
            <Input placeholder="输入集合名称" />
          </Form.Item>
          <Form.Item name="description" label="集合描述">
            <TextArea rows={3} placeholder="输入集合描述" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 测试用例抽屉 */}
      <Drawer
        title={currentCase ? '编辑测试用例' : '新建测试用例'}
        open={caseDrawerVisible}
        onClose={() => setCaseDrawerVisible(false)}
        width={600}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setCaseDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveCase}>保存</Button>
          </Space>
        }
      >
        <Form form={caseForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="用例名称" rules={[{ required: true }]}>
                <Input placeholder="输入用例名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="method" label="请求方法" rules={[{ required: true }]}>
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                  <Option value="PATCH">PATCH</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="url" label="请求地址" rules={[{ required: true }]}>
            <Input placeholder="https://api.example.com/users" />
          </Form.Item>
          
          <Form.Item name="description" label="用例描述">
            <TextArea rows={2} placeholder="输入用例描述" />
          </Form.Item>

          <Tabs items={[
            {
              key: 'headers',
              label: 'Headers',
              children: (
                <Form.Item name="headers" noStyle>
                  <TextArea rows={6} placeholder='{"Content-Type": "application/json"}' style={{ fontFamily: 'monospace' }} />
                </Form.Item>
              )
            },
            {
              key: 'params',
              label: 'Params',
              children: (
                <Form.Item name="params" noStyle>
                  <TextArea rows={6} placeholder='{"page": 1, "size": 10}' style={{ fontFamily: 'monospace' }} />
                </Form.Item>
              )
            },
            {
              key: 'body',
              label: 'Body',
              children: (
                <>
                  <Form.Item name="body_type" label="Body 类型">
                    <Select style={{ width: 150 }}>
                      <Option value="json">JSON</Option>
                      <Option value="form">Form Data</Option>
                      <Option value="raw">Raw</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="body" noStyle>
                    <TextArea rows={8} placeholder='{"name": "test"}' style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                </>
              )
            }
          ]} />
        </Form>
      </Drawer>

      {/* 执行结果抽屉 */}
      <Drawer
        title="执行结果"
        open={resultDrawerVisible}
        onClose={() => setResultDrawerVisible(false)}
        width={600}
      >
        {executeResult && (
          <div>
            <Alert 
              type={executeResult.success ? 'success' : 'error'}
              message={executeResult.success ? '请求成功' : '请求失败'}
              description={
                <Space split={<Divider type="vertical" />}>
                  <span>状态码: <Tag color={executeResult.status_code < 400 ? 'success' : 'error'}>{executeResult.status_code}</Tag></span>
                  <span>耗时: <Tag color="blue">{executeResult.duration_ms}ms</Tag></span>
                </Space>
              }
              style={{ marginBottom: 16 }}
            />

            {executeResult.error && (
              <Alert type="error" message="错误信息" description={executeResult.error} style={{ marginBottom: 16 }} />
            )}

            <Tabs items={[
              {
                key: 'body',
                label: '响应体',
                children: (
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
                    {JSON.stringify(executeResult.response_body, null, 2)}
                  </pre>
                )
              }
            ]} />
          </div>
        )}
      </Drawer>
    </div>
  )
}
