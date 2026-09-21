import type { BaseResponseInfo } from './types'

export class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public raw?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const TOKEN_KEY = 'X-Access-Token'
const API_BASE_URL = '/ERPSystem-boot'

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string, remember = true): void => {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, any>
  body?: any
  timeoutMs?: number
}

export async function request<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, timeoutMs = 20000, headers: customHeaders, ...restOptions } = options

  // Ensure full URL is prefixed with backend base path for proxying
  let fullUrl = url
  if (
    !fullUrl.startsWith('http://') &&
    !fullUrl.startsWith('https://') &&
    !fullUrl.startsWith('/ERPSystem-boot') &&
    !fullUrl.startsWith('/jshERP-boot')
  ) {
    fullUrl = `${API_BASE_URL}${fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`}`
  }

  // Build query string if params present
  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v))
      }
    })
    const queryString = query.toString()
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
    }
  }

  const token = getToken()
  const headers = new Headers(customHeaders)

  if (token) {
    headers.set('X-Access-Token', token)
  }

  let finalBody: any = body
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    headers.set('Content-Type', 'application/json')
    finalBody = JSON.stringify(body)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(fullUrl, {
      ...restOptions,
      headers,
      body: finalBody,
      signal: options.signal || controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 401) {
      removeToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      throw new ApiError(401, 'Session expired or unauthenticated. Please log in again.')
    }

    if (response.status === 403) {
      const text = await response.text()
      let json: any = null
      try {
        json = JSON.parse(text)
      } catch {
        json = text
      }
      const errorMsg =
        json?.data?.message ||
        json?.msg ||
        json?.data?.error ||
        (typeof json === 'string' && json ? json : 'Access denied: You do not have permission to perform this action.')
      throw new ApiError(403, errorMsg, json)
    }

    const text = await response.text()
    if (text === 'loginOut' || text.includes('loginOut')) {
      removeToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      throw new ApiError(401, 'Session timed out. Please log in again.')
    }

    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }

    if (!response.ok) {
      throw new ApiError(response.status, json?.msg || `HTTP Error ${response.status}`, json)
    }

    // Spring Boot BaseResponseInfo unwrap
    if (json && typeof json === 'object' && 'code' in json) {
      const baseRes = json as BaseResponseInfo<T>
      if (baseRes.code === 200) {
        if (baseRes.data && typeof baseRes.data === 'object' && !Array.isArray(baseRes.data)) {
          return Object.assign({}, baseRes, baseRes.data) as any
        }
        return baseRes as any
      } else {
        let errorMsg = 'Operation failed'
        if (typeof baseRes.msg === 'string' && baseRes.msg) {
          errorMsg = baseRes.msg
        } else if (typeof baseRes.data === 'string' && baseRes.data) {
          errorMsg = baseRes.data
        } else if (baseRes.data && typeof baseRes.data === 'object' && 'message' in (baseRes.data as any)) {
          errorMsg = (baseRes.data as any).message
        }
        throw new ApiError(baseRes.code, errorMsg, json)
      }
    }

    return json as T
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout. Please check your network connection.')
    }
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error.message || 'Network communication failure')
  }
}

export const http = {
  get: <T = any>(url: string, paramsOrConfig?: Record<string, any>, options?: RequestOptions) => {
    let finalParams = paramsOrConfig
    let finalOptions: RequestOptions = options || {}
    if (paramsOrConfig && 'params' in paramsOrConfig && typeof paramsOrConfig.params === 'object') {
      finalParams = paramsOrConfig.params
      finalOptions = { ...paramsOrConfig, ...options }
    }
    return request<T>(url, { ...finalOptions, method: 'GET', params: finalParams })
  },
  post: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'POST', body }),
  put: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PUT', body }),
  delete: <T = any>(url: string, paramsOrConfig?: Record<string, any>, options?: RequestOptions) => {
    let finalParams = paramsOrConfig
    let finalOptions: RequestOptions = options || {}
    if (paramsOrConfig && 'params' in paramsOrConfig && typeof paramsOrConfig.params === 'object') {
      finalParams = paramsOrConfig.params
      finalOptions = { ...paramsOrConfig, ...options }
    }
    return request<T>(url, { ...finalOptions, method: 'DELETE', params: finalParams })
  },
}
