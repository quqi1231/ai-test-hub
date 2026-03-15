/**
 * 测试执行历史和报告组件
 */
import { useState, useEffect } from 'react'
import { Table, Tag, Button, Space, Modal, Tabs, Card, Timeline, Spin } from 'antd'
import { EyeOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

interface TestResult {
  id: number
  suite_id: number
  status: string
  total_count: number
  success_count: number
  fail_count: number
  duration_ms: number
  details?: {
    items: TestResultItem[]
  }
  started_at: string
  finished_at?: string
}

interface TestResultItem {
  interface_id: number
  interface_name: string
  method: string
  url: string
  status_code: number
  elapsed_ms: number
  assertions: {
    all_passed: boolean
    results: Array<{
      type: string
      passed: boolean
      message: string
    }>
  }
  extracted_vars?: Record<string, any>
  response?: {
    body: any
    headers: Record<string, string>
  }
}

interface TestSuite {
  id: number
  name: string
}

export default function TestExecution({ projectId = 1 }: { projectId?: number }) {
  const [results, setResults] = useState<TestResult[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)
  const [activeTab, setActiveTab] = useState('1')

  useEffect(() => {
    loadResults()
    loadSuites()
  }, [projectId])

  const loadResults = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-results/?limit=100`)
      if (res.status === 401) {
        message.error('请先登录')
        setResults([])
        setLoading(false)
        return
      }
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load results:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const loadSuites = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-suites/?project_id=${projectId}`)
      if (res.status === 401) {
        message.error('请先登录')
        setSuites([])
        return
      }
      const data = await res.json()
      setSuites(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load suites:', error)
      setSuites([])
    }
  }

  const handleViewDetail = async (record: TestResult) => {
    setSelectedResult(record)
    setDetailVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/test-results/${id}`, { method: 'DELETE' })
      loadResults()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const getSuiteName = (suiteId: number) => {
    const suite = suites.find(s => s.id === suiteId)
    return suite?.name || `测试集 #${suiteId}`
  }

  const columns = [
    { 
      title: '测试集', 
      key: 'suite',
      render: (_: any, record: TestResult) => getSuiteName(record.suite_id)
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '通过' : '失败'}
        </Tag>
      )
    },
    { 
      title: '通过/总数', 
      key: 'count',
      width: 120,
      render: (_: any, record: TestResult) => (
        <span>
          <Tag color="green">{record.success_count}</Tag> / 
          <Tag>{record.total_count}</Tag>
        </span>
      )
    },
    { 
      title: '耗时', 
      dataIndex: 'duration_ms', 
      key: 'duration_ms',
      width: 100,
      render: (ms: number) => `${ms}ms`
    },
    { 
      title: '执行时间', 
      dataIndex: 'started_at', 
      key: 'started_at',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    { 
      title: '操作', 
      key: 'action',
      width: 120,
      render: (_: any, record: TestResult) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  // 渲染详情内容
  const renderDetailContent = () => {
    if (!selectedResult?.details?.items) return null

    const items = selectedResult.details.items

    return (
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: '1',
            label: '执行概况',
            children: (
              <Card size="small">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div>
                    <div style={{ color: '#999' }}>状态</div>
                    <Tag color={selectedResult.status === 'success' ? 'green' : 'red'} style={{ fontSize: 16 }}>
                      {selectedResult.status === 'success' ? '通过' : '失败'}
                    </Tag>
                  </div>
                  <div>
                    <div style={{ color: '#999' }}>通过/总数</div>
                    <div style={{ fontSize: 20 }}>
                      <span style={{ color: '#52c41a' }}>{selectedResult.success_count}</span>
                      {' / '}
                      <span>{selectedResult.total_count}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#999' }}>耗时</div>
                    <div style={{ fontSize: 20 }}>{selectedResult.duration_ms}ms</div>
                  </div>
                </div>
              </Card>
            )
          },
          {
            key: '2',
            label: '执行详情',
            children: (
              <Timeline
                items={items.map((item, index) => ({
                  color: item.assertions?.all_passed ? 'green' : 'red',
                  children: (
                    <div key={index}>
                      <Space>
                        <Tag color={item.assertions?.all_passed ? 'green' : 'red'}>
                          {item.assertions?.all_passed ? '✓' : '✗'}
                        </Tag>
                        <Tag color="blue">{item.method}</Tag>
                        <span>{item.interface_name}</span>
                        <Tag>{item.status_code}</Tag>
                        <span style={{ color: '#999' }}>{item.elapsed_ms}ms</span>
                      </Space>
                      {item.assertions?.results && item.assertions.results.length > 0 && (
                        <div style={{ marginTop: 8, paddingLeft: 16 }}>
                          {item.assertions.results.map((assertion, i) => (
                            <div key={i} style={{ color: assertion.passed ? '#52c41a' : '#ff4d4f', fontSize: 12 }}>
                              {assertion.passed ? '✓' : '✗'} {assertion.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }))}
              />
            )
          },
          {
            key: '3',
            label: '原始响应',
            children: (
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
                {JSON.stringify(items.map(i => ({
                  name: i.interface_name,
                  method: i.method,
                  status_code: i.status_code,
                  elapsed_ms: i.elapsed_ms,
                  response: i.response?.body
                })), null, 2)}
              </pre>
            )
          }
        ]}
      />
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={loadResults}>
          刷新
        </Button>
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={results}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无执行记录，请先创建测试集并执行' }}
        />
      </Spin>

      <Modal
        title={`执行详情 - ${selectedResult ? getSuiteName(selectedResult.suite_id) : ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {renderDetailContent()}
      </Modal>
    </div>
  )
}
