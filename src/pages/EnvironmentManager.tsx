import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, message, Popconfirm, Select, Card, Row, Col, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Environment, environmentApi } from '../services/api'

const { TextArea } = Input
const { Text } = Typography

interface Props {
  projectId: number
  onSelect?: (env: Environment) => void
}

export default function EnvironmentManager({ projectId, onSelect }: Props) {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isVarModalOpen, setIsVarModalOpen] = useState(false)
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
  const [form] = Form.useForm()
  const [varForm] = Form.useForm()
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null)

  // 加载环境列表
  const loadEnvironments = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await environmentApi.list(projectId)
      setEnvironments(res.data)
    } catch (error) {
      message.error('加载环境失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEnvironments()
  }, [projectId])

  // 创建/更新环境
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = { ...values, project_id: projectId }
      
      if (editingEnv?.id) {
        await environmentApi.update(editingEnv.id, data)
        message.success('环境更新成功')
      } else {
        await environmentApi.create(data)
        message.success('环境创建成功')
      }
      
      setIsModalOpen(false)
      form.resetFields()
      setEditingEnv(null)
      loadEnvironments()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  // 删除环境
  const handleDelete = async (id: number) => {
    try {
      await environmentApi.delete(id)
      message.success('删除成功')
      loadEnvironments()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 激活环境
  const handleActivate = async (id: number) => {
    try {
      await environmentApi.activate(id)
      message.success('激活成功')
      loadEnvironments()
    } catch (error) {
      message.error('激活失败')
    }
  }

  // 编辑环境
  const handleEdit = (env: Environment) => {
    setEditingEnv(env)
    form.setFieldsValue(env)
    setIsModalOpen(true)
  }

  // 添加变量
  const handleAddVariable = async () => {
    try {
      const values = await varForm.validateFields()
      if (!selectedEnv) return
      
      const variables = { ...selectedEnv.variables, [values.key]: values.value }
      await environmentApi.update(selectedEnv.id, { variables })
      message.success('变量添加成功')
      setIsVarModalOpen(false)
      varForm.resetFields()
      loadEnvironments()
    } catch (error) {
      message.error('添加失败')
    }
  }

  // 打开变量编辑
  const openVarModal = (env: Environment) => {
    setSelectedEnv(env)
    setIsVarModalOpen(true)
  }

  const columns = [
    { 
      title: '状态', 
      dataIndex: 'is_active', 
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        isActive ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} /> : null
      )
    },
    { title: '环境名称', dataIndex: 'name', key: 'name' },
    { title: 'Base URL', dataIndex: 'base_url', key: 'base_url', ellipsis: true },
    { title: '变量数量', key: 'var_count', 
      render: (_: any, record: Environment) => (
        <Tag color="blue">{Object.keys(record.variables || {}).length} 个</Tag>
      )
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: Environment) => (
        <Space>
          {!record.is_active && (
            <Button type="link" size="small" onClick={() => handleActivate(record.id!)}>
              激活
            </Button>
          )}
          <Button type="link" size="small" onClick={() => openVarModal(record)}>
            变量
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id!)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card 
        title={<><EnvironmentOutlined /> 环境管理</>} 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingEnv(null)
            form.resetFields()
            setIsModalOpen(true)
          }}>
            新增环境
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={environments} 
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 环境编辑弹窗 */}
      <Modal
        title={editingEnv ? '编辑环境' : '新增环境'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false)
          form.resetFields()
          setEditingEnv(null)
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="环境名称" rules={[{ required: true, message: '请输入环境名称' }]}>
            <Input placeholder="如：开发环境、测试环境、生产环境" />
          </Form.Item>
          <Form.Item name="base_url" label="Base URL" rules={[{ required: true, message: '请输入基础URL' }]}>
            <Input placeholder="如：https://api.example.com" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="环境描述（可选）" />
          </Form.Item>
          <Form.Item name="headers" label="全局请求头">
            <TextArea 
              rows={3} 
              placeholder='{"Authorization": "Bearer xxx", "Content-Type": "application/json"}'
            />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked">
            <Input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 变量编辑弹窗 */}
      <Modal
        title={`编辑变量 - ${selectedEnv?.name}`}
        open={isVarModalOpen}
        onOk={handleAddVariable}
        onCancel={() => {
          setIsVarModalOpen(false)
          varForm.resetFields()
        }}
      >
        <Form form={varForm} layout="vertical">
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="key" label="变量名" rules={[{ required: true }]}>
                <Input placeholder="如：baseUrl" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="value" label="值" rules={[{ required: true }]}>
                <Input placeholder="变量值" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        
        {selectedEnv?.variables && Object.keys(selectedEnv.variables).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>已添加的变量：</Text>
            <div style={{ marginTop: 8 }}>
              {Object.entries(selectedEnv.variables).map(([key, value]) => (
                <Tag key={key} color="blue" style={{ marginBottom: 4 }}>
                  {key}: {String(value)}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
