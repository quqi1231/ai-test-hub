import { useState, useRef, useEffect } from 'react'
import { Input, Button, List, Avatar, Card, Space, Spin, message, Select, Tooltip, Tag, Collapse, Switch, Typography } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined, StarOutlined, SettingOutlined, QuestionCircleOutlined, BookOutlined, ThunderboltOutlined, FireOutlined } from '@ant-design/icons'

const { Panel } = Collapse
const { Text } = Typography

// 后端 API 地址
const API_BASE_URL = 'http://localhost:8000'

interface KnowledgeReference {
  id: number
  category: string
  title: string
  content: string
  score: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  knowledgeReferences?: KnowledgeReference[]
  isStreaming?: boolean
}

export default function AiChat() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('qwen3:8b')
  const [availableModels, setAvailableModels] = useState<string[]>(['qwen3:8b'])
  const [useKnowledge, setUseKnowledge] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是 AI TestHub 智能测试助手 🤖\n\n我可以帮你：\n- ✨ 根据需求生成测试用例\n- 📝 总结测试报告\n- ⚡ 分析接口测试结果\n- 🔍 提供测试优化建议\n\n📚 **RAG 知识库已启用**：我会参考团队的测试经验库来回答问题，避免重复踩坑！',
      timestamp: new Date(),
    }
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 获取可用模型
  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-chat/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models)
        setModel(data.current || data.models[0])
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
      // 使用默认模型
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 流式处理响应
  const handleStreamResponse = async (userMessage: Message) => {
    const aiMessageId = (Date.now() + 1).toString()
    
    // 初始化 AI 消息
    setMessages(prev => [...prev, { 
      id: aiMessageId, 
      role: 'assistant', 
      content: '', 
      timestamp: new Date(),
      isStreaming: true
    }])

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-chat/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
          use_knowledge: useKnowledge,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // 获取知识库引用（从响应头）
      const knowledgeHeader = response.headers.get('X-Knowledge-References')
      let knowledgeReferences: KnowledgeReference[] = []
      if (knowledgeHeader) {
        try {
          knowledgeReferences = JSON.parse(knowledgeHeader)
        } catch {
          // 解析失败则忽略
        }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                fullContent += data.content
                // 更新消息内容
                setMessages(prev => prev.map(m => 
                  m.id === aiMessageId 
                    ? { ...m, content: fullContent } 
                    : m
                ))
              }
              if (data.done) {
                // 流结束
                setMessages(prev => prev.map(m => 
                  m.id === aiMessageId 
                    ? { ...m, content: fullContent, isStreaming: false, knowledgeReferences } 
                    : m
                ))
              }
              if (data.error) {
                throw new Error(data.error)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 如果流正常结束但没有收到 done 标记
      setMessages(prev => prev.map(m => 
        m.id === aiMessageId 
          ? { ...m, content: fullContent || 'AI 响应为空', isStreaming: false, knowledgeReferences } 
          : m
      ))

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      message.error(`AI 调用失败: ${errorMsg}`)
      setMessages(prev => prev.map(m => 
        m.id === aiMessageId 
          ? { ...m, content: `抱歉，AI 服务调用失败: ${errorMsg}\n\n请检查后端服务是否正常运行。`, isStreaming: false } 
          : m
      ))
    }
  }

  // 非流式处理响应（备用）
  const handleNonStreamResponse = async (userMessage: Message) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-chat/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
          use_knowledge: useKnowledge,
          stream: false
        })
      })

      const data = await response.json()
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'AI 响应为空',
        timestamp: new Date(),
        knowledgeReferences: data.knowledge_references || []
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      message.error(`AI 调用失败: ${errorMsg}`)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，AI 服务调用失败: ${errorMsg}\n\n请检查后端服务是否正常运行。`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // 使用流式响应
    await handleStreamResponse(userMessage)

    setLoading(false)
  }

  // 渲染知识库引用
  const renderKnowledgeReferences = (refs?: KnowledgeReference[]) => {
    if (!refs || refs.length === 0) return null

    return (
      <Collapse 
        size="small" 
        style={{ marginTop: 8, marginBottom: 8 }}
        defaultActiveKey={[]}
      >
        <Panel 
          header={
            <Space>
              <BookOutlined style={{ color: '#722ed1' }} />
              <span>参考知识库 ({refs.length} 条)</span>
            </Space>
          } 
          key="1"
        >
          {refs.map((ref, index) => (
            <div key={ref.id || index} style={{ marginBottom: 8 }}>
              <Space>
                <Tag color={
                  ref.category === '业务规则' ? 'blue' :
                  ref.category === '测试模式' ? 'green' :
                  ref.category === '历史踩坑' ? 'orange' :
                  ref.category === '风险场景' ? 'red' :
                  'purple'
                }>
                  {ref.category}
                </Tag>
                <Text strong>{ref.title}</Text>
              </Space>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {ref.content.length > 100 ? ref.content.slice(0, 100) + '...' : ref.content}
              </div>
            </div>
          ))}
        </Panel>
      </Collapse>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>
          <StarOutlined style={{ marginRight: 8 }} />
          AI 助手
          {useKnowledge && (
            <Tag color="purple" style={{ marginLeft: 8 }}>
              <BookOutlined /> RAG 增强中
            </Tag>
          )}
          <Tooltip title="基于本地 Ollama 提供AI能力，集成知识库增强">
            <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'help' }} />
          </Tooltip>
        </h1>
        <Space>
          <span style={{ color: '#666' }}>知识库:</span>
          <Switch 
            checked={useKnowledge} 
            onChange={setUseKnowledge}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
          <span style={{ color: '#666', marginLeft: 8 }}>模型:</span>
          <Select
            value={model}
            onChange={setModel}
            style={{ width: 150 }}
            disabled={loading}
          >
            {availableModels.map(m => (
              <Select.Option key={m} value={m}>{m}</Select.Option>
            ))}
          </Select>
          <Tooltip title="刷新模型列表">
            <Button icon={<SettingOutlined />} onClick={fetchModels} size="small" />
          </Tooltip>
        </Space>
      </div>

      <Card 
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <List
            dataSource={messages}
            renderItem={(item) => (
              <List.Item style={{ border: 'none', justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <Space align="start" style={{ flexDirection: item.role === 'user' ? 'row-reverse' : 'row', maxWidth: '85%' }}>
                  <Avatar 
                    icon={item.role === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                    style={{ 
                      backgroundColor: item.role === 'user' ? '#1890ff' : '#722ed1' 
                    }}
                  />
                  <div style={{ 
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: item.role === 'user' ? '#e6f7ff' : '#f9f0ff',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: 13
                  }}>
                    {item.content}
                    {item.isStreaming && <span className="typing-cursor">▊</span>}
                    {item.role === 'assistant' && renderKnowledgeReferences(item.knowledgeReferences)}
                  </div>
                </Space>
              </List.Item>
            )}
          />
          {loading && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin description="AI 思考中..." />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSend}
              placeholder={useKnowledge ? "输入测试需求，AI 将结合知识库为你生成答案..." : "输入测试需求，让 AI 帮你生成测试用例..."}
              disabled={loading}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading}>
              发送
            </Button>
          </Space.Compact>
          <div style={{ marginTop: 8, fontSize: 12, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
            <span>
              💡 提示：可以请求如"帮我生成登录接口的测试用例"或"分析这个接口返回的数据结构"
            </span>
            {useKnowledge && (
              <span>
                <FireOutlined style={{ color: '#722ed1' }} /> 知识库增强已开启，AI 会参考团队经验
              </span>
            )}
          </div>
        </div>
      </Card>

      <style>{`
        .typing-cursor {
          animation: blink 1s infinite;
          color: #722ed1;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
