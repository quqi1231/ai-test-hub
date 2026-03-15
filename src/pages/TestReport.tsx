/**
 * 测试报告页面
 * 生成和导出测试报告
 */
import { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Tag, Modal, Form, Select, DatePicker, 
  message, Tabs, Row, Col, Statistic, Progress, Timeline, Badge
} from 'antd'
import { 
  FileTextOutlined, DownloadOutlined, EyeOutlined, 
  PieChartOutlined, LineChartOutlined, BarChartOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

const { RangePicker } = DatePicker

interface TestReport {
  id: number
  name: string
  project_name: string
  test_suite_name: string
  total: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  pass_rate: number
  duration: number
  executor: string
  environment: string
  created_at: string
}

interface ReportDetail {
  id: number
  case_name: string
  method: string
  url: string
  status: 'passed' | 'failed' | 'blocked' | 'skipped'
  duration: number
  error_message?: string
}

export default function TestReport() {
  const [reports, setReports] = useState<TestReport[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('list')
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null)
  const [reportDetails, setReportDetails] = useState<ReportDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadReports()
  }, [])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const loadReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/results/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      })
      if (response.ok) {
        const data = await response.json()
        // Transform results to reports format
        const reportsData = Array.isArray(data) ? data : data.items || []
        const transformed: TestReport[] = reportsData.map((r: any) => ({
          id: r.id,
          name: `测试报告 #${r.id}`,
          project_name: '默认项目',
          test_suite_name: '测试集',
          total: 1,
          passed: r.status === 'success' ? 1 : 0,
          failed: r.status === 'failed' ? 1 : 0,
          blocked: 0,
          skipped: 0,
          pass_rate: r.status === 'success' ? 100 : 0,
          duration: r.duration_ms || 0,
          executor: r.executor || 'unknown',
          environment: '测试环境',
          created_at: r.executed_at || new Date().toISOString()
        }))
        setReports(transformed)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  // 查看报告详情
  const handleViewReport = async (report: TestReport) => {
    setSelectedReport(report)
    setDetailLoading(true)
    setReportModalVisible(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/results/case/${report.id}`, {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        const details: ReportDetail[] = Array.isArray(data) ? data.map((r: any) => ({
          id: r.id,
          case_name: `用例 #${r.case_id}`,
          method: 'POST',
          url: '/api/test',
          status: r.status === 'success' ? 'passed' : 'failed',
          duration: r.duration_ms || 0,
          error_message: r.error_message
        })) : []
        setReportDetails(details)
      }
    } catch (error) {
      console.error('Failed to load report details:', error)
      setReportDetails([])
    } finally {
      setDetailLoading(false)
    }
  }

  // 导出报告
  const handleExport = (report: TestReport, format: 'html' | 'pdf' | 'excel') => {
    message.success(`正在导出 ${format.toUpperCase()} 报告...`)
  }

  const columns = [
    { 
      title: '报告名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (text: string, record: TestReport) => (
        <Space>
          <FileTextOutlined />
          <a onClick={() => handleViewReport(record)}>{text}</a>
        </Space>
      )
    },
    { title: '项目', dataIndex: 'project_name', key: 'project_name' },
    { title: '测试集', dataIndex: 'test_suite_name', key: 'test_suite_name' },
    { title: '总数', dataIndex: 'total', key: 'total' },
    { title: '通过', dataIndex: 'passed', key: 'passed',
      render: (val: number) => <Tag color="green">{val}</Tag>
    },
    { title: '失败', dataIndex: 'failed', key: 'failed',
      render: (val: number) => <Tag color="red">{val}</Tag>
    },
    { title: '通过率', dataIndex: 'pass_rate', key: 'pass_rate',
      render: (val: number) => (
        <Progress percent={val} size="small" status={val >= 80 ? 'success' : 'exception'} />
      )
    },
    { title: '耗时(ms)', dataIndex: 'duration', key: 'duration' },
    { title: '执行人', dataIndex: 'executor', key: 'executor' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TestReport) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewReport(record)}>查看</Button>
          <Button type="link" icon={<DownloadOutlined />} onClick={() => handleExport(record, 'html')}>导出</Button>
        </Space>
      )
    }
  ]

  const detailColumns = [
    { title: '用例名称', dataIndex: 'case_name', key: 'case_name' },
    { title: '方法', dataIndex: 'method', key: 'method',
      render: (method: string) => <Tag color="blue">{method}</Tag>
    },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string) => (
        <Tag color={status === 'passed' ? 'green' : 'red'}>
          {status === 'passed' ? '通过' : '失败'}
        </Tag>
      )
    },
    { title: '耗时(ms)', dataIndex: 'duration', key: 'duration' },
    { title: '错误信息', dataIndex: 'error_message', key: 'error_message',
      render: (msg: string) => msg ? <span style={{ color: 'red' }}>{msg}</span> : '-'
    }
  ]

  // 统计卡片数据
  const stats = {
    total: reports.length,
    passed: reports.filter(r => r.pass_rate >= 80).length,
    failed: reports.filter(r => r.pass_rate < 80).length,
    avgPassRate: reports.length > 0 
      ? Math.round(reports.reduce((acc, r) => acc + r.pass_rate, 0) / reports.length) 
      : 0
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>测试报告</h1>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总报告数" value={stats.total} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="通过" value={stats.passed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="失败" value={stats.failed} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均通过率" value={stats.avgPassRate} suffix="%" prefix={<PieChartOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table 
          columns={columns} 
          dataSource={reports} 
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={`报告详情 - ${selectedReport?.name}`}
        open={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
        footer={null}
        width={900}
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="总数" value={selectedReport?.total || 0} /></Col>
          <Col span={6}><Statistic title="通过" value={selectedReport?.passed || 0} valueStyle={{ color: '#52c41a' }} /></Col>
          <Col span={6}><Statistic title="失败" value={selectedReport?.failed || 0} valueStyle={{ color: '#ff4d4f' }} /></Col>
          <Col span={6}><Statistic title="通过率" value={selectedReport?.pass_rate || 0} suffix="%" /></Col>
        </Row>
        <Table 
          columns={detailColumns} 
          dataSource={reportDetails} 
          rowKey="id"
          loading={detailLoading}
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  )
}
