/**
 * 性能自动化测试页面
 * 支持压力测试、负载测试、性能监控
 */
import { useState } from 'react'
import { Card, Button, Table, Tag, Space, Modal, Form, Input, Select, message, Tabs, Row, Col, Progress, Statistic, InputNumber, Switch } from 'antd'
import { 
  PlayCircleOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  RocketOutlined
} from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

// 测试类型
const TEST_TYPES = [
  { value: 'load', label: '负载测试', icon: '📦', desc: '模拟多用户并发访问' },
  { value: 'stress', label: '压力测试', icon: '💪', desc: '逐步增加压力直到系统崩溃' },
  { value: 'endurance', label: ' endurance 测试', icon: '⏱️', desc: '长时间持续测试稳定性' },
  { value: 'spike', label: '峰值测试', icon: '📈', desc: '瞬间大幅增加负载' },
  { value: 'volume', label: '容量测试', icon: '💾', desc: '大数据量下的性能' },
]

interface PerfConfig {
  id: number
  name: string
  description: string
  url: string
  test_type: string
  // 负载配置
  virtual_users: number
  duration_seconds: number
  ramp_up_seconds: number
  // 请求配置
  method: string
  headers: Record<string, string>
  body: string
  // 阈值配置
  response_time_threshold_ms: number
  error_rate_threshold_percent: number
  throughput_threshold_rps: number
}

interface PerfResult {
  id: number
  config_name: string
  test_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  start_time: string
  end_time?: string
  // 性能指标
  total_requests: number
  successful_requests: number
  failed_requests: number
  avg_response_time_ms: number
  p50_response_time_ms: number
  p90_response_time_ms: number
  p99_response_time_ms: number
  throughput_rps: number
  error_rate_percent: number
}

interface PerformanceReport {
  id: number
  config_id: number
  config_name: string
  test_type: string
  executed_at: string
  status: 'passed' | 'failed'
  metrics: {
    avg_response_time: number
    p90_response_time: number
    throughput: number
    error_rate: number
  }
}

