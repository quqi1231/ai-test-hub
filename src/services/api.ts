import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 自动添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理 401 未授权
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ==================== 接口管理 ====================

export interface Interface {
  id?: number
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  description?: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: any
  content_type?: string
  project_id?: number
}

export const interfaceApi = {
  list: (projectId?: number) => 
    apiClient.get('/api/interfaces/', { params: { project_id: projectId } }),
  
  get: (id: number) => 
    apiClient.get(`/api/interfaces/${id}`),
  
  create: (data: Interface) => 
    apiClient.post('/api/interfaces/', data),
  
  update: (id: number, data: Partial<Interface>) => 
    apiClient.put(`/api/interfaces/${id}`, data),
  
  delete: (id: number) => 
    apiClient.delete(`/api/interfaces/${id}`),
}

// ==================== 用例管理 ====================

export interface TestCase {
  id?: number
  name: string
  description?: string
  project_id: number
  interface_id?: number
  request_config?: Record<string, any>
  assertions?: Record<string, any>
}

export const caseApi = {
  list: (projectId?: number) => 
    apiClient.get('/api/cases/', { params: { project_id: projectId } }),
  
  get: (id: number) => 
    apiClient.get(`/api/cases/${id}`),
  
  create: (data: TestCase) => 
    apiClient.post('/api/cases/', data),
  
  update: (id: number, data: Partial<TestCase>) => 
    apiClient.put(`/api/cases/${id}`, data),
  
  delete: (id: number) => 
    apiClient.delete(`/api/cases/${id}`),
}

// ==================== 执行请求类型 ====================

// 变量提取配置
export interface VariableExtractor {
  variable_name: string
  from: 'body' | 'header' | 'status' | 'cookie'
  json_path?: string
  key?: string
  regex?: string
}

// 依赖接口配置
export interface Dependency {
  interface_id?: number
  url?: string
  method?: string
  extractors?: VariableExtractor[]
}

// 断言配置
export interface Assertion {
  type: 'statusCode' | 'responseBody' | 'header' | 'jsonPath' | 'responseTime'
  expected: string
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'exists' | 'notExists' | 'greaterThan' | 'lessThan'
  json_path?: string
  header_key?: string
}

// 单接口执行请求
export interface ExecuteRequest {
  interface_id?: number
  url?: string
  method?: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: any
  content_type?: string
  extractors?: VariableExtractor[]
  dependencies?: Dependency[]
  assertions?: Assertion[]
  files?: Record<string, string>
}

// 参数化执行请求
export interface ParametricRequest {
  interface_id?: number
  url?: string
  method?: string
  headers?: Record<string, string>
  content_type?: string
  extractors?: VariableExtractor[]
  assertions?: Assertion[]
  parameters: Record<string, any>[]
}

// 批量执行请求
export interface BatchExecuteRequest {
  requests: ExecuteRequest[]
  continue_on_error?: boolean
}

// ==================== 响应类型 ====================

// 单个接口执行结果
export interface SingleExecuteResult {
  interface_id: number
  interface_name: string
  url: string
  method: string
  status_code?: number
  response_body?: any
  response_headers?: Record<string, string>
  duration_ms?: number
  success: boolean
  error?: string
  extracted_variables?: Record<string, any>
  assertion_results?: AssertionResult[]
}

// 断言结果
export interface AssertionResult {
  type: string
  expected: string
  actual?: string
  passed: boolean
  message: string
}

// 执行响应
export interface ExecuteResponse {
  success: boolean
  total_duration_ms: number
  results: SingleExecuteResult[]
  variables?: Record<string, any>
  assertions?: AssertionResult[]
}

// 参数化执行响应
export interface ParametricResponse {
  success: boolean
  total_count: number
  passed_count: number
  failed_count: number
  results: any[]
  summary: {
    total: number
    passed: number
    failed: number
    pass_rate: string
    total_duration_ms: number
  }
}

// ==================== 环境管理 ====================

export interface Environment {
  id?: number
  project_id: number
  name: string
  base_url?: string
  variables?: Record<string, any>
  headers?: Record<string, string>
  description?: string
  is_active?: boolean
}

export const environmentApi = {
  list: (projectId: number) => 
    apiClient.get('/api/environments/', { params: { project_id: projectId } }),
  get: (id: number) => 
    apiClient.get(`/api/environments/${id}`),
  create: (data: Environment) => 
    apiClient.post('/api/environments/', data),
  update: (id: number, data: Partial<Environment>) => 
    apiClient.put(`/api/environments/${id}`, data),
  delete: (id: number) => 
    apiClient.delete(`/api/environments/${id}`),
  activate: (id: number) => 
    apiClient.post(`/api/environments/${id}/activate`),
}

// ==================== 数据源管理 ====================

export interface DataSource {
  id?: number
  name: string
  type: 'json' | 'csv' | 'excel'
  content: string
}

export const dataSourceApi = {
  list: () => apiClient.get('/api/data-sources/'),
  get: (id: number) => apiClient.get(`/api/data-sources/${id}`),
  create: (data: DataSource) => apiClient.post('/api/data-sources/', data),
  update: (id: number, data: Partial<DataSource>) => apiClient.put(`/api/data-sources/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/data-sources/${id}`),
}

// ==================== 执行 API ====================

export const executeApi = {
  // 单接口执行
  execute: (data: ExecuteRequest) => 
    apiClient.post('/api/execute/interface', data),
  
  // 参数化执行
  executeParametric: (data: ParametricRequest) => 
    apiClient.post('/api/execute/parametric', data),
  
  // 带断言执行
  executeWithAssertions: (data: ExecuteRequest) => 
    apiClient.post('/api/execute/with-assertions', data),
  
  // 批量执行
  executeBatch: (data: BatchExecuteRequest) => 
    apiClient.post('/api/execute/batch', data),
  
  // 执行测试用例
  executeTestCase: (caseId: number) => 
    apiClient.post(`/api/execute/test-case/${caseId}`),
}

// ==================== AI 功能 ====================

export const aiApi = {
  generateTestCases: (prompt: string, interfaceInfo?: any) => 
    apiClient.post('/api/ai/generate-cases', { prompt, interface_info: interfaceInfo }),
  
  generateTestReport: (testResults: any) => 
    apiClient.post('/api/ai/generate-report', { test_results: testResults }),
  
  analyzeError: (errorInfo: string) => 
    apiClient.post('/api/ai/analyze-error', { error_info: errorInfo }),
  
  generateFromDoc: (docContent: string) => 
    apiClient.post('/api/ai/generate-from-doc', { content: docContent }),
}

// ==================== 测试集管理 ====================

export interface TestSuite {
  id?: number
  name: string
  description?: string
  project_id: number
  case_ids?: number[]
}

export const testSuiteApi = {
  list: (projectId: number = 1) => 
    apiClient.get('/api/test-suites/', { params: { project_id: projectId } }),
  get: (id: number) => 
    apiClient.get(`/api/test-suites/${id}`),
  create: (data: TestSuite) => 
    apiClient.post('/api/test-suites/', data),
  update: (id: number, data: Partial<TestSuite>) => 
    apiClient.put(`/api/test-suites/${id}`, data),
  delete: (id: number) => 
    apiClient.delete(`/api/test-suites/${id}`),
  execute: (id: number, envId?: number) => 
    apiClient.post(`/api/test-suites/${id}/execute`, { environment_id: envId }),
}

export default apiClient
