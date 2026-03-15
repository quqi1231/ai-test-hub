/**
 * 安全自动化测试页面
 * 支持漏洞扫描、渗透测试、安全合规检查
 */
import { useState } from 'react'
import { Card, Button, Table, Tag, Space, Modal, Form, Input, Select, InputNumber, message, Tabs, Row, Col, Progress, Timeline, Checkbox, Alert, Statistic } from 'antd'
import { 
  PlayCircleOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  SecurityScanOutlined,
  BugOutlined,
  LockOutlined,
  SafetyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AlertOutlined
} from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

// 扫描类型
const SCAN_TYPES = [
  { value: 'xss', label: 'XSS 漏洞', icon: '🔴', severity: 'high', desc: '跨站脚本攻击' },
  { value: 'sql_injection', label: 'SQL 注入', icon: '🔴', severity: 'high', desc: '数据库注入攻击' },
  { value: 'csrf', label: 'CSRF', icon: '🟠', severity: 'medium', desc: '跨站请求伪造' },
  { value: 'ssrf', label: 'SSRF', icon: '🔴', severity: 'high', desc: '服务端请求伪造' },
  { value: 'info_disclosure', label: '信息泄露', icon: '🟡', severity: 'low', desc: '敏感信息暴露' },
  { value: 'auth_bypass', label: '认证绕过', icon: '🔴', severity: 'critical', desc: '身份验证绕过' },
  { value: 'headers', label: '安全头检测', icon: '🟢', severity: 'low', desc: 'HTTP 安全头检查' },
  { value: 'dependency', label: '依赖漏洞', icon: '🟠', severity: 'medium', desc: '第三方组件漏洞' },
]

// 漏洞等级
const SEVERITY_LEVELS = {
  critical: { color: 'red', label: '严重', priority: 1 },
  high: { color: 'orange', label: '高危', priority: 2 },
  medium: { color: 'gold', label: '中危', priority: 3 },
  low: { color: 'blue', label: '低危', priority: 4 },
  info: { color: 'default', label: '信息', priority: 5 },
}

interface SecurityConfig {
  id: number
  name: string
  target_url: string
  scan_types: string[]
  options: {
    concurrent: number
    timeout: number
    follow_redirects: boolean
    auth?: {
      type: string
      username: string
      password: string
    }
  }
  created_at: string
}

interface Vulnerability {
  id: number
  config_id: number
  vuln_type: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  url: string
  description: string
  proof: string
  remediation: string
  status: 'open' | 'fixed' | 'accepted'
}

interface SecurityReport {
  id: number
  config_name: string
  scan_type: string
  target_url: string
  start_time: string
  end_time: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
}

