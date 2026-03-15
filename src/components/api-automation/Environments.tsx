/**
 * 环境管理组件
 */
import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Space, Tag, message, Drawer } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

interface Environment {
  id: number
  project_id: number
  name: string
  base_url?: string
  variables?: Record<string, string>
  headers?: Record<string, string>
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function Environments({ projectId = 1 }: { projectId?: number }) {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadEnvironments()
  }, [projectId])

  const loadEnvironments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/environments/?project_id=${projectId}`)
      if (res.status === 401) {
        message.error('请先登录')
        setEnvironments([])
        setLoading(false)
        return
      }
      const data = await res.json()
      setEnvironments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load environments:', error)
      setEnvironments([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingEnv(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Environment) => {
    setEditingEnv(record)
    form.setFieldsValue({
      ...record,
      variables: JSON.stringify(record.variables || {}, null, 2),
      headers: JSON.stringify(record.headers || {}, null, 2)
    })
    setModalVisible(true)
  }

  const handleView = (record: Environment) => {
    setEditingEnv(record)
    setDetailVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        project_id: projectId,
        variables: values.variables ? JSON.parse(values.variables) : {},
        headers: values.headers ? JSON.parse(values.headers) : {}
      }

      if (editingEnv) {
        await fetch(`${API_BASE_URL}/api/environments/${editingEnv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        message.success('环境已更新')
      } else {
        await fetch(`${API_BASE_URL}/api/environments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        message.success('环境已创建')
      }

      setModalVisible(false)
      loadEnvironments()
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/environments/${id}`, { method: 'DELETE' })
      message.success('环境已删除')
      loadEnvironments()
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`)
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/environments/${id}/activate`, { method: 'POST' })
      message.success('环境已激活')
      loadEnvironments()
    } catch (error: any) {
      message.error(`激活失败: ${error.message}`)
    }
  }

  const columns = [
    { 
      title: '状态', 
      dataIndex: 'is_active', 
      key: 'is_active',
      width: 80,
      render: (active: boolean) => active ? <Tag color="green">激活</Tag> : null
    },
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Base URL', dataIndex: 'base_url', key: 'base_url', ellipsis: true },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { 
      title: '操作', 
      key: 'action',
      width: 200,
      render: (_: any, record: Environment) => (
        <Space>
          {!record.is_active && (
            <Button 
              size="small" 
              icon={<CheckCircleOutlined />} 
              onClick={() => handleActivate(record.id)}
            >
              激活
            </Button>
          )}
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
          创建环境
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={environments}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无环境，请创建一个' }}
      />

      {/* 创建/编辑 Modal */}
      <Modal
        title={editingEnv ? '编辑环境' : '创建环境'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="环境名称" rules={[{ required: true }]}>
            <Input placeholder="如：开发环境、测试环境、生产环境" />
          </Form.Item>
          <Form.Item name="base_url" label="Base URL">
            <Input placeholder="https://api.example.com" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="环境描述" />
          </Form.Item>
          <Form.Item name="variables" label="环境变量 (JSON)">
            <Input.TextArea 
              rows={3} 
              placeholder='{"token": "xxx", "app_id": "xxx"}' 
            />
          </Form.Item>
          <Form.Item name="headers" label="全局请求头 (JSON)">
            <Input.TextArea 
              rows={3} 
              placeholder='{"Authorization": "Bearer xxx"}' 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情 Drawer */}
      <Drawer
        title={`环境详情 - ${editingEnv?.name}`}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={500}
      >
        {editingEnv && (
          <div>
            <p><strong>名称：</strong>{editingEnv.name}</p>
            <p><strong>Base URL：</strong>{editingEnv.base_url || '-'}</p>
            <p><strong>描述：</strong>{editingEnv.description || '-'}</p>
            <p><strong>状态：</strong>{editingEnv.is_active ? <Tag color="green">已激活</Tag> : '未激活'}</p>
            <p><strong>环境变量：</strong></p>
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              {JSON.stringify(editingEnv.variables || {}, null, 2)}
            </pre>
            <p><strong>请求头：</strong></p>
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              {JSON.stringify(editingEnv.headers || {}, null, 2)}
            </pre>
          </div>
        )}
      </Drawer>
    </div>
  )
}
