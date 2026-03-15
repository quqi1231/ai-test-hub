import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Space, Progress, Spin, message } from 'antd'
import { 
  ProjectOutlined, 
  CheckCircleOutlined, 
  ApiOutlined, 
  RiseOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleFilled,
  CloseCircleFilled
} from '@ant-design/icons'
import { getAuthHeaders } from '../utils/auth'

const API_BASE_URL = 'http://localhost:8000'

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts'

const COLORS = ['#52c41a', '#ff4d4f', '#faad14']

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    projectCount: 0,
    interfaceCount: 0,
    suiteCount: 0,
    executionCount: 0
  })
  const [recentExecutions, setRecentExecutions] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [passRateData, setPassRateData] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const authHeaders = getAuthHeaders()
      
      // 加载项目统计
      const projectRes = await fetch(`${API_BASE_URL}/api/projects/`, { headers: authHeaders })
      const projects = projectRes.ok ? await projectRes.json() : []
      
      // 加载接口统计
      const interfaceRes = await fetch(`${API_BASE_URL}/api/interfaces/`, { headers: authHeaders })
      const interfaces = interfaceRes.ok ? await interfaceRes.json() : []
      
      // 加载测试集
      const suiteRes = await fetch(`${API_BASE_URL}/api/test-suites/?project_id=1`, { headers: authHeaders })
      const suites = suiteRes.ok ? await suiteRes.json() : []
      
      setStats({
        projectCount: projects.length || 1,
        interfaceCount: interfaces.length,
        suiteCount: suites.length,
        executionCount: Math.floor(Math.random() * 100) + 50 // 模拟数据
      })

      // 模拟最近执行数据
      const mockExecutions = [
        { id: 1, name: '用户管理测试', status: 'pass', success: 10, fail: 0, total: 10, time: '12:30' },
        { id: 2, name: '登录接口测试', status: 'pass', success: 8, fail: 2, total: 10, time: '11:45' },
        { id: 3, name: '订单流程测试', status: 'fail', success: 6, fail: 4, total: 10, time: '10:20' },
        { id: 4, name: '支付接口测试', status: 'pass', success: 10, fail: 0, total: 10, time: '09:15' },
        { id: 5, name: '商品查询测试', status: 'pass', success: 9, fail: 1, total: 10, time: '昨天' },
      ]
      setRecentExecutions(mockExecutions)

      // 趋势数据
      const mockTrend = [
        { date: '周一', pass: 85, fail: 15 },
        { date: '周二', pass: 92, fail: 8 },
        { date: '周三', pass: 78, fail: 22 },
        { date: '周四', pass: 95, fail: 5 },
        { date: '周五', pass: 88, fail: 12 },
        { date: '周六', pass: 90, fail: 10 },
        { date: '今天', pass: 94, fail: 6 },
      ]
      setTrendData(mockTrend)

      // 通过率饼图数据
      const mockPassRate = [
        { name: '通过', value: 85 },
        { name: '失败', value: 10 },
        { name: '未运行', value: 5 },
      ]
      setPassRateData(mockPassRate)

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const executionColumns = [
    { title: '测试集', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'status', key: 'status', 
      render: (status: string) => (
        <Tag color={status === 'pass' ? 'green' : 'red'}>
          {status === 'pass' ? '通过' : '失败'}
        </Tag>
      )
    },
    { title: '结果', key: 'result',
      render: (_: any, record: any) => (
        <Progress percent={record.success * 10} size="small" strokeColor={record.fail > 0 ? '#ff4d4f' : '#52c41a'} />
      )
    },
    { title: '时间', dataIndex: 'time', key: 'time', width: 80 },
  ]

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>📊 数据仪表盘</h1>
        
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card hoverable style={{ borderRadius: 8 }}>
              <Statistic
                title="项目总数"
                value={stats.projectCount}
                prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable style={{ borderRadius: 8 }}>
              <Statistic
                title="接口配置"
                value={stats.interfaceCount}
                prefix={<ApiOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable style={{ borderRadius: 8 }}>
              <Statistic
                title="测试集"
                value={stats.suiteCount}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable style={{ borderRadius: 8 }}>
              <Statistic
                title="总执行次数"
                value={stats.executionCount}
                prefix={<RiseOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表区域 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {/* 趋势图 */}
          <Col span={14}>
            <Card title="📈 执行趋势 (最近7天)" style={{ borderRadius: 8 }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  />
                  <Legend />
                  <Line type="monotone" name="通过数" dataKey="pass" stroke="#52c41a" strokeWidth={2} dot={{ fill: '#52c41a' }} />
                  <Line type="monotone" name="失败数" dataKey="fail" stroke="#ff4d4f" strokeWidth={2} dot={{ fill: '#ff4d4f' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* 通过率饼图 */}
          <Col span={10}>
            <Card title="🎯 测试通过率" style={{ borderRadius: 8 }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={passRateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {passRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 最近执行记录 */}
        <Row gutter={16}>
          <Col span={24}>
            <Card title="📋 最近执行记录" style={{ borderRadius: 8 }}>
              <Table 
                dataSource={recentExecutions} 
                columns={executionColumns} 
                rowKey="id" 
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  )
}
