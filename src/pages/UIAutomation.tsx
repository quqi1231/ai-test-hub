/**
 * UI 自动化测试页面
 * 支持浏览器录制、元素定位、自动化测试
 */
import { useState } from 'react'
import { Card, Button, Table, Tag, Space, Modal, Form, Input, Select, message, Tabs, Steps, Row, Col, Divider } from 'antd'
import { 
  PlayCircleOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  ReloadOutlined,
  DesktopOutlined,
  RobotOutlined,
  EyeOutlined,
  CodeOutlined
} from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

// 浏览器类型
const BROWSER_TYPES = [
  { value: 'chromium', label: 'Chrome', icon: '🌐' },
  { value: 'firefox', label: 'Firefox', icon: '🦊' },
  { value: 'webkit', label: 'Safari', icon: '🧭' },
]

// 元素定位方式
const LOCATOR_TYPES = [
  { value: 'css', label: 'CSS Selector' },
  { value: 'xpath', label: 'XPath' },
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Name' },
  { value: 'linkText', label: 'Link Text' },
  { value: 'partialLinkText', label: 'Partial Link' },
  { value: 'className', label: 'Class Name' },
  { value: 'tagName', label: 'Tag Name' },
]

// 操作类型
const ACTION_TYPES = [
  { value: 'click', label: '点击', icon: '👆' },
  { value: 'input', label: '输入文本', icon: '⌨️' },
  { value: 'select', label: '下拉选择', icon: '📋' },
  { value: 'hover', label: '鼠标悬停', icon: '🖱️' },
  { value: 'scroll', label: '滚动', icon: '📜' },
  { value: 'screenshot', label: '截图', icon: '📸' },
  { value: 'wait', label: '等待', icon: '⏱️' },
  { value: 'assert', label: '断言', icon: '✅' },
  { value: 'javascript', label: '执行 JS', icon: '⚡' },
]

interface TestStep {
  id: number
  action: string
  locatorType: string
  locatorValue: string
  value?: string
  timeout?: number
}

interface UICase {
  id: number
  name: string
  description: string
  url: string
  browser: string
  steps: TestStep[]
  status: 'draft' | 'ready' | 'running' | 'passed' | 'failed'
  created_at: string
}

