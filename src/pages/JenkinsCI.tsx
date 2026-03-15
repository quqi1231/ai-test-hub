import { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Table, Tag, Space, Modal, message, Row, Col, Timeline } from 'antd'
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, SyncOutlined, HistoryOutlined } from '@ant-design/icons'
const API_BASE_URL = 'http://localhost:8000'

interface JenkinsConfig {
  id: number
  url: string
  username: string
  name: string
  created_at: string
}

interface JenkinsJob {
  name: string
  url: string
  color: string
  lastBuild?: {
    number: number
    result: string
  }
}

interface BuildInfo {
  number: number
  result: string | null
  timestamp: string
  duration: number
  url: string
  building: boolean
}

export default function JenkinsCI() {
  const [configs, setConfigs] = useState<JenkinsConfig[]>([])
  const [jobs, setJobs] = useState<JenkinsJob[]>([])
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [triggerModalVisible, setTriggerModalVisible] = useState(false)
  const [buildHistoryVisible, setBuildHistoryVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<JenkinsConfig | null>(null)
  const [selectedJob, setSelectedJob] = useState<string>('')
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null)
  const [buildHistory, setBuildHistory] = useState<any[]>([])
  const [form] = Form.useForm()
  const [triggerForm] = Form.useForm()

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jenkins/configs`)
      const data = await response.json()
      setConfigs(data)
    } catch (error) {
      console.error('Failed to load configs:', error)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  // 测试连接
  const testConnection = async (configId: number) => {
    setTestingConnection(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/jenkins/configs/${configId}/test`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        message.success(`连接成功! Jenkins版本: ${data.version}`)
      } else {
        message.error(`连接失败: ${data.error}`)
      }
    } catch (error: any) {
      message.error(`连接失败: ${error.message}`)
    } finally {
      setTestingConnection(false)
    }
  }

  // 保存配置
  const handleSaveConfig = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      await fetch(`${API_BASE_URL}/api/jenkins/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      message.success('配置保存成功')
      setConfigModalVisible(false)
      form.resetFields()
      loadConfigs()
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 删除配置
  const handleDeleteConfig = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/jenkins/configs/${id}`, { method: 'DELETE' })
      message.success('配置已删除')
      loadConfigs()
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`)
    }
  }

  // 加载 Jobs
  const loadJobs = async (config: JenkinsConfig) => {
    setSelectedConfig(config)
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/jenkins/configs/${config.id}/jobs`)
      const data = await response.json()
      setJobs(data)
    } catch (error: any) {
      message.error(`加载任务失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 触发构建
  const handleTriggerBuild = async () => {
    if (!selectedConfig) return
    const values = await triggerForm.validateFields()
    setLoading(true)
    try {
      await fetch(`${API_BASE_URL}/api/jenkins/configs/${selectedConfig.id}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_name: values.job_name,
          parameters: values.parameters ? JSON.parse(values.parameters) : {}
        })
      })
      message.success('构建已触发!')
      setTriggerModalVisible(false)
      triggerForm.resetFields()
    } catch (error: any) {
      message.error(`触发失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 查看构建信息
  const handleViewBuild = async (jobName: string) => {
    if (!selectedConfig) return
    setSelectedJob(jobName)
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/jenkins/configs/${selectedConfig.id}/build/${jobName}`)
      const data = await response.json()
      setBuildInfo(data)
    } catch (error: any) {
      message.error(`获取构建信息失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 查看构建历史
  const handleViewHistory = async (jobName: string) => {
    if (!selectedConfig) return
    setSelectedJob(jobName)
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/jenkins/configs/${selectedConfig.id}/builds/${jobName}?limit=10`)
      const data = await response.json()
      setBuildHistory(data)
      setBuildHistoryVisible(true)
    } catch (error: any) {
      message.error(`获取历史失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const configColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Jenkins URL', dataIndex: 'url', key: 'url' },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: JenkinsConfig) => (
        <Space>
          <Button type="link" size="small" onClick={() => loadJobs(record)}>查看任务</Button>
          <Button type="link" size="small" icon={<SyncOutlined />} onClick={() => testConnection(record.id)} loading={testingConnection}>测试</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteConfig(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  const jobColumns = [
    { 
      title: '任务名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (name: string, record: JenkinsJob) => (
        <Space>
          <span>{name}</span>
          {record.lastBuild && (
            <Tag color={record.lastBuild.result === 'SUCCESS' ? 'green' : record.lastBuild.result === 'FAILURE' ? 'red' : 'orange'}>
              #{record.lastBuild.number}
            </Tag>
          )}
        </Space>
      )
    },
    { 
      title: '上次构建', 
      key: 'lastBuild',
      render: (_: any, record: JenkinsJob) => (
        record.lastBuild ? (
          <Tag color={record.lastBuild.result === 'SUCCESS' ? 'green' : record.lastBuild.result === 'FAILURE' ? 'red' : 'orange'}>
            {record.lastBuild.result || '运行中'}
          </Tag>
        ) : <Tag>无构建</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: JenkinsJob) => (
        <Space>
          <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => {
            setSelectedJob(record.name)
            setTriggerModalVisible(true)
          }}>触发构建</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record.name)}>历史</Button>
          <Button size="small" onClick={() => handleViewBuild(record.name)}>详情</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>
        🔧 Jenkins CI/CD
        <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 16 }} onClick={() => setConfigModalVisible(true)}>
          添加配置
        </Button>
      </h1>

      <Row gutter={16}>
        <Col span={selectedConfig && jobs.length > 0 ? 24 : 24}>
          <Card title="📋 Jenkins 配置" style={{ marginBottom: 16 }}>
            <Table
              columns={configColumns}
              dataSource={configs}
              rowKey="id"
              locale={{ emptyText: '暂无配置，请添加' }}
            />
          </Card>

          {selectedConfig && jobs.length > 0 && (
            <Card title={`📦 ${selectedConfig.name} - 任务列表`}>
              <Table
                columns={jobColumns}
                dataSource={jobs}
                rowKey="name"
                loading={loading}
              />
            </Card>
          )}
        </Col>
      </Row>

      {buildInfo && (
        <Card title={`🏗️ 构建详情 - #${buildInfo.number}`} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <p><strong>状态:</strong> <Tag color={buildInfo.result === 'SUCCESS' ? 'green' : buildInfo.result === 'FAILURE' ? 'red' : 'orange'}>{buildInfo.result || '运行中'}</Tag></p>
              <p><strong>耗时:</strong> {buildInfo.duration}s</p>
              <p><strong>时间:</strong> {buildInfo.timestamp}</p>
            </Col>
            <Col span={16}>
              <Button type="link" href={buildInfo.url} target="_blank">在 Jenkins 中查看</Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* 添加配置 Modal */}
      <Modal
        title="添加 Jenkins 配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={handleSaveConfig}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 生产环境 Jenkins" />
          </Form.Item>
          <Form.Item name="url" label="Jenkins URL" rules={[{ required: true }]}>
            <Input placeholder="例如: https://jenkins.example.com" />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="Jenkins 用户名" />
          </Form.Item>
          <Form.Item name="token" label="API Token" rules={[{ required: true }]}>
            <Input.Password placeholder="Jenkins API Token" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 触发构建 Modal */}
      <Modal
        title="触发 Jenkins 构建"
        open={triggerModalVisible}
        onCancel={() => setTriggerModalVisible(false)}
        onOk={handleTriggerBuild}
        confirmLoading={loading}
      >
        <Form form={triggerForm} layout="vertical">
          <Form.Item name="job_name" label="任务名称" initialValue={selectedJob} rules={[{ required: true }]}>
            <Input placeholder="Jenkins 任务名称" />
          </Form.Item>
          <Form.Item name="parameters" label="构建参数 (JSON)">
            <Input.TextArea rows={3} placeholder='{"BRANCH": "master", "ENV": "prod"}' />
          </Form.Item>
        </Form>
      </Modal>

      {/* 构建历史 Modal */}
      <Modal
        title={`构建历史 - ${selectedJob}`}
        open={buildHistoryVisible}
        onCancel={() => setBuildHistoryVisible(false)}
        footer={null}
        width={600}
      >
        <Timeline
          items={buildHistory.map(build => ({
            color: build.result === 'SUCCESS' ? 'green' : build.result === 'FAILURE' ? 'red' : 'gray',
            children: (
              <div>
                <p>
                  <strong>#{build.number}</strong>
                  <Tag color={build.result === 'SUCCESS' ? 'green' : build.result === 'FAILURE' ? 'red' : 'orange'} style={{ marginLeft: 8 }}>
                    {build.result || '运行中'}
                  </Tag>
                </p>
                <p style={{ fontSize: 12, color: '#999' }}>
                  {build.timestamp} | 耗时: {build.duration}s
                </p>
              </div>
            )
          }))}
        />
      </Modal>
    </div>
  )
}
