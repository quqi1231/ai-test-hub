import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message,
  Tabs, Statistic, Row, Col, Tooltip, Popconfirm, Badge, Empty
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, EditOutlined, BookOutlined,
  SearchOutlined, ImportOutlined, ExportOutlined, FireOutlined,
  ThunderboltOutlined, SafetyOutlined, BugOutlined, RocketOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'

const { TextArea } = Input

const API_BASE_URL = 'http://localhost:8000'

interface KnowledgeItem {
  id: number
  category: string
  title: string
  content: string
  tags: string[]
  keywords?: string
  usage_count: number
  effectiveness_score: number
  source: string
  created_at: string
  updated_at: string
}

interface KnowledgeStats {
  total_count: number
  by_category: Record<string, number>
  total_usage: number
  avg_effectiveness: number
}

// 类别配置
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; desc: string }> = {
  '业务规则': { icon: <BookOutlined />, color: 'blue', desc: '常见业务逻辑和验证规则' },
  '测试模式': { icon: <RocketOutlined />, color: 'green', desc: '成熟的测试设计模式' },
  '历史踩坑': { icon: <BugOutlined />, color: 'orange', desc: '团队遇到的易错点和缺陷' },
  '风险场景': { icon: <SafetyOutlined />, color: 'red', desc: '高风险和安全相关测试' },
  '性能经验': { icon: <ThunderboltOutlined />, color: 'purple', desc: '性能测试相关经验' },
  '安全规范': { icon: <SafetyOutlined />, color: 'magenta', desc: '安全测试规范和最佳实践' }
}

export default function KnowledgeBase() {
  const [loading, setLoading] = useState(false)
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([])
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>()
  const [form] = Form.useForm()

  // 获取知识库列表
  const fetchKnowledge = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.append('category', selectedCategory)
      if (searchKeyword) params.append('keyword', searchKeyword)
      
      const response = await fetch(`${API_BASE_URL}/api/knowledge/list?${params}`)
      const data = await response.json()
      setKnowledgeList(data)
    } catch (error) {
      message.error('获取知识库列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('获取统计失败', error)
    }
  }

  // 获取类别列表
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/categories`)
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('获取类别失败', error)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchStats()
    fetchKnowledge()
  }, [selectedCategory, searchKeyword])

  // 添加/编辑知识
  const handleSubmit = async (values: any) => {
    try {
      const url = editingItem 
        ? `${API_BASE_URL}/api/knowledge/${editingItem.id}`
        : `${API_BASE_URL}/api/knowledge/add`
      
      const method = editingItem ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          tags: values.tags || [],
          source: '手动添加'
        })
      })

      if (response.ok) {
        message.success(editingItem ? '更新成功' : '添加成功')
        setModalVisible(false)
        form.resetFields()
        setEditingItem(null)
        fetchKnowledge()
        fetchStats()
      } else {
        message.error('操作失败')
      }
    } catch (error) {
      message.error('网络错误')
    }
  }

  // 删除知识
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        message.success('删除成功')
        fetchKnowledge()
        fetchStats()
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 打开编辑弹窗
  const openEditModal = (item: KnowledgeItem) => {
    setEditingItem(item)
    form.setFieldsValue({
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags,
      keywords: item.keywords
    })
    setModalVisible(true)
  }

  // 打开添加弹窗
  const openAddModal = () => {
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 表格列定义
  const columns = [
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const config = CATEGORY_CONFIG[category] || { icon: <BookOutlined />, color: 'default' }
        return (
          <Tag color={config.color} icon={config.icon}>
            {category}
          </Tag>
        )
      }
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title: string) => <strong>{title}</strong>
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          {content.length > 60 ? content.slice(0, 60) + '...' : content}
        </Tooltip>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags?.map((tag, i) => (
            <Tag key={i} style={{ margin: 0 }}>{tag}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      width: 100,
      sorter: (a: KnowledgeItem, b: KnowledgeItem) => a.usage_count - b.usage_count,
      render: (count: number) => (
        <Badge count={count} showZero color="#722ed1" />
      )
    },
    {
      title: '有效性',
      dataIndex: 'effectiveness_score',
      key: 'effectiveness_score',
      width: 100,
      sorter: (a: KnowledgeItem, b: KnowledgeItem) => a.effectiveness_score - b.effectiveness_score,
      render: (score: number) => (
        <Tag color={score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red'}>
          {score}%
        </Tag>
      )
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: KnowledgeItem) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条知识吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>
          <BookOutlined style={{ marginRight: 8 }} />
          RAG 知识库
          <Tooltip title="让 AI 记住团队的测试经验，避免重复踩坑">
            <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'help' }} />
          </Tooltip>
        </h1>
        <Space>
          <Input.Search
            placeholder="搜索知识..."
            allowClear
            style={{ width: 200 }}
            onSearch={setSearchKeyword}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            添加知识
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic 
                title="知识总数" 
                value={stats.total_count} 
                prefix={<BookOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="总使用次数" 
                value={stats.total_usage} 
                prefix={<FireOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="平均有效性" 
                value={stats.avg_effectiveness} 
                suffix="%"
                precision={1}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="类别数" 
                value={Object.keys(stats.by_category).length} 
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <Tabs 
          activeKey={selectedCategory || ''} 
          onChange={setSelectedCategory}
          items={[
            {
              key: '',
              label: '全部',
              children: (
                <Table
                  columns={columns}
                  dataSource={knowledgeList}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  locale={{
                    emptyText: (
                      <Empty description="暂无知识，点击添加知识开始积累团队经验" />
                    )
                  }}
                />
              )
            },
            ...Object.entries(categories).map(([name, desc]) => {
              const config = CATEGORY_CONFIG[name] || { icon: <BookOutlined />, color: 'default' }
              return {
                key: name,
                label: (
                  <span>
                    {config.icon}
                    <span style={{ marginLeft: 4 }}>{name}</span>
                    <Badge 
                      count={stats?.by_category[name] || 0} 
                      style={{ marginLeft: 8 }}
                      showZero
                    />
                  </span>
                ),
                children: (
                  <Table
                    columns={columns}
                    dataSource={knowledgeList.filter(k => k.category === name)}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                )
              }
            })
          ]}
        />
      </Card>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑知识' : '添加知识'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingItem(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="category"
            label="类别"
            rules={[{ required: true, message: '请选择类别' }]}
          >
            <Select placeholder="选择知识类别">
              {Object.entries(categories).map(([name, desc]) => (
                <Select.Option key={name} value={name}>
                  <Space>
                    {CATEGORY_CONFIG[name]?.icon}
                    {name} - {desc}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="简短的标题描述这条知识" />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea 
              rows={6} 
              placeholder="详细描述知识内容，例如：踩坑经验、测试技巧、业务规则等" 
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select 
              mode="tags" 
              placeholder="输入标签后按回车添加"
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item
            name="keywords"
            label="关键词"
          >
            <Input placeholder="关键词，用逗号分隔，用于提高检索命中率" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
