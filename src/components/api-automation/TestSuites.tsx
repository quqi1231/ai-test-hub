/**
 * 测试集管理组件
 */
import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Tag, message, Transfer, Drawer } from 'antd'
import { PlusOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

const API_BASE_URL = 'http://localhost:8000'

interface TestSuite {
  id: number
  project_id: number
  name: string
  description?: string
  environment?: Record<string, string>
  concurrency: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

interface InterfaceData {
  id: number
  name: string
  method: string
  url: string
}

interface TestSuiteItem {
  id: number
  suite_id: number
  interface_id: number
  order_index: number
  assertions?: any[]
  var_extracts?: Record<string, string>
  delay_ms: number
  enabled: boolean
}

export default function TestSuites({ projectId = 1 }: { projectId?: number }) {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [interfaces, setInterfaces] = useState<InterfaceData[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [suiteItems, setSuiteItems] = useState<TestSuiteItem[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    loadSuites()
    loadInterfaces()
  }, [projectId])

  const loadSuites = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-suites/?project_id=${projectId}`)
      if (res.status === 401) {
        message.error('请先登录')
        setSuites([])
        return
      }
      const data = await res.json()
      setSuites(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load suites:', error)
      setSuites([])
    }
  }

  const loadInterfaces = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/interfaces/?project_id=${projectId}&limit=1000`)
      if (res.status === 401) {
        message.error('请先登录')
        setInterfaces([])
        return
      }
      const data = await res.json()
      setInterfaces(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load interfaces:', error)
      setInterfaces([])
    }
  }

  const loadSuiteDetail = async (suiteId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-suites/${suiteId}`)
      const data = await res.json()
      setSuiteItems(data.items || [])
    } catch (error) {
      console.error('Failed to load suite detail:', error)
    }
  }

  const handleCreate = () => {
    setEditingSuite(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = async (record: TestSuite) => {
    setEditingSuite(record)
    form.setFieldsValue(record)
    await loadSuiteDetail(record.id)
    setModalVisible(true)
  }

  const handleView = async (record: TestSuite) => {
    setEditingSuite(record)
    await loadSuiteDetail(record.id)
    setDetailVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      let env = {}
      if (values.environment) {
        try {
          env = JSON.parse(values.environment)
        } catch {
          message.warning('环境变量格式不是有效JSON，已忽略')
        }
      }
      const payload = {
        ...values,
        project_id: projectId,
        environment: env
      }

      if (editingSuite) {
        await fetch(`${API_BASE_URL}/api/test-suites/${editingSuite.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        message.success('测试集已更新')
      } else {
        await fetch(`${API_BASE_URL}/api/test-suites/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        message.success('测试集已创建')
      }

      setModalVisible(false)
      loadSuites()
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/test-suites/${id}`, { method: 'DELETE' })
      message.success('测试集已删除')
      loadSuites()
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`)
    }
  }

  const handleExecute = async (suiteId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-suites/${suiteId}/execute`, {
        method: 'POST'
      })
      const result = await res.json()
      
      if (result.failed === 0) {
        message.success(`执行完成: ${result.success}/${result.total} 全部通过!`)
      } else {
        message.warning(`执行完成: ${result.success}/${result.total} 通过, ${result.failed} 失败`)
      }
      
      console.log('Execution result:', result)
    } catch (error: any) {
      message.error(`执行失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '并发', dataIndex: 'concurrency', key: 'concurrency', width: 80 },
    { 
      title: '状态', 
      dataIndex: 'is_enabled', 
      key: 'is_enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
      )
    },
    { 
      title: '操作', 
      key: 'action',
      width: 200,
      render: (_: any, record: TestSuite) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<PlayCircleOutlined />} 
            onClick={() => handleExecute(record.id)}
            loading={loading}
          >
            执行
          </Button>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建测试集
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={suites}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无测试集，请创建一个' }}
      />

      {/* 创建/编辑 Modal */}
      <Modal
        title={editingSuite ? '编辑测试集' : '创建测试集'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="请输入测试集名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="测试集描述" />
          </Form.Item>
          <Form.Item name="concurrency" label="并发数" initialValue={1}>
            <Select>
              <Option value={1}>1 (串行)</Option>
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
              <Option value={50}>50</Option>
            </Select>
          </Form.Item>
          <Form.Item name="environment" label="环境变量 (JSON)">
            <TextArea 
              rows={3} 
              placeholder='{"base_url": "https://api.example.com", "token": "xxx"}' 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情 Drawer */}
      <Drawer
        title={`测试集详情 - ${editingSuite?.name}`}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={500}
      >
        {suiteItems.length > 0 ? (
          <Table
            columns={[
              { title: '序号', dataIndex: 'order_index', key: 'order_index', width: 60 },
              { title: '接口ID', dataIndex: 'interface_id', key: 'interface_id', width: 80 },
              { 
                title: '延迟(ms)', 
                dataIndex: 'delay_ms', 
                key: 'delay_ms',
                width: 100 
              },
              {
                title: '启用',
                dataIndex: 'enabled',
                key: 'enabled',
                render: (enabled: boolean) => enabled ? '是' : '否'
              }
            ]}
            dataSource={suiteItems}
            rowKey="id"
            size="small"
            pagination={false}
          />
        ) : (
          <p style={{ color: '#999' }}>暂无接口，请编辑测试集添加接口</p>
        )}
      </Drawer>
    </div>
  )
}
