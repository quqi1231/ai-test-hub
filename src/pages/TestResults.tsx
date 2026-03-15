import { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Descriptions, Row, Col, Select, Statistic, message, Alert } from 'antd'
import { EyeOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'

const API_BASE_URL = 'http://localhost:8000'

// 获取 token 的辅助函数
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

interface TestResult {
  id: number
  case_id: number
  case_name?: string
  status: string
  response: unknown
  error_message?: string
  duration_ms: number
  executed_at: string
}

export default function TestResults() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [stats, setStats] = useState({ total: 0, success: 0, fail: 0, error: 0 })

  const loadResults = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/results/`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })
      
      if (response.status === 401) {
        setError('请先登录后再查看测试结果')
        setResults([])
        return
      }
      
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }
      
      const data = await response.json()
      
      // 处理分页格式或数组格式
      const resultsArray = Array.isArray(data) ? data : (data.items || data.data || [])
      
      if (!Array.isArray(resultsArray)) {
        console.error('Unexpected data format:', data)
        setResults([])
        return
      }
      
      setResults(resultsArray)
      
      const success = resultsArray.filter((r: TestResult) => r.status === 'success').length
      const fail = resultsArray.filter((r: TestResult) => r.status === 'fail').length
      const error = resultsArray.filter((r: TestResult) => r.status === 'error').length
      setStats({ total: resultsArray.length, success, fail, error })
    } catch (err) {
      console.error('Failed to load results:', err)
      setError(`加载失败: ${err instanceof Error ? err.message : '未知错误'}`)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
  }, [])

  const handleViewDetail = (record: TestResult) => {
    setSelectedResult(record)
    setDetailVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/results/${id}`, { 
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      })
      if (!response.ok) {
        throw new Error('删除失败')
      }
      message.success('删除成功')
      loadResults()
    } catch {
      message.error(`删除失败`)
    }
  }

  const filteredResults = filterStatus 
    ? results.filter(r => r.status === filterStatus)
    : results

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用例名称', dataIndex: 'case_name', key: 'case_name',
      render: (name: string, record: TestResult) => name || `用例 #${record.case_id}` },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = { success: 'green', fail: 'red', error: 'orange' }
        const labelMap: Record<string, string> = { success: '通过', fail: '失败', error: '错误' }
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>
      }
    },
    { title: '耗时', dataIndex: 'duration_ms', key: 'duration_ms', width: 100,
      render: (ms: number) => `${ms}ms` },
    { title: '执行时间', dataIndex: 'executed_at', key: 'executed_at', width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN') },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: TestResult) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>
        📊 测试结果
        <Button icon={<ReloadOutlined />} style={{ marginLeft: 16 }} onClick={loadResults}>刷新</Button>
      </h1>

      {error && (
        <Alert 
          message="加载错误" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }} 
          action={
            <Button size="small" onClick={loadResults}>重试</Button>
          }
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="总测试数" value={stats.total} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="通过" value={stats.success} styles={{ content: { color: '#3f8600' } }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="失败" value={stats.fail} styles={{ content: { color: '#cf1322' } }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="错误" value={stats.error} styles={{ content: { color: '#faad14' } }} /></Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <span>筛选:</span>
          <Select placeholder="选择状态" allowClear style={{ width: 120 }} value={filterStatus} onChange={setFilterStatus}>
            <Select.Option value="success">通过</Select.Option>
            <Select.Option value="fail">失败</Select.Option>
            <Select.Option value="error">错误</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredResults}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无测试结果' }}
        />
      </Card>

      <Modal
        title={`测试结果详情 - #${selectedResult?.id}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedResult && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="用例">{selectedResult.case_name || `用例 #${selectedResult.case_id}`}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedResult.status === 'success' ? 'green' : selectedResult.status === 'fail' ? 'red' : 'orange'}>
                  {selectedResult.status === 'success' ? '通过' : selectedResult.status === 'fail' ? '失败' : '错误'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="耗时">{selectedResult.duration_ms}ms</Descriptions.Item>
              <Descriptions.Item label="执行时间">{new Date(selectedResult.executed_at).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>

            {selectedResult.error_message && (
              <div style={{ marginTop: 16 }}>
                <h4>错误信息:</h4>
                <pre style={{ background: '#fff1f0', padding: 12, borderRadius: 4, color: '#cf1322' }}>
                  {selectedResult.error_message}
                </pre>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <h4>响应内容:</h4>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
                {JSON.stringify(selectedResult.response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