export default function SecurityAutomation() {
  const [configs, setConfigs] = useState<SecurityConfig[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [reports, setReports] = useState<SecurityReport[]>([])
  const [loading, setLoading] = useState(false)
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('configs')
  const [runningScan, setRunningScan] = useState<number | null>(null)
  const [selectedScanTypes, setSelectedScanTypes] = useState<string[]>(['xss', 'sql_injection', 'headers'])
  const [form] = Form.useForm()

  // 加载配置
  const loadConfigs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/security-configs/`, {
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
      await fetch(`${API_BASE_URL}/api/security-configs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          scan_types: selectedScanTypes
        })
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

  // 运行扫描
  const handleRunScan = async (configId: number) => {
    setRunningScan(configId)
    try {
      const response = await fetch(`${API_BASE_URL}/api/security-configs/${configId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      message.success(`扫描已启动: ${result.scan_id}`)
    } catch (error: any) {
      message.error(`启动失败: ${error.message}`)
    } finally {
      setRunningScan(null)
    }
  }

  const configColumns = [
    { 
      title: '配置名称', 
      dataIndex: 'name', 
      key: 'name',
    },
    { 
      title: '目标地址', 
      dataIndex: 'target_url', 
      key: 'target_url',
      render: (url: string) => <code style={{ fontSize: 12 }}>{url}</code>
    },
    { 
      title: '扫描类型', 
      dataIndex: 'scan_types', 
      key: 'scan_types',
      render: (types: string[]) => (
        <Space wrap>
          {types.map(t => {
            const info = SCAN_TYPES.find(s => s.value === t)
            return <Tag key={t} color={info?.severity === 'critical' ? 'red' : info?.severity === 'high' ? 'orange' : 'default'}>
              {info?.icon} {info?.label || t}
            </Tag>
          })}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: SecurityConfig) => (
        <Space>
          <Button 
            type="primary" 
            danger
            icon={<SecurityScanOutlined />} 
            onClick={() => handleRunScan(record.id)}
            loading={runningScan === record.id}
          >
            扫描
          </Button>
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      )
    }
  ]

  const vulnColumns = [
    { 
      title: '漏洞类型', 
      dataIndex: 'vuln_type', 
      key: 'vuln_type',
      render: (type: string) => {
        const info = SCAN_TYPES.find(s => s.value === type)
        return <span>{info?.icon} {info?.label || type}</span>
      }
    },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { 
      title: '等级', 
      dataIndex: 'severity', 
      key: 'severity',
      width: 100,
      render: (sev: string) => {
        const level = SEVERITY_LEVELS[sev as keyof typeof SEVERITY_LEVELS]
        return <Tag color={level?.color}>{level?.label || sev}</Tag>
      }
    },
    { title: '目标', dataIndex: 'url', key: 'url', ellipsis: true, render: (u: string) => <code style={{ fontSize: 11 }}>{u}</code> },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Vulnerability) => (
        <Tag color={record.status === 'fixed' ? 'green' : record.status === 'accepted' ? 'default' : 'red'}>
          {record.status === 'fixed' ? '已修复' : record.status === 'accepted' ? '已接受' : '待处理'}
        </Tag>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>
          🛡️ 安全自动化测试
          <Tag color="red" style={{ marginLeft: 8 }}>Beta</Tag>
        </h1>
        <Space>
          <Button icon={<BugOutlined />}>
            漏洞库
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setConfigModalVisible(true)}>
            新建配置
          </Button>
        </Space>
      </div>

      {/* 安全概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总漏洞数" value={vulnerabilities.length} prefix={<BugOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="严重漏洞" 
              value={vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length} 
              prefix={<WarningOutlined />} 
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已修复" value={vulnerabilities.filter(v => v.status === 'fixed').length} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待处理" value={vulnerabilities.filter(v => v.status === 'open').length} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'configs',
          label: <span><SecurityScanOutlined /> 扫描配置</span>,
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
          key: 'vulns',
          label: <span><BugOutlined /> 漏洞列表</span>,
          children: (
            <Card>
              <Table
                columns={vulnColumns}
                dataSource={vulnerabilities}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '暂无漏洞，请先运行扫描' }}
              />
            </Card>
          )
        },
        {
          key: 'reports',
          label: <span><SafetyOutlined /> 扫描报告</span>,
          children: (
            <Card>
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                <SecurityScanOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>扫描完成后生成安全报告</p>
              </div>
            </Card>
          )
        }
      ]} />

      {/* 新建配置 Modal */}
      <Modal
        title="新建安全扫描配置"
        open={configModalVisible}
        onCancel={() => {
          setConfigModalVisible(false)
          form.resetFields()
        }}
        onOk={handleSaveConfig}
        confirmLoading={loading}
        width={700}
      >
        <Alert
          message="安全提示"
          description="请确保您有目标系统的授权扫描许可，未授权的扫描可能违法。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}>
            <Input placeholder="例如：生产环境安全扫描" />
          </Form.Item>

          <Form.Item name="target_url" label="目标 URL" rules={[{ required: true }]}>
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item label="扫描类型">
            <Checkbox.Group value={selectedScanTypes} onChange={setSelectedScanTypes as any}>
              <Row gutter={[8, 8]}>
                {SCAN_TYPES.map(t => (
                  <Col span={12} key={t.value}>
                    <Checkbox value={t.value}>
                      <Space>
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                        <Tag color={t.severity === 'critical' ? 'red' : t.severity === 'high' ? 'orange' : 'default'} style={{ marginLeft: 8 }}>
                          {t.severity}
                        </Tag>
                      </Space>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['options', 'concurrent']} label="并发数" initialValue={5}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['options', 'timeout']} label="超时时间(ms)" initialValue={10000}>
                <InputNumber min={1000} max={60000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name={['options', 'follow_redirects']} valuePropName="checked">
            <Checkbox>跟随重定向</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
