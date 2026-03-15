/**
 * 报告中心 - 接口自动化子系统
 */
import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Tag, Button, Space, Select, DatePicker, Statistic, Progress } from 'antd'
import { FileTextOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const { RangePicker } = DatePicker

interface ReportRecord {
  id: number
  name: string
  suite_name: string
  environment: string
  total: number
  passed: number
  failed: number
  pass_rate: string
  duration: string
  executed_at: string
  status: 'success' | 'failed'
}

const COLORS = ['#52c41a', '#ff4d4f', '#faad14']

export default function ApiReports() {
  const [reports, setReports] = useState<ReportRecord[]>([
    { id: 1, name: '登录接口测试报告', suite_name: '登录测试集', environment: '测试环境', total: 9, passed: 8, failed: 1, pass_rate: '88.9%', duration: '2.3s', executed_at: '2026-03-15 11:30:00', status: 'success' },
    { id: 2, name: '用户管理测试报告', suite_name: '用户管理', environment: '测试环境', total: 12, passed: 12, failed: 0, pass_rate: '100%', duration: '1.8s', executed_at: '2026-03-15 11:25:00', status: 'success' },
    { id: 3, name: '订单接口测试报告', suite_name: '订单管理', environment: '生产环境', total: 8, passed: 5, failed: 3, pass_rate: '62.5%', duration: '3.1s', executed_at: '2026-03-15 11:20:00', status: 'failed' },
    { id: 4, name: '支付接口测试报告', suite_name: '支付模块', environment: '测试环境', total: 15, passed: 14, failed: 1, pass_rate: '93.3%', duration: '4.2s', executed_at: '2026-03-15 10:30:00', status: 'success' },
  ])

  const [summary, setSummary] = useState({
    total_runs: 156,
    pass_rate: 92.3,
    avg_duration: '2.5s',
    total_cases: 1234
  })

  const columns = [
    { title: '报告名称', dataIndex: 'name', key: 'name' },
    { title: '测试集', dataIndex: 'suite_name', key: 'suite_name' },
    { title: '环境', dataIndex: 'environment', key: 'environment',
      render: (e) => <Tag>{e}</Tag>
    },
    { title: '通过/总数', key: 'result',
      render: (_, r) => (
        <span>
          <Tag color="green">{r.passed}</Tag> / <Tag color="red">{r.failed}</Tag>
        </span>
      )
    },
    { title: '通过率', dataIndex: 'pass_rate', key: 'pass_rate',
      render: (p) => {
        const val = parseFloat(p)
        return <Progress percent={val} size="small" status={val >= 80 ? 'success' : 'exception'} />
      }
    },
    { title: '耗时', dataIndex: 'duration', key: 'duration' },
    { title: '执行时间', dataIndex: 'executed_at', key: 'executed_at' },
    { title: '操作', key: 'action', width: 150,
      render: () => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}>查看</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />}>下载</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      )
    }
  ]

  // 模拟趋势数据
  const trendData = [
    { date: '03-09', pass_rate: 85, count: 12 },
    { date: '03-10', pass_rate: 88, count: 15 },
    { date: '03-11', pass_rate: 82, count: 11 },
    { date: '03-12', pass_rate: 90, count: 18 },
    { date: '03-13', pass_rate: 87, count: 14 },
    { date: '03-14', pass_rate: 92, count: 16 },
    { date: '03-15', pass_rate: 89, count: 13 },
  ]

  const pieData = [
    { name: '通过', value: 8 },
    { name: '失败', value: 1 },
    { name: '跳过', value: 1 },
  ]

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总执行次数" value={summary.total_runs} prefix={<BarChartOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均通过率" value={summary.pass_rate} suffix="%" prefix={<PieChartOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均耗时" value={summary.avg_duration} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总用例数" value={summary.total_cases} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="通过率趋势">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="pass_rate" stroke="#52c41a" name="通过率(%)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="最近一次执行">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="测试报告列表" style={{ marginTop: 16 }} extra={
        <Space>
          <RangePicker />
          <Select defaultValue="all" style={{ width: 120 }}>
            <Select.Option value="all">全部</Select.Option>
            <Select.Option value="success">成功</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
          </Select>
        </Space>
      }>
        <Table columns={columns} dataSource={reports} rowKey="id" pagination={{ pageSize: 5 }} />
      </Card>
    </div>
  )
}
