/**
 * 环境管理 - 接口自动化子系统
 */
import { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, message, Modal, Form, Input, Row, Col, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { environmentApi } from '../../services/api'

type Environment = {
  id?: number
  project_id: number
  name: string
  base_url?: string
  variables?: Record<string, any>
  headers?: Record<string, string>
  description?: string
  is_active?: boolean
}

export default function ApiEnvironments() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
  const [form] = Form.useForm()
  const projectId = 1 // TODO: 从上下文获取

  const columns = [
    { title: '状态', key: 'status', width: 60,
      render: (_, r) => r.is_active ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} /> : null
    },
    { title: '环境名称', dataIndex: 'name', key: 'name' },
    { title: 'Base URL', dataIndex: 'base_url', key: 'base_url', ellipsis: true },
    { title: '变量', key: 'vars',
      render: (_, r) => <Tag color="blue">{Object.keys(r.variables || {}).length} 个</Tag>
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '操作', key: 'action', width: 200,
      render: (_, record) => (
        <Space>
          {!record.is_active && <Button type="link" size="small" onClick={() => handleActivate(record.id!)}>激活</Button>}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id!)}>删除</Button>
        </Space>
      )
    }
  ]

  const loadEnvironments = async () => {
    setLoading(true)
    try {
      const res = await environmentApi.list(projectId)
      setEnvironments(res.data)
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEnvironments() }, [projectId])

  const handleEdit = (env: Environment) => {
    setEditingEnv(env)
    form.setFieldsValue(env)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await environmentApi.delete(id)
    message.success('删除成功')
    loadEnvironments()
  }

  const handleActivate = async (id: number) => {
    await environmentApi.activate(id)
    message.success('激活成功')
    loadEnvironments()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (editingEnv?.id) {
      await environmentApi.update(editingEnv.id, values)
    } else {
      await environmentApi.create({ ...values, project_id: projectId })
    }
    message.success('保存成功')
    setModalOpen(false)
    form.resetFields()
    loadEnvironments()
  }

  return (
    <div>
      <Card title={<><EnvironmentOutlined /> 环境管理</>} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEnv(null); form.resetFields(); setModalOpen(true) }}>
          新增环境
        </Button>
      }>
        <Table columns={columns} dataSource={environments} loading={loading} rowKey="id" />
      </Card>

      <Modal title={editingEnv ? '编辑环境' : '新增环境'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="环境名称" rules={[{ required: true }]}>
            <Input placeholder="如：开发环境、测试环境" />
          </Form.Item>
          <Form.Item name="base_url" label="Base URL" rules={[{ required: true }]}>
            <Input placeholder="如：https://api.example.com" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
