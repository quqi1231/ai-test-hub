import { useState } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

interface Project {
  key: string
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  createdAt: string
}

const initialData: Project[] = [
  {
    key: '1',
    id: 'P001',
    name: '电商平台测试',
    description: '负责电商前后端测试',
    status: 'active',
    createdAt: '2026-03-01',
  },
  {
    key: '2',
    id: 'P002',
    name: '接口自动化',
    description: 'API 接口自动化测试',
    status: 'active',
    createdAt: '2026-03-05',
  },
]

export default function ProjectList() {
  const [data] = useState<Project[]>(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const columns = [
    { title: '项目ID', dataIndex: 'id', key: 'id' },
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '进行中' : '已停止'}
        </Tag>
      )
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      ),
    },
  ]

  const handleOk = () => {
    form.validateFields().then(() => {
      message.success('项目创建成功！')
      setIsModalOpen(false)
      form.resetFields()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>项目管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          新建项目
        </Button>
      </div>

      <Table columns={columns} dataSource={data} pagination={{ pageSize: 10 }} />

      <Modal
        title="新建项目"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