export default function PerformanceAutomation() {
  const [configs, setConfigs] = useState<PerfConfig[]>([])
  const [results, setResults] = useState<PerfResult[]>([])
  const [reports, setReports] = useState<PerformanceReport[]>([])
  const [loading, setLoading] = useState(false)
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('configs')
  const [runningTest, setRunningTest] = useState<number | null>(null)
  const [form] = Form.useForm()

  // 加载配置
  const loadConfigs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/perf-configs/`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setConfigs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load configs:', error)
    } finally {
      setLoading(false)
    }
  }

  // 保存配置
  const handleSaveConfig = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      await fetch(`${API_BASE_URL}/api/perf-configs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      message.success('配置已保存')
      setConfigModalVisible(false)
      form.resetFields()
      loadConfigs()
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 运行测试
  const handleRunTest = async (configId: number) => {
    setRunningTest(configId)
    try {
      const response = await fetch(`${API_BASE_URL}/api/perf-configs/${configId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      message.success(`测试已启动: ${result.test_id}`)
      // 轮询结果
      pollTestResult(result.test_id)
    } catch (error: any) {
      message.error(`启动失败: ${error.message}`)
    } finally {
      setRunningTest(null)
    }
  }

  // 轮询测试结果
  const pollTestResult = async (testId: number) => {
    // 实现轮询逻辑
  }

  const configColumns = [
    { 
      title: '配置名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (name: string, record: PerfConfig) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{record.url}</span>
        </Space>
      )
    },
    { 
      title: '测试类型', 
      dataIndex: 'test_type', 
      key: 'test_type',
      width: 120,
      render: (type: string) => {
        const info = TEST_TYPES.find(t => t.value === type)
        return <Tag>{info?.icon} {info?.label || type}</Tag>
      }
    },
    { 
      title: '并发用户', 
      dataIndex: 'virtual_users', 
      key: 'virtual_users',
      width: 100,
      render: (v: number) => <Tag color="blue">{v} 用户</Tag>
    },
    { 
      title: '持续时间', 
      dataIndex: 'duration_seconds', 
      key: 'duration_seconds',
      width: 100,
      render: (s: number) => <Tag>{s}秒</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: PerfConfig) => (
        <Space>
          <Button 
            type="primary" 
            icon={<ThunderboltOutlined />} 
            onClick={() => handleRunTest(record.id)}
            loading={runningTest === record.id}
          >
            运行
          </Button>
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>
          ⚡ 性能自动化测试
          <Tag color="orange" style={{ marginLeft: 8 }}>Beta</Tag>
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setConfigModalVisible(true)}>
          新建配置
        </Button>
      </div>

      {/* 实时监控面板 */}
      {runningTest && (
        <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #fff7e6 0%, #fff1b8 100%)' }}>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic 
                title="运行中的测试" 
                value={runningTest} 
                prefix={<ClockCircleOutlined />} 
              />
            </Col>
            <Col span={6}>
              <Statistic title="已完成请求" value={0} />
            </Col>
            <Col span={6}>
              <Statistic title="平均响应时间" value="0ms" />
            </Col>
            <Col span={6}>
              <Statistic title="错误率" value="0%" />
            </Col>
          </Row>
          <Progress percent={0} status="active" />
        </Card>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'configs',
          label: <span><ThunderboltOutlined /> 测试配置</span>,
          children: (
            <Card>
              <Table
                columns={configColumns}
                dataSource={configs}
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '暂无配置，请新建' }}
              />
            </Card>
          )
        },
        {
          key: 'results',
          label: <span><LineChartOutlined /> 测试结果</span>,
          children: (
            <Card>
              <Table
                columns={[
                  { title: '配置', dataIndex: 'config_name', key: 'config_name' },
                  { title: '类型', dataIndex: 'test_type', key: 'test_type' },
                  { title: '状态', dataIndex: 'status', key: 'status',
                    render: (s: string) => (
                      <Tag color={s === 'completed' ? 'green' : s === 'running' ? 'blue' : 'default'}>
                        {s}
                      </Tag>
                    )
                  },
                  { title: '平均响应', dataIndex: 'avg_response_time_ms', key: 'avg_response_time_ms',
                    render: (t: number) => `${t}ms`
                  },
                  { title: 'TPS', dataIndex: 'throughput_rps', key: 'throughput_rps',
                    render: (t: number) => `${t} req/s`
                  },
                  { title: '错误率', dataIndex: 'error_rate_percent', key: 'error_rate_percent',
                    render: (r: number) => <Tag color={r > 5 ? 'red' : 'green'}>{r}%</Tag>
                  },
                ]}
                dataSource={results}
                rowKey="id"
                locale={{ emptyText: '暂无测试结果' }}
              />
            </Card>
          )
        },
        {
          key: 'reports',
          label: <span><DashboardOutlined /> 性能报告</span>,
          children: (
            <Card>
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                <RocketOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>测试完成后自动生成性能报告</p>
              </div>
            </Card>
          )
        }
      ]} />

      {/* 新建配置 Modal */}
      <Modal
        title="新建性能测试配置"
        open={configModalVisible}
        onCancel={() => {
          setConfigModalVisible(false)
          form.resetFields()
        }}
        onOk={handleSaveConfig}
        confirmLoading={loading}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}>
            <Input placeholder="例如：登录接口负载测试" />
          </Form.Item>
          
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="url" label="测试 URL" rules={[{ required: true }]}>
                <Input placeholder="https://api.example.com/login" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="method" label="请求方法" initialValue="POST">
                <Select>
                  <Select.Option value="GET">GET</Select.Option>
                  <Select.Option value="POST">POST</Select.Option>
                  <Select.Option value="PUT">PUT</Select.Option>
                  <Select.Option value="DELETE">DELETE</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="test_type" label="测试类型" rules={[{ required: true }]}>
                <Select>
                  {TEST_TYPES.map(t => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="virtual_users" label="并发用户数" initialValue={10}>
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="duration_seconds" label="持续时间(秒)" initialValue={60}>
                <InputNumber min={10} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ramp_up_seconds" label="预热时间(秒)" initialValue={10}>
                <InputNumber min={0} max={600} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="response_time_threshold_ms" label="响应时间阈值(ms)" initialValue={1000}>
                <InputNumber min={100} max={60000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="error_rate_threshold_percent" label="错误率阈值(%)" initialValue={5}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="body" label="请求 Body (JSON)">
            <Input.TextArea rows={4} placeholder='{"username": "test", "password": "123456"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
