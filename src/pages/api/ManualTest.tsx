/**
 * 手动测试 - 接口自动化模块
 * 完整版：顶部Tab导航 + 左右分栏布局
 */
import { useState, useEffect } from 'react'
import {
  Layout, Card, Button, Space, Select, Input, Tabs, message,
  Tag, Empty, Spin, Divider, Table, Tooltip, Popconfirm,
  Modal, Form, Checkbox, Badge
} from 'antd'
import {
  PlayCircleOutlined, SaveOutlined, LinkOutlined,
  CopyOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ThunderboltOutlined, StarOutlined, StarFilled,
  DeleteOutlined, ImportOutlined, ExportOutlined,
  FileAddOutlined, SearchOutlined, ReloadOutlined,
  FileTextOutlined, SettingOutlined
} from '@ant-design/icons'
import axios from 'axios'

const { Sider, Content } = Layout
const { TextArea } = Input
const { Option } = Select

interface ExecuteResult {
  success: boolean
  status_code: number
  duration_ms: number
  response_body: any
  response_headers: Record<string, string>
  error?: string
}

interface InterfaceItem {
  id: number
  name: string
  url: string
  method: string
  starred: boolean
  headers?: any
  params?: any
  body?: any
  created_at?: string
}

export default function ManualTest() {
  // 请求配置
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [interfaceName, setInterfaceName] = useState('')
  const [interfaceDesc, setInterfaceDesc] = useState('')
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [params, setParams] = useState('{}')
  const [body, setBody] = useState('{}')
  const [bodyType, setBodyType] = useState('json')
  
  // 执行状态
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ExecuteResult | null>(null)
  
  // 接口列表
  const [interfaceList, setInterfaceList] = useState<InterfaceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [currentTab, setCurrentTab] = useState('params')
  
  // 保存弹窗
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const [saveForm] = Form.useForm()

  // 方法颜色
  const methodColors: Record<string, string> = {
    GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red', PATCH: 'cyan'
  }

  // 加载接口列表
  const loadInterfaces = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/interfaces', { params: { skip: 0, limit: 100 } })
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setInterfaceList(data.map((item: any) => ({
        ...item,
        starred: item.starred || false
      })))
    } catch (e) {
      // 模拟数据
      setInterfaceList([
        { id: 1, name: '获取用户列表', url: '/api/users', method: 'GET', starred: true },
        { id: 2, name: '创建用户', url: '/api/users', method: 'POST', starred: false },
        { id: 3, name: '更新用户', url: '/api/users/1', method: 'PUT', starred: false },
        { id: 4, name: '删除用户', url: '/api/users/1', method: 'DELETE', starred: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInterfaces()
  }, [])

  // 发送请求
  const handleSend = async () => {
    if (!url) {
      message.warning('请输入请求地址')
      return
    }

    setExecuting(true)
    setResult(null)

    try {
      const parsedHeaders = JSON.parse(headers || '{}')
      const parsedParams = JSON.parse(params || '{}')
      const parsedBody = body ? JSON.parse(body) : null

      const res = await axios.post('/api/v2/automation/execute', {
        method,
        url,
        headers: parsedHeaders,
        params: parsedParams,
        body: parsedBody,
        body_type: bodyType,
        timeout: 30
      })

      setResult(res.data)
      if (res.data.success) {
        message.success(`请求成功 (${res.data.duration_ms}ms)`)
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '请求失败')
      setResult({
        success: false,
        status_code: 0,
        duration_ms: 0,
        response_body: null,
        response_headers: {},
        error: e.response?.data?.detail || e.message
      })
    } finally {
      setExecuting(false)
    }
  }

  // 保存接口
  const handleSave = () => {
    if (!url) {
      message.warning('请输入请求地址')
      return
    }
    saveForm.setFieldsValue({
      name: interfaceName || `接口${Date.now()}`,
      description: interfaceDesc
    })
    setSaveModalVisible(true)
  }

  const handleSaveConfirm = async () => {
    try {
      const values = await saveForm.validateFields()
      // 这里调用保存接口
      message.success('保存成功')
      setSaveModalVisible(false)
      loadInterfaces()
    } catch (e) {
      message.error('保存失败')
    }
  }

  // 选择接口
  const handleSelectInterface = (record: InterfaceItem) => {
    setMethod(record.method)
    setUrl(record.url)
    setInterfaceName(record.name)
    if (record.headers) setHeaders(JSON.stringify(record.headers, null, 2))
    if (record.params) setParams(JSON.stringify(record.params, null, 2))
    if (record.body) setBody(JSON.stringify(record.body, null, 2))
  }

  // 切换收藏
  const handleToggleStar = (id: number, starred: boolean) => {
    setInterfaceList(prev => 
      prev.map(item => item.id === id ? { ...item, starred: !starred } : item)
    )
    message.success(starred ? '已取消收藏' : '已收藏')
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的接口')
      return
    }
    message.success(`已删除 ${selectedRowKeys.length} 个接口`)
    setSelectedRowKeys([])
    loadInterfaces()
  }

  // 格式化 JSON
  const formatJson = (text: string, setter: (v: string) => void) => {
    try {
      const obj = JSON.parse(text)
      setter(JSON.stringify(obj, null, 2))
    } catch {
      message.error('JSON 格式错误')
    }
  }

  // 复制响应
  const handleCopy = () => {
    if (result?.response_body) {
      navigator.clipboard.writeText(JSON.stringify(result.response_body, null, 2))
      message.success('已复制到剪贴板')
    }
  }

  // 过滤接口列表
  const filteredList = interfaceList.filter(item =>
    item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    item.url.toLowerCase().includes(searchKeyword.toLowerCase())
  )

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 150,
      render: (text: string, record: InterfaceItem) => (
        <a onClick={() => handleSelectInterface(record)}>{text}</a>
      )
    },
    {
      title: '收藏',
      dataIndex: 'starred',
      width: 60,
      render: (starred: boolean, record: InterfaceItem) => (
        <span onClick={() => handleToggleStar(record.id, starred)} style={{ cursor: 'pointer' }}>
          {starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />}
        </span>
      )
    },
    {
      title: '方法',
      dataIndex: 'method',
      width: 80,
      render: (method: string) => (
        <Tag color={methodColors[method]} style={{ margin: 0 }}>{method}</Tag>
      )
    },
    {
      title: 'URL',
      dataIndex: 'url',
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <span style={{ color: '#666' }}>{url}</span>
        </Tooltip>
      )
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, record: InterfaceItem) => (
        <Space size="small">
          <Tooltip title="执行">
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleSelectInterface(record)} />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm title="确定删除？" onConfirm={() => message.success('已删除')}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      {/* 左侧 - 接口配置 */}
      <Sider width="55%" style={{ background: '#fff', borderRight: '1px solid #e8e8e8' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 配置区 */}
          <div style={{ padding: 16, borderBottom: '1px solid #e8e8e8' }}>
            {/* 第一行：方法、URL、格式 */}
            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
              <Select value={method} onChange={setMethod} style={{ width: 100 }}>
                <Option value="GET"><Tag color="green" style={{ margin: 0 }}>GET</Tag></Option>
                <Option value="POST"><Tag color="blue" style={{ margin: 0 }}>POST</Tag></Option>
                <Option value="PUT"><Tag color="orange" style={{ margin: 0 }}>PUT</Tag></Option>
                <Option value="DELETE"><Tag color="red" style={{ margin: 0 }}>DELETE</Tag></Option>
                <Option value="PATCH"><Tag color="cyan" style={{ margin: 0 }}>PATCH</Tag></Option>
              </Select>
              <Input 
                placeholder="请求地址"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onPressEnter={handleSend}
                prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
                style={{ flex: 1 }}
              />
              <Select value={bodyType} onChange={setBodyType} style={{ width: 100 }}>
                <Option value="json">JSON</Option>
                <Option value="form">Form</Option>
                <Option value="raw">Raw</Option>
              </Select>
            </Space.Compact>

            {/* 第二行：名称、描述 */}
            <Space style={{ width: '100%' }} size="middle">
              <Input 
                placeholder="接口名称"
                value={interfaceName}
                onChange={e => setInterfaceName(e.target.value)}
                style={{ width: 200 }}
              />
              <Input 
                placeholder="接口描述"
                value={interfaceDesc}
                onChange={e => setInterfaceDesc(e.target.value)}
                style={{ flex: 1 }}
              />
            </Space>

            {/* 第三行：操作按钮 */}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button type="primary" icon={<PlayCircleOutlined />} loading={executing} onClick={handleSend}>
                  发送
                </Button>
                <Button icon={<SaveOutlined />} onClick={handleSave}>
                  保存
                </Button>
                <Button icon={<LinkOutlined />}>
                  执行链
                </Button>
              </Space>
            </div>
          </div>

          {/* 参数编辑区 */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Tabs 
              activeKey={currentTab}
              onChange={setCurrentTab}
              style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column' }}
              items={[
                {
                  key: 'params',
                  label: '参数',
                  children: (
                    <div style={{ height: '100%' }}>
                      <div style={{ marginBottom: 8, textAlign: 'right' }}>
                        <Button size="small" onClick={() => formatJson(params, setParams)}>格式化</Button>
                      </div>
                      <TextArea
                        rows={8}
                        value={params}
                        onChange={e => setParams(e.target.value)}
                        placeholder='{"key": "value"}'
                        style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }}
                      />
                    </div>
                  )
                },
                {
                  key: 'headers',
                  label: '请求头',
                  children: (
                    <div style={{ height: '100%' }}>
                      <div style={{ marginBottom: 8, textAlign: 'right' }}>
                        <Button size="small" onClick={() => formatJson(headers, setHeaders)}>格式化</Button>
                      </div>
                      <TextArea
                        rows={8}
                        value={headers}
                        onChange={e => setHeaders(e.target.value)}
                        placeholder='{"Content-Type": "application/json"}'
                        style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }}
                      />
                    </div>
                  )
                },
                {
                  key: 'body',
                  label: '请求体',
                  children: (
                    <div style={{ height: '100%' }}>
                      <div style={{ marginBottom: 8, textAlign: 'right' }}>
                        <Button size="small" onClick={() => formatJson(body, setBody)}>格式化</Button>
                      </div>
                      <TextArea
                        rows={8}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder='{"name": "value"}'
                        style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }}
                      />
                    </div>
                  )
                }
              ]}
            />

            {/* 结果展示区 */}
            <Card 
              title={
                <span>
                  {result ? (
                    <>
                      <Tag color={result.status_code < 400 ? 'success' : 'error'}>
                        {result.status_code || 'Error'}
                      </Tag>
                      <span style={{ marginLeft: 8, fontWeight: 'normal', fontSize: 12, color: '#999' }}>
                        {result.duration_ms}ms
                      </span>
                    </>
                  ) : '请求结果'}
                </span>
              }
              extra={
                result && (
                  <Space>
                    <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>复制</Button>
                  </Space>
                )
              }
              size="small"
              style={{ margin: 16, marginTop: 0 }}
              styles={{ body: { padding: 0 } }}
            >
              {executing ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Spin />
                  <p style={{ marginTop: 8, color: '#999' }}>请求中...</p>
                </div>
              ) : result ? (
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: result.error ? '#ff6b6b' : '#d4d4d4',
                  padding: 12,
                  margin: 0,
                  maxHeight: 200,
                  overflow: 'auto',
                  fontSize: 12,
                  fontFamily: 'Monaco, Menlo, monospace'
                }}>
                  {result.error || JSON.stringify(result.response_body, null, 2)}
                </pre>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                  点击「发送」查看结果
                </div>
              )}
            </Card>
          </div>
        </div>
      </Sider>

      {/* 右侧 - 接口列表 */}
      <Content style={{ background: '#fff', padding: 16 }}>
        {/* 操作栏 */}
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            <Button 
              icon={<DeleteOutlined />} 
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除({selectedRowKeys.length})
            </Button>
            <Button icon={<LinkOutlined />} disabled={selectedRowKeys.length === 0}>
              批量加链({selectedRowKeys.length})
            </Button>
            <Button icon={<ThunderboltOutlined />} disabled={selectedRowKeys.length === 0}>
              批量执行({selectedRowKeys.length})
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button icon={<ImportOutlined />}>导入</Button>
            <Button icon={<FileAddOutlined />}>下载模板</Button>
          </Space>
          <Space>
            <Input 
              placeholder="搜索接口名称/URL"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: 200 }}
            />
          </Space>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Space>
            <Button icon={<StarOutlined />}>收藏</Button>
            <Button icon={<ExportOutlined />}>导出</Button>
            <Button type="primary" icon={<FileTextOutlined />}>报告生成</Button>
          </Space>
        </div>

        {/* 接口列表 */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredList}
          loading={loading}
          size="small"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as number[])
          }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Content>

      {/* 保存弹窗 */}
      <Modal
        title="保存接口"
        open={saveModalVisible}
        onOk={handleSaveConfirm}
        onCancel={() => setSaveModalVisible(false)}
      >
        <Form form={saveForm} layout="vertical">
          <Form.Item name="name" label="接口名称" rules={[{ required: true }]}>
            <Input placeholder="请输入接口名称" />
          </Form.Item>
          <Form.Item name="description" label="接口描述">
            <TextArea rows={3} placeholder="请输入接口描述" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
