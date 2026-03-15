/**
 * 单接口测试 - 接口自动化模块
 * 左右分栏：左侧请求配置，右侧响应结果
 */
import { useState } from 'react'
import {
  Layout, Card, Button, Space, Select, Input, Tabs, message,
  Tag, Empty, Spin, Divider, Row, Col
} from 'antd'
import {
  PlayCircleOutlined, SaveOutlined,
  CopyOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ThunderboltOutlined
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

export default function SingleApiTest() {
  // 请求配置
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [params, setParams] = useState('{}')
  const [body, setBody] = useState('{}')
  
  // 执行状态
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ExecuteResult | null>(null)

  // 方法颜色
  const methodColors: Record<string, string> = {
    GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red', PATCH: 'cyan'
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
        body_type: 'json',
        timeout: 30
      })

      setResult(res.data)
      message.success('请求成功')

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

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#fff' }}>
      {/* 左侧 - 请求配置 */}
      <Sider width="50%" style={{ background: '#fff', borderRight: '1px solid #e8e8e8' }}>
        <div style={{ padding: 20, height: '100%', overflow: 'auto' }}>
          {/* 标题 */}
          <h2 style={{ marginBottom: 20 }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            单接口测试
          </h2>

          {/* URL 输入区 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Select 
                value={method} 
                onChange={setMethod}
                style={{ width: 100 }}
              >
                <Option value="GET"><Tag color="green" style={{ margin: 0 }}>GET</Tag></Option>
                <Option value="POST"><Tag color="blue" style={{ margin: 0 }}>POST</Tag></Option>
                <Option value="PUT"><Tag color="orange" style={{ margin: 0 }}>PUT</Tag></Option>
                <Option value="DELETE"><Tag color="red" style={{ margin: 0 }}>DELETE</Tag></Option>
                <Option value="PATCH"><Tag color="cyan" style={{ margin: 0 }}>PATCH</Tag></Option>
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
          </Card>

          {/* 请求参数区 */}
          <Tabs 
            defaultActiveKey="params"
            items={[
              {
                key: 'params',
                label: 'Query Params',
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
                      style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }}
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
                      style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }}
                    />
                  </div>
                )
              },
              {
                key: 'body',
                label: 'Body',
                children: (
                  <div>
                    <div style={{ marginBottom: 8, textAlign: 'right' }}>
                      <Button size="small" onClick={() => formatJson(body, setBody)}>
                        格式化
                      </Button>
                    </div>
                    <TextArea
                      rows={10}
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
        </div>
      </Sider>

      {/* 右侧 - 响应结果 */}
      <Content style={{ background: '#fafafa' }}>
        <div style={{ padding: 20, height: '100%', overflow: 'auto' }}>
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
                        fontSize: 13,
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
                        fontSize: 13
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
              description="输入请求地址后点击发送" 
              style={{ marginTop: 100 }}
            />
          )}
        </div>
      </Content>
    </Layout>
  )
}
