/**
 * 测试集管理 - 接口自动化子系统
 */
import { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, message, Modal, Form, Input, Select, Progress } from 'antd'
import { PlusOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons'
import { testSuiteApi } from '../../services/api'

export default function ApiTestSuites() {
  const [suites, setSuites] = useState([])
  const [loading, setLoading] = useState(false)

  const columns = [
    { title: '测试集名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '用例数', dataIndex: 'case_count', key: 'case_count',
      render: (c) => <Tag color="blue">{c || 0}</Tag>
    },
    { title: '最近执行', dataIndex: 'last_run', key: 'last_run' },
    { title: '通过率', dataIndex: 'pass_rate', key: 'pass_rate',
      render: (p) => p ? <Progress percent={parseFloat(p)} size="small" /> : '-'
    },
    { title: '操作', key: 'action', width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<PlayCircleOutlined />}>执行</Button>
          <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      )
    }
  ]

  const loadSuites = async () => {
    setLoading(true)
    try {
      const res = await testSuiteApi.list()
      setSuites(res.data || [])
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSuites() }, [])

  return (
    <div>
      <Card title={<><FolderOutlined /> 测试集</>} extra={
        <Button type="primary" icon={<PlusOutlined />}>新建测试集</Button>
      }>
        <Table columns={columns} dataSource={suites} loading={loading} rowKey="id" />
      </Card>
    </div>
  )
}
