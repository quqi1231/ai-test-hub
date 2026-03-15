/**
 * Mock服务管理页面
 * 创建和管理Mock接口
 */
import { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Tag, Modal, Form, Input, Select, 
  message, Tabs, Switch, Badge
} from 'antd'
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleFilled, 
  ApiOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  PlayCircleOutlined, CopyOutlined
} from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

const { TextArea } = Input

interface MockService {
  id: number
  name: string
  path: string
  method: string
  project_id: number
  response_status: number
  response_body: object
  response_headers: object
  delay_ms: number
  is_enabled: boolean
  description: string
  created_at: string
}

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
const STATUS_OPTIONS = [200, 201, 204, 400, 401, 403, 404, 500]

export default function MockService() {
  const [services, setServices] = useState<MockService[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editService, setEditService] = useState<MockService | null>(null)
  const [form] = Form.useForm()
  const [testResult, setTestResult] = useState<any>(null)
  const [testModalVisible, setTestModalVisible] = useState(false)

  useEffect(() => {
    loadServices()
  }, [])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const loadServices = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/mock-services/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      })
      if (response.ok) {
        const data = await response.json()
        setServices(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load mock services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }

        // Parse response body if it's a string
        let response_body = values.response_body
        if (typeof response_body === 'string') {
          try {
            response_body = JSON.parse(response_body)
          } catch {
            response_body = {}
          }
        }

        const data = { ...values, response_body }

        if (editService) {
          await fetch(`${API_BASE_URL}/api/mock-services/${editService.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
          })
          message.success('更新成功')
        } else {
          await fetch(`${API_BASE_URL}/api/mock-services/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
          })
          message.success('创建成功')
        }
        setModalVisible(false)
        form.resetFields()
        setEditService(null)
        loadServices()
      } catch (error) {
        message.error('操作失败')
      }
    })
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/mock-services/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      message.success('删除成功')
      loadServices()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleTest = async (record: MockService) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mock-services/${record.id}/test`, {
        headers: getAuthHeaders()
      })
      const result = await response.json()
      setTestResult(result)
      setTestModalVisible(true)
    } catch (error) {
      message.error('测试失败')
    }
  }

  const handleEdit = (record: MockService) => {
    setEditService(record)
    form.setFieldsValue({
      ...record,
      response_body: typeof record.response_body === 'string' 
        ? record.response_body 
        : JSON.stringify(record.response_body, null, 2)
    })
    setModalVisible(true)
  }

  const handleCopyUrl = (record: MockService) => {
    const url = `http://localhost:8000${record.path}`
    navigator.clipboard.writeText(url)
    message.success('URL已复制到剪贴板')
  }

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'green',
      POST: 'blue',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'purple'
    }
    return colors[method] || 'default'
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { 
      title: '方法', 
      dataIndex: 'method', 
      key: 'method',
      render: (method: string) => <Tag color={getMethodColor(method)}>{method}</Tag>
    },
    { title: '路径', dataIndex: 'path', key: 'path' },
    { 
      title: '状态', 
      dataIndex: 'response_status', 
      key: 'response_status',
      render: (status: number) => (
        <Tag color={status < 400 ? 'green' : 'red'}>{status}</Tag>
      )
    },
    { 
      title: '延迟', 
      dataIndex: 'delay_ms', 
      key: 'delay_ms',
      render: (ms: number) => ms > 0 ? `${ms}ms` : '-'
    },
    { 
      title: '状态', 
      dataIndex: 'is_enabled', 
      key: 'is_enabled',
      render: (enabled: boolean) => (
        <Badge status={enabled ? 'success' : 'default'} text={enabled ? '启用' : '禁用'} />
      )
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MockService) => (
        <Space>
          <Button type="link" icon={<PlayCircleOutlined />} onClick={() => handleTest(record)}>测试</Button>
          <Button type="link" icon={<CopyOutlined />} onClick={() => handleCopyUrl(record)}>复制</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>Mock服务</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditService(null); form.resetFields(); setModalVisible(true) }}>
          新建Mock服务
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={services} 
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editService ? "编辑Mock服务" : "新建Mock服务"}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditService(null) }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如：用户详情" />
          </Form.Item>
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}>
            <Input type="number" placeholder="1" />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="method" label="方法" rules={[{ required: true }]} style={{ width: 120 }}>
              <Select options={METHOD_OPTIONS.map(m => ({ value: m, label: m }))} />
            </Form.Item>
            <Form.Item name="path" label="路径" rules={[{ required: true }]} style={{ width: 'calc(100% - 136px)' }}>
              <Input placeholder="/api/user/:id" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }}>
            <Form.Item name="response_status" label="响应状态" rules={[{ required: true }]} style={{ width: 120 }}>
              <Select options={STATUS_OPTIONS.map(s => ({ value: s, label: s.toString() }))} />
            </Form.Item>
            <Form.Item name="delay_ms" label="延迟(ms)" style={{ width: 120 }}>
              <Input type="number" placeholder="0" />
            </Form.Item>
            <Form.Item name="is_enabled" label="启用" valuePropName="checked" style={{ width: 80 }}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="response_body" label="响应体" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder='{"code": 0, "message": "success", "data": {}}' />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="Mock服务描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="测试结果"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={null}
        width={600}
      >
        {testResult && (
          <div>
            <p><strong>状态码：</strong>{testResult.status}</p>
            <p><strong>延迟：</strong>{testResult.delay_ms}ms</p>
            <p><strong>响应体：</strong></p>
            <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
              {JSON.stringify(testResult.body, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  )
}
