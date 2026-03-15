/**
 * 认证工具函数
 */

// 获取认证头的辅助函数
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// 检查是否已登录
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token')
}

// 获取当前用户名
export const getCurrentUsername = (): string => {
  return localStorage.getItem('username') || ''
}

// 退出登录
export const logout = (): void => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  window.location.href = '/login'
}
