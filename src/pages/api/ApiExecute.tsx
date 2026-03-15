/**
 * 手动测试 - 接口自动化模块
 * 左右分栏：左侧接口列表 + 请求配置，右侧响应结果
 */
import { useState, useEffect } from 'react'
import {
  Layout, Card, Button, Space, Select, Input, Tabs, message,
  Tag, Empty, Spin, Divider, List, Tooltip
} from 'antd'
import {
  PlayCircleOutlined, SaveOutlined, HistoryOutlined,
  CopyOutlined, StarOutlined, StarFilled,
  CheckCircleOutlined, CloseCircleOutlined,
  ApiOutlined, SearchOutlined
} from '@ant-design/icons'
import axios from 'axios'

const { Sider, Content } = Layout
const { TextArea } = Input
const { Option } = Select

interface HistoryItem {
  id: number
  method: string
  url: string
  status: number
  duration: number
  time: string
}

interface ExecuteResult {
  success: boolean
  status_code: number
  duration_ms: number
  response_body: any
  response_headers: Record<string, string>
  error?: string
}

interface SavedInterface {
  id: number
  name: string
  method: string
  url: string
  headers?: Record<string, any>
  params?: Record<string, any>
  body?: any
  starred?: boolean
}

export default function ApiExecute() {
  // 请求配置
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [params, setParams] = useState('{}')
  const [body, setBody] = useState('{}')
  const [bodyType, setBodyType] = useState('json')
  
  // 执行状态
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ExecuteResult | null>(null)
  
  // 历史记录
  const [history, setHistory] = useState<HistoryItem[]>([])
  
  // 已保存的接口
  const [savedInterfaces, setSavedInterfaces] = useState<SavedInterface[]>([])
  const [interfaceLoading, setInterfaceLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // 当前选中的接口
  const [selectedInterface, setSelectedInterface] = useState<SavedInterface | null>(null)

  // 方法颜色
  const methodColors: Record<string, string> = {
    GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red', PATCH: 'cyan'
  }

  // 加载已保存的接口
  const loadSavedInterfaces = async () => {
    setInterfaceLoading(true)
    try {
      const res = await axios.get('/api/interfaces', {
        params: { skip: 0, limit: 100 }
      })
      // 确保 res.data 是数组
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setSavedInterfaces(data)
    } catch (e) {
      // 如果接口不存在，使用模拟数据
      setSavedInterfaces([
        { id: 1, name: '登录接口', method: 'POST', url: 'https://api.example.com/auth/login', starred: true },
        { id: 2, name: '获取用户列表', method: 'GET', url: 'https://api.example.com/users', starred: false },
        { id: 3, name: '创建订单', method: 'POST', url: 'https://api.example.com/orders', starred: true },
        { id: 4, name: '删除用户', method: 'DELETE', url: 'https://api.example.com/users/1', starred: false },
      ])
    } finally {
      setInterfaceLoading(false)
    }
  }

  useEffect(() => {
    loadSavedInterfaces()
  }, [])

  // 选择接口
  const handleSelectInterface = (item: SavedInterface) => {
    setSelectedInterface(item)
    setMethod(item.method)
    setUrl(item.url)
    if (item.headers) {
      setHeaders(JSON.stringify(item.headers, null, 2))
    }
    if (item.params) {
      setParams(JSON.stringify(item.params, null, 2))
    }
    if (item.body) {
      setBody(JSON.stringify(item.body, null, 2))
    }
  }

  // 执行请求
  const handleExecute = async () => {
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

      // 添加到历史记录
      const historyItem: HistoryItem = {
        id: Date.now(),
        method,
        url,
        status: res.data.status_code,
        duration: res.data.duration_ms,
        time: new Date().toLocaleTimeString()
      }
      setHistory(prev => [historyItem, ...prev.slice(0, 19)])

    } catch (e: any) {
      if (e.message?.includes('JSON')) {
        message.error('JSON 格式错误')
      } else {
        message.error(e.response?.data?.detail || '请求失败')
      }
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

  // 复制响应
  const handleCopy = () => {
    if (result?.response_body) {
      navigator.clipboard.writeText(JSON.stringify(result.response_body, null, 2))
      message.success('已复制到剪贴板')
    }
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

  // 保存当前请求为接口
  const handleSaveAsInterface = () => {
    message.success('功能开发中...')
  }

  // 过滤接口 - 确保 savedInterfaces 是数组
  const filteredInterfaces = Array.isArray(savedInterfaces) 
    ? savedInterfaces.filter(item => 
        item?.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item?.url?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item?.method?.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : []

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#fff' }}>
      {/* 左侧 - 接口列表 + 请求配置 */}
      <Sider width="45%" style={{ background: '#fff', borderRight: '1px solid #e8e8e8' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 接口列表区 */}
          <Card 
            title={
              <span>
                <ApiOutlined style={{ marginRight: 8 }} />
                接口列表
              </span>
            }
            size="small"
            style={{ borderBottom: '1px solid #e8e8e8' }}
            styles={{ body: { padding: 0 } }}
          >
            {/* 搜索框 */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Input 
                prefix={<SearchOutlined />}
                placeholder="搜索接口..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                allowClear
              />
            </div>
            
            {/* 接口列表 */}
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {interfaceLoading ? (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <Spin size="small" />
                </div>
              ) : filteredInterfaces.length === 0 ? (
                <Empty description="暂无接口" style={{ padding: 20 }} />
              ) : (
                <List
                  dataSource={filteredInterfaces}
                  renderItem={item => (
                    <List.Item 
                      style={{ 
                        padding: '8px 12px', 
                        cursor: 'pointer',
                        background: selectedInterface?.id === item.id ? '#e6f7ff' : 'transparent'
                      }}
                      onClick={() => handleSelectInterface(item)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        <Tag color={methodColors[item.method]} style={{ minWidth: 60, textAlign: 'center' }}>
                          {item.method}
                        </Tag>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.url}
                          </div>
                        </div>
                        {item.starred && <StarFilled style={{ color: '#faad14' }} />}
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>

          {/* 请求配置区 */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {/* 标题栏 */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>
                <PlayCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                请求配置
              </h3>
              <Space>
                <Button size="small" icon={<SaveOutlined />} onClick={handleSaveAsInterface}>
                  保存
                </Button>
              </Space>
            </div>

            {/* URL 输入区 */}
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Select 
                value={method} 
                onChange={setMethod}
                style={{ width: 100 }}
              >
                <Option value="GET"><Tag color="green">GET</Tag></Option>
                <Option value="POST"><Tag color="blue">POST</Tag></Option>
                <Option value="PUT"><Tag color="orange">PUT</Tag></Option>
                <Option value="DELETE"><Tag color="red">DELETE</Tag></Option>
                <Option value="PATCH"><Tag color="cyan">PATCH</Tag></Option>
              </Select>
              <Input 
                placeholder="输入请求地址，如 https://api.example.com/users"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onPressEnter={handleExecute}
                style={{ flex: 1 }}
              />
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                loading={executing}
                onClick={handleExecute}
              >
                发送
              </Button>
            </Space.Compact>

            {/* 请求参数区 */}
            <Tabs 
              defaultActiveKey="params"
              size="small"
              items={[
                {
                  key: 'params',
                  label: 'Params',
                  children: (
                    <div>
                      <div style={{ marginBottom: 8, textAlign: 'right' }}>
                        <Button size="small" onClick={() => formatJson(params, setParams)}>
                          格式化
                        </Button>
                      </div>
                      <TextArea
                        rows={6}
                        value={params}
                        onChange={e => setParams(e.target.value)}
                        placeholder='{"key": "value"}'
                        style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 12 }}
                      />
                    </div>
                  )
                },
                {
                  key: 'headers',
                  label: 'Headers',
                  children: (
                    <div>
                      <div style={{ marginBottom: 8, textAlign: 'right' }}>
                        <Button size="small" onClick={() => formatJson(headers, setHeaders)}>
                          格式化
                        </Button>
                      </div>
                      <TextArea
                        rows={6}
                        value={headers}
                        onChange={e => setHeaders(e.target.value)}
                        placeholder='{"Content-Type": "application/json"}'
                        style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 12 }}
                      />
                    </div>
                  )
                },
                {
                  key: 'body',
                  label: 'Body',
                  children: (
                    <div>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <Select 
                          value={bodyType} 
                          onChange={setBodyType}
                          style={{ width: 120 }}
                          size="small"
                        >
                          <Option value="json">JSON</Option>
                          <Option value="form">Form Data</Option>
                          <Option value="raw">Raw</Option>
                        </Select>
                        <Button size="small" onClick={() => formatJson(body, setBody)}>
                          格式化
                        </Button>
                      </div>
                      <TextArea
                        rows={8}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder='{"name": "value"}'
                        style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 12 }}
                      />
                    </div>
                  )
                }
              ]}
            />

            {/* 历史记录 */}
            {history.length > 0 && (
              <Card 
                title={<span><HistoryOutlined /> 最近请求</span>} 
                size="small"
                style={{ marginTop: 16 }}
              >
                <div style={{ maxHeight: 150, overflow: 'auto' }}>
                  {history.map(item => (
                    <div 
                      key={item.id}
                      style={{ 
                        padding: '6px 0', 
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setUrl(item.url)
                        setMethod(item.method)
                      }}
                    >
                      <Tag color={methodColors[item.method]} style={{ margin: 0 }}>{item.method}</Tag>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {item.url}
                      </span>
                      <Tag color={item.status < 400 ? 'success' : 'error'} style={{ margin: 0 }}>{item.status}</Tag>
                      <span style={{ fontSize: 11, color: '#999' }}>{item.duration}ms</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </Sider>

      {/* 右侧 - 响应结果 */}
      <Content style={{ background: '#fafafa' }}>
        <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
          {executing ? (
            <div style={{ textAlign: 'center', padding: 100 }}>
              <Spin size="large" />
              <p style={{ marginTop: 16, color: '#999' }}>请求发送中...</p>
            </div>
          ) : result ? (
            <>
              {/* 响应状态 */}
              <Card size="small" style={{ marginBottom: 16 }}>
                <Space split={<Divider type="vertical" />}>
                  <span>
                    状态: <Tag color={result.status_code < 400 ? 'success' : 'error'}>
                      {result.status_code || 'Error'}
                    </Tag>
                  </span>
                  <span>耗时: <Tag color="blue">{result.duration_ms}ms</Tag></span>
                  <span>
                    结果: {result.success ? 
                      <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag> : 
                      <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>
                    }
                  </span>
                  <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
                    复制
                  </Button>
                </Space>
              </Card>

              {/* 错误信息 */}
              {result.error && (
                <Card size="small" style={{ marginBottom: 16 }}>
                  <pre style={{ color: '#ff4d4f', margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                    {result.error}
                  </pre>
                </Card>
              )}

              {/* 响应内容 */}
              <Tabs 
                defaultActiveKey="body"
                items={[
                  {
                    key: 'body',
                    label: '响应体',
                    children: (
                      <pre style={{ 
                        background: '#1e1e1e', 
                        color: '#d4d4d4',
                        padding: 16, 
                        borderRadius: 4,
                        maxHeight: 500,
                        overflow: 'auto',
                        fontSize: 12,
                        fontFamily: 'Monaco, Menlo, monospace'
                      }}>
                        {JSON.stringify(result.response_body, null, 2)}
                      </pre>
                    )
                  },
                  {
                    key: 'headers',
                    label: '响应头',
                    children: (
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 16, 
                        borderRadius: 4,
                        maxHeight: 300,
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(result.response_headers, null, 2)}
                      </pre>
                    )
                  }
                ]}
              />
            </>
          ) : (
            <Empty 
              description="从左侧选择接口或手动输入请求地址" 
              style={{ marginTop: 100 }}
            />
          )}
        </div>
      </Content>
    </Layout>
  )
}
