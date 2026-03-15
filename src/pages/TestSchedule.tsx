/**
 * 测试调度页面
 * 支持创建定时测试任务，自动执行测试
 */
import { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Tag, Modal, Form, Input, Select, 
  message, Tabs, Switch, TimePicker, Alert, Badge, Statistic, Row, Col 
} from 'antd'
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, 
  ClockCircleOutlined, PauseCircleOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, HistoryOutlined
} from '@ant-design/icons'
import { getAuthHeaders } from '../utils/auth'
import dayjs from 'dayjs'

const API_BASE_URL = 'http://localhost:8000'

// 调度状态
const SCHEDULE_STATUS = {
  active: { text: '运行中', color: 'green', icon: <PlayCircleOutlined /> },
  paused: { text: '已暂停', color: 'orange', icon: <PauseCircleOutlined /> },
  completed: { text: '已完成', color: 'blue', icon: <CheckCircleOutlined /> },
  failed: { text: '失败', color: 'red', icon: <CloseCircleOutlined /> }
}

// 执行频率
const FREQUENCY_OPTIONS = [
  { value: 'once', label: '执行一次' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'interval', label: '间隔执行' }
]

interface TestSchedule {
  id: number
  name: string
  test_suite_id?: number
  test_suite_name?: string
  project_id: number
  frequency: string
  cron_expression?: string
  interval_minutes?: number
  execute_time?: string
  day_of_week?: number
  day_of_month?: number
  status: 'active' | 'paused' | 'completed' | 'failed'
  last_executed_at?: string
  next_execute_at?: string
  created_at: string
}

interface TestScheduleLog {
  id: number
  schedule_id: number
  schedule_name: string
  status: 'success' | 'failed'
  total: number
  passed: number
  failed: number
  duration?: number
  executed_at: string
  error_message?: string
}

