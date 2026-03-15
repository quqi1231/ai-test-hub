import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Button, Space, Avatar } from 'antd'
import {
  DashboardOutlined,
  FolderOutlined,
  CheckSquareOutlined,
  ApiOutlined,
  RobotOutlined,
  ToolOutlined,
  BarChartOutlined,
  LogoutOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  SecurityScanOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  BookOutlined
} from '@ant-design/icons'

const { Header, Sider, Content } = Layout

// 一级菜单配置 - key 直接使用路径
const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/projects',
    icon: <FolderOutlined />,
    label: '项目管理',
  },
  {
    key: 'test-management',
    icon: <CheckSquareOutlined />,
    label: '测试管理',
    children: [
      { key: '/test-case', icon: <ExperimentOutlined />, label: '测试用例' },
      { key: '/test-suite', icon: <FolderOpenOutlined />, label: '测试集' },
      { key: '/test-results', icon: <BarChartOutlined />, label: '测试结果' },
    ]
  },
  {
    key: 'api-automation',
    icon: <ApiOutlined />,
    label: '接口自动化',
    children: [
      { key: '/api-automation/manual-test', icon: <PlayCircleOutlined />, label: '手动测试' },
      { key: '/api-automation', icon: <ApiOutlined />, label: '接口管理' },
      { key: '/api-automation/single-test', icon: <ThunderboltOutlined />, label: '单接口测试' },
      { key: '/api-automation/environments', icon: <EnvironmentOutlined />, label: '环境管理' },
      { key: '/api-automation/execute', icon: <PlayCircleOutlined />, label: '执行中心' },
      { key: '/api-automation/reports', icon: <FileTextOutlined />, label: '报告中心' },
    ]
  },
  {
    key: '/ui-automation',
    icon: <DesktopOutlined />,
    label: 'UI 自动化',
  },
  {
    key: '/performance-automation',
    icon: <ThunderboltOutlined />,
    label: '性能测试',
  },
  {
    key: '/security-automation',
    icon: <SecurityScanOutlined />,
    label: '安全测试',
  },
  {
    key: '/jenkins-ci',
    icon: <ToolOutlined />,
    label: 'CI/CD',
  },
  {
    key: '/knowledge-base',
    icon: <BookOutlined />,
    label: '知识库',
  },
  {
    key: '/ai-chat',
    icon: <RobotOutlined />,
    label: 'AI 助手',
  },
]

// 扁平化菜单用于路由匹配
function flattenMenu(items) {
  const result = []
  for (const item of items) {
    if (item.path) {
      result.push({ key: item.path, label: item.label })
    }
    if (item.children) {
      result.push(...flattenMenu(item.children))
    }
  }
  return result
}

const flatMenuItems = flattenMenu(menuItems)

function findMenuKeyByPath(path) {
  // 精确匹配
  for (const item of flatMenuItems) {
    if (item.key === path) return path
  }
  // 前缀匹配（比如 /api-automation/interfaces 匹配 /api-automation）
  for (const item of menuItems) {
    if (item.children && path.startsWith(item.key)) {
      return item.key
    }
  }
  return path
}

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 计算当前选中的菜单 key
  const getSelectedKeys = () => {
    const path = location.pathname
    // 对于接口自动化相关页面
    if (path.startsWith('/api-automation')) {
      return [path]
    }
    return [path]
  }

  // 获取展开的菜单 keys
  const getOpenKeys = () => {
    const path = location.pathname
    const opens = []
    
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.key === path || path.startsWith(child.key + '/')) {
            opens.push(item.key)
            break
          }
        }
      }
    }
    return opens
  }

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ 
          color: '#fff', 
          fontSize: 20, 
          fontWeight: 'bold',
          fontFamily: '"Noto Sans SC", sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <span>AI TestHub</span>
        </div>
        <Space>
          <span style={{ color: '#fff', marginRight: 8 }}>
            👤 {localStorage.getItem('username') || '用户'}
          </span>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('username')
              window.location.href = '/login'
            }}
            style={{ color: '#fff' }}
          >
            退出
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider 
          width={220} 
          style={{ 
            background: colorBgContainer,
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'sticky',
            top: 64,
            left: 0
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={handleMenuClick}
            inlineCollapsed={false}
          />
        </Sider>
        <Layout style={{ padding: '16px 24px' }}>
          <Content
            style={{
              padding: 20,
              margin: 0,
              minHeight: 'calc(100vh - 64px - 48px)',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