export default function UIAutomation() {
  const [cases, setCases] = useState<UICase[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [recordModalVisible, setRecordModalVisible] = useState(false)
  const [selectedCase, setSelectedCase] = useState<UICase | null>(null)
  const [activeTab, setActiveTab] = useState('cases')
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)

  // 加载用例列表
  const loadCases = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/ui-cases/`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setCases(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load cases:', error)
    } finally {
      setLoading(false)
    }
  }

  // 保存用例
  const handleSave = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      const url = selectedCase 
        ? `${API_BASE_URL}/api/ui-cases/${selectedCase.id}`
        : `${API_BASE_URL}/api/ui-cases/`
      const method = selectedCase ? 'PUT' : 'POST'
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      
      message.success(selectedCase ? '用例已更新' : '用例已创建')
      setModalVisible(false)
      form.resetFields()
      setSelectedCase(null)
      loadCases()
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 执行用例
  const handleRun = async (id: number) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/ui-cases/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      message.success(`执行完成: ${result.status}`)
      loadCases()
    } catch (error: any) {
      message.error(`执行失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 录制相关状态
  const [recording, setRecording] = useState(false)

  const columns = [
    { 
      title: '用例名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (name: string, record: UICase) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{record.url}</span>
        </Space>
      )
    },
    { 
      title: '浏览器', 
      dataIndex: 'browser', 
      key: 'browser',
      width: 100,
      render: (browser: string) => {
        const browserInfo = BROWSER_TYPES.find(b => b.value === browser)
        return <span>{browserInfo?.icon} {browserInfo?.label || browser}</span>
      }
    },
    { 
      title: '步骤数', 
      dataIndex: 'steps', 
      key: 'steps',
      width: 80,
      render: (steps: TestStep[]) => <Tag>{steps?.length || 0} 步</Tag>
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          draft: 'default', ready: 'blue', running: 'processing', passed: 'success', failed: 'error'
        }
        const labelMap: Record<string, string> = {
          draft: '草稿', ready: '就绪', running: '运行中', passed: '通过', failed: '失败'
        }
        return <Tag color={colorMap[status]}>{labelMap[status] || status}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: UICase) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setSelectedCase(record)
            form.setFieldsValue(record)
            setModalVisible(true)
          }}>编辑</Button>
          <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleRun(record.id)}>执行</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>
          🎨 UI 自动化测试
          <Tag color="purple" style={{ marginLeft: 8 }}>Beta</Tag>
        </h1>
        <Space>
          <Button icon={<DesktopOutlined />} onClick={() => setRecordModalVisible(true)}>
            录制测试
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setSelectedCase(null)
            form.resetFields()
            setModalVisible(true)
          }}>
            新建用例
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'cases',
          label: <span><CodeOutlined /> 用例管理</span>,
          children: (
            <Card>
              <Table
                columns={columns}
                dataSource={cases}
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '暂无用例，请新建或录制' }}
              />
            </Card>
          )
        },
        {
          key: 'records',
          label: <span><EyeOutlined /> 录制记录</span>,
          children: (
            <Card>
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                <DesktopOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>点击「录制测试」开始录制您的操作</p>
                <p style={{ fontSize: 12 }}>支持 Chrome、Firefox、Safari 浏览器</p>
              </div>
            </Card>
          )
        }
      ]} />

      {/* 新建/编辑用例 Modal */}
      <Modal
        title={selectedCase ? '编辑用例' : '新建用例'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setSelectedCase(null)
        }}
        onOk={handleSave}
        confirmLoading={loading}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="用例名称" rules={[{ required: true }]}>
            <Input placeholder="例如：登录流程测试" />
          </Form.Item>
          
          <Form.Item name="description" label="用例描述">
            <Input.TextArea rows={2} placeholder="描述这个测试用例的目的" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="url" label="测试 URL" rules={[{ required: true }]}>
                <Input placeholder="https://example.com/login" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="browser" label="浏览器" initialValue="chromium">
                <Select>
                  {BROWSER_TYPES.map(b => (
                    <Select.Option key={b.value} value={b.value}>
                      {b.icon} {b.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>测试步骤</Divider>
          
          <Steps current={currentStep} size="small" style={{ marginBottom: 16 }}>
            {['选择元素', '添加操作', '设置断言'].map((title, idx) => (
              <Steps.Step key={idx} title={title} />
            ))}
          </Steps>

          <Form.Item label="测试步骤">
            <div style={{ border: '1px dashed #d9d9d9', padding: 16, borderRadius: 8 }}>
              <p style={{ color: '#999', textAlign: 'center' }}>
                点击「添加步骤」或使用录制功能自动生成步骤
              </p>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 录制 Modal */}
      <Modal
        title={<><DesktopOutlined /> 录制测试</>}
        open={recordModalVisible}
        onCancel={() => setRecordModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: 'center', padding: 20 }}>
          <DesktopOutlined style={{ fontSize: 64, color: recording ? '#52c41a' : '#d9d9d9' }} />
          <h3>{recording ? '正在录制...' : '准备录制'}</h3>
          <p style={{ color: '#666' }}>
            {recording 
              ? '在浏览器中的操作将被记录为测试步骤' 
              : '点击开始后，请在浏览器中进行操作，操作将被自动记录'}
          </p>
          <Space style={{ marginTop: 20 }}>
            <Button 
              type={recording ? 'default' : 'primary'}
              size="large"
              icon={recording ? <RobotOutlined /> : <DesktopOutlined />}
              onClick={() => setRecording(!recording)}
              danger={recording}
            >
              {recording ? '停止录制' : '开始录制'}
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  )
}
