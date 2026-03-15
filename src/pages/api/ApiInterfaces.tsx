/**
 * 接口管理 - 完整版
 * 支持新增、编辑、测试、查看详情
 */
import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Space, Tag, message, Input, Select, Modal, Form,
  Tabs, Row, Col, Divider, Spin, Empty, Tooltip, Popconfirm, Typography
} from 'antd'
import {
  PlusOutlined, SearchOutlined, PlayCircleOutlined, EditOutlined,
  DeleteOutlined, CopyOutlined, ExportOutlined, ImportOutlined,
  StarOutlined, StarFilled, EyeOutlined, CheckCircleOutlined,
  CloseCircleOutlined, CopyFilled
} from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { Search } = Input
const { TextArea } = Input
const { Text } = Typography

const API_BASE_URL = 'http://localhost:8000'

// 接口数据类型
interface InterfaceItem {
  id?: number
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  description?: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: any
  body_type?: string
  content_type?: string
  is_favorite?: boolean
  last_status_code?: number
  last_response_time?: number
  last_response_body?: string
  var_extracts?: Record<string, string>
  assertions?: any[]
}

// 方法颜色映射
const methodColors: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple'
}

export default function ApiInterfaces() {
  const [interfaces, setInterfaces] = useState<InterfaceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [searchParams, setSearchParams] = useState({ keyword: '', method: 'all' })

  // 弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [testModalVisible, setTestModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentInterface, setCurrentInterface] = useState<InterfaceItem | null>(null)

  // 测试相关状态
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  // 表单
  const [form] = Form.useForm()

  // 加载接口列表
  const loadInterfaces = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (searchParams.keyword) params.search = searchParams.keyword
      if (searchParams.method !== 'all') params.method = searchParams.method

      const res = await axios.get(`${API_BASE_URL}/api/interfaces/`, { params })
      setInterfaces(res.data.items || res.data || [])
    } catch (e) {
      message.error('加载接口列表失败')
      setInterfaces([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInterfaces()
  }, [searchParams])

  // 新增接口
  const handleAdd = () => {
    setCurrentInterface(null)
    form.resetFields()
    form.setFieldsValue({
      method: 'GET',
      body_type: 'json',
      headers: '{}',
      params: '{}',
      body: '{}'
    })
    setEditModalVisible(true)
  }

  // 编辑接口
  const handleEdit = (record: InterfaceItem) => {
    setCurrentInterface(record)
    form.setFieldsValue({
      ...record,
      headers: JSON.stringify(record.headers || {}, null, 2),
      params: JSON.stringify(record.params || {}, null, 2),
      body: JSON.stringify(record.body || {}, null, 2)
    })
    setEditModalVisible(true)
  }

  // 复制接口
  const handleCopy = async (record: InterfaceItem) => {
    try {
      const newData = { ...record, name: `${record.name} (副本)` }
      delete newData.id
      await axios.post(`${API_BASE_URL}/api/interfaces/`, newData)
      message.success('复制成功')
      loadInterfaces()
    } catch (e) {
      message.error('复制失败')
    }
  }

  // 删除接口
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/interfaces/${id}`)
      message.success('删除成功')
      loadInterfaces()
    } catch (e) {
      message.error('删除失败')
    }
  }

  // 收藏接口
  const handleFavorite = async (id: number) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/interfaces/${id}/favorite`)
      loadInterfaces()
    } catch (e) {
      message.error('操作失败')
    }
  }

  // 测试接口
  const handleTest = (record: InterfaceItem) => {
    setCurrentInterface(record)
    setTestResult(null)
    setTestModalVisible(true)
  }

  // 查看详情
  const handleDetail = (record: InterfaceItem) => {
    setCurrentInterface(record)
    setDetailModalVisible(true)
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 解析 JSON 字段
      const data = {
        ...values,
        headers: JSON.parse(values.headers || '{}'),
        params: JSON.parse(values.params || '{}'),
        body: JSON.parse(values.body || '{}')
      }

      if (currentInterface?.id) {
        await axios.put(`${API_BASE_URL}/api/interfaces/${currentInterface.id}`, data)
        message.success('更新成功')
      } else {
        await axios.post(`${API_BASE_URL}/api/interfaces/`, data)
        message.success('创建成功')
      }

      setEditModalVisible(false)
      loadInterfaces()
    } catch (e: any) {
      if (e.response?.data?.detail) {
        message.error(e.response.data.detail)
      } else if (e.message) {
        message.error(`JSON 格式错误: ${e.message}`)
      } else {
        message.error('操作失败')
      }
    }
  }

  // 执行测试
  const executeTest = async () => {
    if (!currentInterface) return

    setTestLoading(true)
    setTestResult(null)

    try {
      const res = await axios.post(`${API_BASE_URL}/api/execute/single`, {
        interface_id: currentInterface.id,
        url: currentInterface.url,
        method: currentInterface.method,
        headers: currentInterface.headers || {},
        params: currentInterface.params || {},
        body: currentInterface.body || {},
        content_type: currentInterface.content_type || 'application/json'
      })

      setTestResult(res.data)

      // 更新接口状态
      if (res.data.success) {
        message.success('请求成功')
      } else {
        message.error('请求失败')
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '请求失败')
      setTestResult({
        success: false,
        error: e.response?.data?.detail || e.message
      })
    } finally {
      setTestLoading(false)
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string, record: InterfaceItem) => (
        <Space>
          <Tag color={methodColors[record.method] || 'default'}>{record.method}</Tag>
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => handleDetail(record)}
          >
            {text}
          </span>
          {record.is_favorite && <StarFilled style={{ color: '#faad14' }} />}
        </Space>
      )
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <Text code style={{ fontSize: 12 }}>{url}</Text>
        </Tooltip>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 150
    },
    {
      title: '状态',
      dataIndex: 'last_status_code',
      key: 'status',
      width: 80,
      render: (code: number) => code ? (
        <Tag color={code < 400 ? 'green' : 'red'}>{code}</Tag>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: '耗时',
      dataIndex: 'last_response_time',
      key: 'time',
      width: 80,
      render: (t: number) => t ? `${t}ms` : <Text type="secondary">-</Text>
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: InterfaceItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleTest(record)}
          >
            测试
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Tooltip title="收藏">
            <Button
              type="link"
              size="small"
              icon={record.is_favorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={() => handleFavorite(record.id!)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除这个接口吗？"
            onConfirm={() => handleDelete(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <span>接口列表</span>
            <Tag color="blue">{interfaces.length} 个接口</Tag>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={searchParams.method}
              onChange={v => setSearchParams(p => ({ ...p, method: v }))}
              style={{ width: 100 }}
            >
              <Option value="all">全部方法</Option>
              <Option value="GET">GET</Option>
              <Option value="POST">POST</Option>
              <Option value="PUT">PUT</Option>
              <Option value="DELETE">DELETE</Option>
              <Option value="PATCH">PATCH</Option>
            </Select>
            <Search
              placeholder="搜索接口..."
              style={{ width: 200 }}
              onSearch={v => setSearchParams(p => ({ ...p, keyword: v }))}
              allowClear
            />
            <Button icon={<ImportOutlined />}>导入</Button>
            <Button icon={<ExportOutlined />}>导出</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增接口
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={interfaces}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as number[])
          }}
        />
      </Card>

      {/* 新增/编辑接口弹窗 */}
      <Modal
        title={currentInterface ? '编辑接口' : '新增接口'}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSubmit}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="method"
                label="请求方法"
                rules={[{ required: true, message: '请选择方法' }]}
              >
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                  <Option value="PATCH">PATCH</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="url"
                label="URL"
                rules={[{ required: true, message: '请输入URL' }]}
              >
                <Input placeholder="https://api.example.com/users" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="接口名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="给接口起个名字" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="接口描述" />
          </Form.Item>

          <Tabs defaultActiveKey="headers" items={[
            {
              key: 'headers',
              label: '请求头',
              children: (
                <Form.Item name="headers">
                  <TextArea
                    rows={6}
                    placeholder='{"Content-Type": "application/json"}'
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              )
            },
            {
              key: 'params',
              label: 'Query 参数',
              children: (
                <Form.Item name="params">
                  <TextArea
                    rows={6}
                    placeholder='{"page": 1, "size": 10}'
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              )
            },
            {
              key: 'body',
              label: '请求体',
              children: (
                <>
                  <Form.Item name="body_type" label="Body 类型">
                    <Select style={{ width: 150 }}>
                      <Option value="json">JSON</Option>
                      <Option value="form-data">Form Data</Option>
                      <Option value="x-www-form-urlencoded">URL Encoded</Option>
                      <Option value="raw">Raw</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="body">
                    <TextArea
                      rows={8}
                      placeholder='{"name": "test", "age": 18}'
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </>
              )
            }
          ]} />
        </Form>
      </Modal>

      {/* 测试接口弹窗 */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined />
            测试接口
            {currentInterface && (
              <Tag color={methodColors[currentInterface.method]}>
                {currentInterface.method}
              </Tag>
            )}
          </Space>
        }
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTestModalVisible(false)}>
            关闭
          </Button>,
          <Button key="test" type="primary" icon={<PlayCircleOutlined />} loading={testLoading} onClick={executeTest}>
            发送请求
          </Button>
        ]}
        width={900}
      >
        {currentInterface && (
          <div>
            <Card size="small" title="请求信息" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={4}><Text strong>URL:</Text></Col>
                <Col span={20}><Text code>{currentInterface.url}</Text></Col>
                <Col span={4}><Text strong>Headers:</Text></Col>
                <Col span={20}>
                  <Text code style={{ fontSize: 12 }}>
                    {JSON.stringify(currentInterface.headers || {})}
                  </Text>
                </Col>
                {currentInterface.body && Object.keys(currentInterface.body).length > 0 && (
                  <>
                    <Col span={4}><Text strong>Body:</Text></Col>
                    <Col span={20}>
                      <pre style={{ margin: 0, fontSize: 12, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                        {JSON.stringify(currentInterface.body, null, 2)}
                      </pre>
                    </Col>
                  </>
                )}
              </Row>
            </Card>

            {testLoading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" description="请求中..." />
              </div>
            )}

            {testResult && !testLoading && (
              <Card
                size="small"
                title={
                  <Space>
                    {testResult.success ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <span>响应结果</span>
                    {testResult.status_code && (
                      <Tag color={testResult.status_code < 400 ? 'green' : 'red'}>
                        {testResult.status_code}
                      </Tag>
                    )}
                    {testResult.duration_ms && (
                      <Tag>{testResult.duration_ms}ms</Tag>
                    )}
                  </Space>
                }
              >
                {testResult.error ? (
                  <Text type="danger">{testResult.error}</Text>
                ) : (
                  <Tabs defaultActiveKey="body" items={[
                      {
                        key: 'body',
                        label: '响应体',
                        children: (
                          <pre style={{
                            maxHeight: 300,
                            overflow: 'auto',
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 4,
                            fontSize: 12
                          }}>
                            {typeof testResult.response_body === 'object'
                              ? JSON.stringify(testResult.response_body, null, 2)
                              : testResult.response_body || '无内容'}
                          </pre>
                        )
                      },
                      {
                        key: 'headers',
                        label: '响应头',
                        children: (
                          <pre style={{
                            maxHeight: 200,
                            overflow: 'auto',
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 4,
                            fontSize: 12
                          }}>
                            {JSON.stringify(testResult.response_headers || {}, null, 2)}
                          </pre>
                        )
                      }
                    ]} />
                )}
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* 接口详情弹窗 */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            接口详情
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="edit" icon={<EditOutlined />} onClick={() => {
            setDetailModalVisible(false)
            if (currentInterface) handleEdit(currentInterface)
          }}>
            编辑
          </Button>,
          <Button key="test" type="primary" icon={<PlayCircleOutlined />} onClick={() => {
            setDetailModalVisible(false)
            if (currentInterface) handleTest(currentInterface)
          }}>
            测试
          </Button>
        ]}
        width={800}
      >
        {currentInterface && (
          <Descriptions interface={currentInterface} />
        )}
      </Modal>
    </div>
  )
}

// 详情描述组件
function Descriptions({ interface: item }: { interface: InterfaceItem }) {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={4}><Text strong>名称</Text></Col>
        <Col span={20}>
          <Space>
            <Tag color={methodColors[item.method]}>{item.method}</Tag>
            {item.name}
            {item.is_favorite && <StarFilled style={{ color: '#faad14' }} />}
          </Space>
        </Col>

        <Col span={4}><Text strong>URL</Text></Col>
        <Col span={20}><Text code copyable>{item.url}</Text></Col>

        <Col span={4}><Text strong>描述</Text></Col>
        <Col span={20}>{item.description || <Text type="secondary">无</Text>}</Col>

        <Divider style={{ margin: '8px 0' }} />

        <Col span={24}><Text strong>请求头</Text></Col>
        <Col span={24}>
          <pre style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            maxHeight: 150,
            overflow: 'auto'
          }}>
            {JSON.stringify(item.headers || {}, null, 2)}
          </pre>
        </Col>

        <Col span={24}><Text strong>Query 参数</Text></Col>
        <Col span={24}>
          <pre style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            maxHeight: 150,
            overflow: 'auto'
          }}>
            {JSON.stringify(item.params || {}, null, 2)}
          </pre>
        </Col>

        {item.body && Object.keys(item.body).length > 0 && (
          <>
            <Col span={24}><Text strong>请求体</Text></Col>
            <Col span={24}>
              <pre style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                {JSON.stringify(item.body, null, 2)}
              </pre>
            </Col>
          </>
        )}

        {(item.last_status_code || item.last_response_time) && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <Col span={24}><Text strong>最近执行</Text></Col>
            <Col span={4}>状态码</Col>
            <Col span={8}>
              <Tag color={item.last_status_code! < 400 ? 'green' : 'red'}>
                {item.last_status_code}
              </Tag>
            </Col>
            <Col span={4}>耗时</Col>
            <Col span={8}>{item.last_response_time}ms</Col>
          </>
        )}
      </Row>
    </div>
  )
}