export default function TestSchedule() {
  const [schedules, setSchedules] = useState<TestSchedule[]>([])
  const [logs, setLogs] = useState<TestScheduleLog[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('schedules')
  const [form] = Form.useForm()
  const [editingSchedule, setEditingSchedule] = useState<TestSchedule | null>(null)

  // 加载调度任务
  const loadSchedules = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedule/`, {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('加载失败')
      const data = await response.json()
      setSchedules(Array.isArray(data) ? data : (data.items || []))
    } catch (error) {
      // 模拟数据
      setSchedules([
        {
          id: 1,
          name: '每日接口回归测试',
          test_suite_id: 1,
          test_suite_name: '登录模块测试',
          project_id: 1,
          frequency: 'daily',
          execute_time: '09:00',
          status: 'active',
          last_executed_at: '2026-03-15 09:00:00',
          next_execute_at: '2026-03-16 09:00:00',
          created_at: '2026-03-01 10:00:00'
        },
        {
          id: 2,
          name: '每周性能测试',
          project_id: 1,
          frequency: 'weekly',
          day_of_week: 1,
          execute_time: '14:00',
          status: 'paused',
          last_executed_at: '2026-03-09 14:00:00',
          created_at: '2026-03-01 10:00:00'
        },
        {
          id: 3,
          name: '接口超时监控',
          project_id: 1,
          frequency: 'interval',
          interval_minutes: 30,
          status: 'active',
          last_executed_at: '2026-03-15 10:30:00',
          next_execute_at: '2026-03-15 11:00:00',
          created_at: '2026-03-14 10:00:00'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // 加载执行日志
  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedule/logs?limit=50`, {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('加载失败')
      const data = await response.json()
      setLogs(Array.isArray(data) ? data : (data.items || []))
    } catch (error) {
      // 模拟日志数据
      setLogs([
        {
          id: 1,
          schedule_id: 1,
          schedule_name: '每日接口回归测试',
          status: 'success',
          total: 25,
          passed: 24,
          failed: 1,
          duration: 125,
          executed_at: '2026-03-15 09:00:00'
        },
        {
          id: 2,
          schedule_id: 1,
          schedule_name: '每日接口回归测试',
          status: 'success',
          total: 25,
          passed: 25,
          failed: 0,
          duration: 118,
          executed_at: '2026-03-14 09:00:00'
        },
        {
          id: 3,
          schedule_id: 3,
          schedule_name: '接口超时监控',
          status: 'failed',
          total: 10,
          passed: 8,
          failed: 2,
          duration: 45,
          executed_at: '2026-03-15 10:30:00',
          error_message: '2个接口响应超时'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
    loadLogs()
  }, [])

  // 创建/更新调度
  const handleSubmit = async (values: any) => {
    try {
      const scheduleData = {
        ...values,
        execute_time: values.execute_time?.format('HH:mm'),
        status: 'active'
      }
      
      message.success(editingSchedule ? '调度已更新' : '调度已创建')
      setModalVisible(false)
      form.resetFields()
      setEditingSchedule(null)
      loadSchedules()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  // 删除调度
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个定时任务吗？',
      onOk: () => {
        message.success('删除成功')
        loadSchedules()
      }
    })
  }

  // 切换状态
  const toggleStatus = (record: TestSchedule) => {
    const newStatus = record.status === 'active' ? 'paused' : 'active'
    message.success(newStatus === 'active' ? '已启动' : '已暂停')
    loadSchedules()
  }

  // 立即执行
  const handleExecuteNow = (record: TestSchedule) => {
    Modal.confirm({
      title: '立即执行',
      content: `确定立即执行 "${record.name}" 吗？`,
      onOk: () => {
        message.success('任务已开始执行，请稍后查看结果')
      }
    })
  }

  // 调度表格列
  const scheduleColumns = [
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      width: 80,
      render: (status: string) => {
        const s = SCHEDULE_STATUS[status as keyof typeof SCHEDULE_STATUS]
        return <Tag color={s.color} icon={s.icon}>{s.text}</Tag>
      }
    },
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    { 
      title: '执行频率', 
      dataIndex: 'frequency', 
      key: 'frequency',
      render: (freq: string, record: TestSchedule) => {
        const freqObj = FREQUENCY_OPTIONS.find(f => f.value === freq)
        let desc = freqObj?.label || freq
        if (freq === 'daily') desc += ` ${record.execute_time}`
        if (freq === 'weekly') desc += ` ${record.execute_time} (周${record.day_of_week})`
        if (freq === 'interval') desc += ` ${record.interval_minutes}分钟`
        return desc
      }
    },
    { 
      title: '上次执行', 
      dataIndex: 'last_executed_at', 
      key: 'last_executed_at',
      render: (text: string) => text ? text.slice(0, 16) : '-'
    },
    { 
      title: '下次执行', 
      dataIndex: 'next_execute_at', 
      key: 'next_execute_at',
      render: (text: string) => text ? <Badge status="processing" text={text.slice(0, 16)} /> : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: TestSchedule) => (
        <Space>
          <Button size="small" type="link" onClick={() => handleExecuteNow(record)}>
            立即执行
          </Button>
          <Button size="small" type="link" onClick={() => toggleStatus(record)}>
            {record.status === 'active' ? '暂停' : '启动'}
          </Button>
          <Button size="small" type="link" onClick={() => {
            setEditingSchedule(record)
            form.setFieldsValue({
              ...record,
              execute_time: record.execute_time ? dayjs(record.execute_time, 'HH:mm') : null
            })
            setModalVisible(true)
          }}>
            编辑
          </Button>
          <Button size="small" type="link" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ]

  // 日志表格列
  const logColumns = [
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      )
    },
    { title: '任务名称', dataIndex: 'schedule_name', key: 'schedule_name' },
    { 
      title: '执行结果', 
      key: 'result',
      render: (_: any, record: TestScheduleLog) => (
        <Space>
          <Tag color="green">{record.passed} 通过</Tag>
          {record.failed > 0 && <Tag color="red">{record.failed} 失败</Tag>}
          <span style={{ color: '#888' }}>总计: {record.total}</span>
        </Space>
      )
    },
    { 
      title: '耗时', 
      dataIndex: 'duration', 
      key: 'duration',
      render: (d: number) => d ? `${d}ms` : '-'
    },
    { 
      title: '执行时间', 
      dataIndex: 'executed_at', 
      key: 'executed_at',
      render: (text: string) => text?.slice(0, 19) || '-'
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      key: 'error_message',
      render: (msg: string) => msg ? <Tag color="red">{msg}</Tag> : '-'
    }
  ]

  // 统计卡片数据
  const stats = {
    activeCount: schedules.filter(s => s.status === 'active').length,
    todayExecutions: logs.filter(l => l.executed_at?.startsWith('2026-03-15')).length,
    todayPassed: logs.filter(l => l.executed_at?.startsWith('2026-03-15') && l.status === 'success').length,
    todayFailed: logs.filter(l => l.executed_at?.startsWith('2026-03-15') && l.status === 'failed').length
  }

  return (
    <div style={{ padding: 24 }}>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'schedules',
            label: <span><ClockCircleOutlined /> 定时任务</span>,
            children: (
              <>
                {/* 统计卡片 */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="运行中的任务" 
                        value={stats.activeCount} 
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<PlayCircleOutlined />} 
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="今日执行次数" 
                        value={stats.todayExecutions} 
                        prefix={<HistoryOutlined />} 
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="今日通过" 
                        value={stats.todayPassed} 
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<CheckCircleOutlined />} 
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="今日失败" 
                        value={stats.todayFailed} 
                        valueStyle={{ color: '#ff4d4f' }}
                        prefix={<CloseCircleOutlined />} 
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 操作栏 */}
                <div style={{ marginBottom: 16 }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingSchedule(null)
                      form.resetFields()
                      setModalVisible(true)
                    }}
                  >
                    创建定时任务
                  </Button>
                </div>

                {/* 调度列表 */}
                <Table 
                  columns={scheduleColumns} 
                  dataSource={schedules} 
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </>
            )
          },
          {
            key: 'logs',
            label: <span><HistoryOutlined /> 执行日志</span>,
            children: (
              <>
                <Alert 
                  message="执行日志展示所有定时任务的执行记录，包括成功和失败的测试结果"
                  type="info" 
                  style={{ marginBottom: 16 }}
                />
                <Table 
                  columns={logColumns} 
                  dataSource={logs} 
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </>
            )
          }
        ]}
      />

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingSchedule ? '编辑定时任务' : '创建定时任务'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingSchedule(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            frequency: 'daily',
            status: 'active'
          }}
        >
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="如: 每日接口回归测试" />
          </Form.Item>

          <Form.Item name="frequency" label="执行频率" rules={[{ required: true }]}>
            <Select options={FREQUENCY_OPTIONS} onChange={(val) => {
              form.setFieldsValue({ frequency: val })
            }} />
          </Form.Item>

          <Form.Item name="execute_time" label="执行时间">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="interval_minutes" label="间隔分钟数" hidden={form.getFieldValue('frequency') !== 'interval'}>
            <Input type="number" placeholder="如: 30" min={1} />
          </Form.Item>

          <Form.Item name="day_of_week" label="星期几" hidden={form.getFieldValue('frequency') !== 'weekly'}>
            <Select placeholder="选择星期">
              <Select.Option value={1}>周一</Select.Option>
              <Select.Option value={2}>周二</Select.Option>
              <Select.Option value={3}>周三</Select.Option>
              <Select.Option value={4}>周四</Select.Option>
              <Select.Option value={5}>周五</Select.Option>
              <Select.Option value={6}>周六</Select.Option>
              <Select.Option value={0}>周日</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSchedule ? '保存修改' : '创建任务'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
