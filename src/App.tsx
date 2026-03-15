import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from './components/MainLayout'
import Dashboard from './pages/Dashboard'
import ProjectList from './pages/ProjectList'
import TestCase from './pages/TestCase'
import ApiAutomation from './pages/ApiAutomation'
import ApiInterfaces from './pages/api/ApiInterfaces'
import ApiEnvironments from './pages/api/ApiEnvironments'
import ApiTestSuites from './pages/api/ApiTestSuites'
import ApiExecute from './pages/api/ApiExecute'
import SingleApiTest from './pages/api/SingleApiTest'
import ManualTest from './pages/api/ManualTest'
import ApiReports from './pages/api/ApiReports'
import AiChat from './pages/AiChat'
import JenkinsCI from './pages/JenkinsCI'
import TestResults from './pages/TestResults'
import Login from './pages/Login'
import UIAutomation from './pages/UIAutomation'
import PerformanceAutomation from './pages/PerformanceAutomation'
import SecurityAutomation from './pages/SecurityAutomation'
import KnowledgeBase from './pages/KnowledgeBase'

// 路由守卫：检查是否已登录
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          {/* 登录页面 - 不需要守卫 */}
          <Route path="/login" element={<Login />} />
          
          {/* 受保护的路由 */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* 仪表盘和项目管理 */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<ProjectList />} />
            
            {/* 测试管理 */}
            <Route path="test-case" element={<TestCase />} />
            <Route path="test-suite" element={<ApiTestSuites />} />
            <Route path="test-results" element={<TestResults />} />
            
            {/* 接口自动化 */}
            <Route path="api-automation" element={<ApiAutomation />} />
            <Route path="api-automation/single-test" element={<SingleApiTest />} />
            <Route path="api-automation/manual-test" element={<ManualTest />} />
            <Route path="api-automation/environments" element={<ApiEnvironments />} />
            <Route path="api-automation/execute" element={<ApiExecute />} />
            <Route path="api-automation/reports" element={<ApiReports />} />
            
            {/* 其他模块 */}
            <Route path="ui-automation" element={<UIAutomation />} />
            <Route path="performance-automation" element={<PerformanceAutomation />} />
            <Route path="security-automation" element={<SecurityAutomation />} />
            <Route path="jenkins-ci" element={<JenkinsCI />} />
            <Route path="knowledge-base" element={<KnowledgeBase />} />
            <Route path="ai-chat" element={<AiChat />} />
          </Route>
          
          {/* 未匹配的路由重定向到仪表盘或登录 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
