/**
 * AI 测试用例生成组件
 */
import { useState } from 'react'
import { Card, Input, Button, List, Tag, Space, message, Modal, Select, Row, Col, Spin, Collapse, Alert } from 'antd'
import { RobotOutlined, PlayCircleOutlined, ImportOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Panel } = Collapse

const API_BASE_URL = 'http://localhost:8000'

interface GeneratedCase {
  name: string
  method: string
  url: string
  description: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: Record<string, any>
  body_type: string
  assertions: any[]
  tags: string[]
  performance?: {
    maxResponseTime?: number
    minQPS?: number
    concurrency?: number
  }
}

interface InvalidCase {
  case: GeneratedCase
  errors: string[]
}

export default function TestCaseGenerator() {
  const [requirement, setRequirement] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://jsonplaceholder.typicode.com')
  const [loading, setLoading] = useState(false)
  const [generatedCases, setGeneratedCases] = useState<GeneratedCase[]>([])
  const [selectedCases, setSelectedCases] = useState<number[]>([])
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [suiteName, setSuiteName] = useState('')
  const [testTypes, setTestTypes] = useState<string[]>(['function', 'performance', 'compatible'])
  const [parseInfo, setParseInfo] = useState<any>(null)

  // 生成测试用例
  const handleGenerate = async () => {
    if (!requirement.trim()) {
      message.error('请输入需求描述')
      return
    }

    setLoading(true)
    setGeneratedCases([])
    setSelectedCases([])
    setParseInfo(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-cases-ai/generate-test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement,
          base_url: baseUrl,
          test_types: testTypes
        })
      })
      
      const data = await response.json()
      
      if (data.cases) {
        setGeneratedCases(data.cases)
        setSelectedCases(data.cases.map((_: any, i: number) => i))  // 默认全选
        setParseInfo({
          parsed: data.parsed_count,
          valid: data.valid_count,
          invalid: data.invalid_count,
          invalidCases: data.invalid_cases
        })
        message.success(`生成完成：${data.valid_count} 个有效用例`)
      } else {
        message.error('生成失败，请重试')
      }
    } catch (error) {
      console.error('Generate error:', error)
      message.error('生成失败，请检查 Ollama 服务是否运行')
    } finally {
      setLoading(false)
    }
  }

  // 一键导入测试集
  const handleImport = async () => {
    if (!suiteName.trim()) {
      message.error('请输入测试集名称')
      return
    }
    if (selectedCases.length === 0) {
      message.error('请选择要导入的用例')
      return
    }

    const selected = selectedCases.map(i => generatedCases[i])
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/test-cases-ai/import-ai-cases?project_id=1&suite_name=${encodeURIComponent(suiteName)}`, 
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selected)
        }
      )
      const data = await response.json()
      
      if (response.ok) {
        message.success(data.message || '导入成功！')
        setImportModalVisible(false)
        // 重置
        setRequirement('')
        setGeneratedCases([])
        setSelectedCases([])
      } else {
        message.error(data.detail || '导入失败')
      }
    } catch (error) {
      message.error('导入失败')
    }
  }

  const toggleCase = (index: number) => {
    setSelectedCases(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const selectAll = (type?: string) => {
    if (type) {
      // 按类型选择
      const indices = generatedCases
        .map((c, i) => c.tags?.includes(type) ? i : -1)
        .filter(i => i >= 0)
      setSelectedCases(indices)
    } else {
      // 全选
      setSelectedCases(generatedCases.map((_, i) => i))
    }
  }

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'function': return 'green'
      case 'performance': return 'orange'
      case 'compatible': return 'purple'
      default: return 'default'
    }
  }

  const getTagText = (tag: string) => {
    switch (tag) {
      case 'function': return '功能'
      case 'performance': return '性能'
      case 'compatible': return '兼容'
      default: return tag
    }
  }

  return (
    <div>
      <Card title="🤖 AI 测试用例生成">
        <Row gutter={16}>
          <Col span={16}>
            <TextArea
              rows={4}
              placeholder="输入功能需求，如：用户登录功能，包含账号密码验证、验证码、记住密码等"
              value={requirement}
              onChange={e => setRequirement(e.target.value)}
              disabled={loading}
            />
          </Col>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="Base URL"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
              />
              <Select
                mode="multiple"
                placeholder="测试类型"
                value={testTypes}
                onChange={setTestTypes}
                style={{ width: '100%' }}
              >
                <Select.Option value="function">功能测试</Select.Option>
                <Select.Option value="performance">性能测试</Select.Option>
                <Select.Option value="compatible">兼容性测试</Select.Option>
              </Select>
              <Button 
                type="primary" 
                icon={<RobotOutlined />}
                onClick={handleGenerate}
                loading={loading}
                block
                size="large"
              >
                {loading ? 'AI 生成中...' : '生成测试用例'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 解析信息 */}
      {parseInfo && (
        <Card size="small" style={{ marginTop: 16 }}>
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>解析: {parseInfo.parsed} 个</span>
            <Tag color="green">有效: {parseInfo.valid} 个</Tag>
            {parseInfo.invalid > 0 && (
              <Tag color="red">无效: {parseInfo.invalid} 个</Tag>
            )}
          </Space>
          
          {parseInfo.invalidCases && parseInfo.invalidCases.length > 0 && (
            <Collapse size="small" style={{ marginTop: 8 }}>
              <Panel header="查看无效用例" key="1">
                {parseInfo.invalidCases.map((ic: InvalidCase, i: number) => (
                  <Alert 
                    key={i}
                    type="warning"
                    message={ic.case.name}
                    description={ic.errors.join(', ')}
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </Panel>
            </Collapse>
          )}
        </Card>
      )}

      {/* 生成结果 */}
      {generatedCases.length > 0 && (
        <Card 
          title={`生成结果 (${generatedCases.length} 个用例，已选 ${selectedCases.length} 个)`}
          style={{ marginTop: 16 }}
          extra={
            <Space>
              <Button size="small" onClick={() => selectAll('function')}>全选功能</Button>
              <Button size="small" onClick={() => selectAll('performance')}>全选性能</Button>
              <Button size="small" onClick={() => selectAll('compatible')}>全选兼容</Button>
              <Button size="small" onClick={() => selectAll()}>全选</Button>
              <Button 
                type="primary" 
                icon={<ImportOutlined />}
                disabled={selectedCases.length === 0}
                onClick={() => setImportModalVisible(true)}
              >
                一键导入测试集 ({selectedCases.length})
              </Button>
            </Space>
          }
        >
          <Spin spinning={loading}>
            <List
              dataSource={generatedCases}
              renderItem={(item, index) => (
                <List.Item
                  style={{ background: selectedCases.includes(index) ? '#f6ffed' : '#fff' }}
                  actions={[
                    <Checkbox 
                      checked={selectedCases.includes(index)}
                      onChange={() => toggleCase(index)}
                    />
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="blue">{item.method}</Tag>
                        <span>{item.name}</span>
                        {item.tags?.map(tag => (
                          <Tag key={tag} color={getTagColor(tag)}>
                            {getTagText(tag)}
                          </Tag>
                        ))}
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.url}</div>
                        <div style={{ color: '#888', fontSize: 12 }}>{item.description}</div>
                        {item.performance && (
                          <div style={{ fontSize: 12, color: '#fa8c16', marginTop: 4 }}>
                            性能要求: 
                            {item.performance.maxResponseTime && ` 响应<${item.performance.maxResponseTime}ms`}
                            {item.performance.concurrency && ` ${item.performance.concurrency}并发`}
                          </div>
                        )}
                        {item.assertions && item.assertions.length > 0 && (
                          <div style={{ fontSize: 12, color: '#1890ff', marginTop: 4 }}>
                            断言: {item.assertions.length} 个
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      )}

      {/* 导入 Modal */}
      <Modal
        title="一键导入测试集"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => setImportModalVisible(false)}
        okText="确认导入"
      >
        <Input
          placeholder="测试集名称"
          value={suiteName}
          onChange={e => setSuiteName(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <div>
          将导入 <b style={{ color: '#1890ff' }}>{selectedCases.length}</b> 个测试用例
          到新测试集 <b>"{suiteName || '未命名'}"</b>
        </div>
      </Modal>
    </div>
  )
}
