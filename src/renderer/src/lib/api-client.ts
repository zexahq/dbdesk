import { bearerToken, fullSignOut } from './auth'

interface RequestConfig extends RequestInit {
  skipAuth?: boolean
}

class ApiClient {
  private async getAuthHeader(): Promise<Record<string, string>> {
    const token = bearerToken.get()
    if (!token) {
      throw new Error('Not authenticated')
    }
    return {
      Authorization: `Bearer ${token}`,
      'x-desktop': 'true',
    }
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { skipAuth, ...fetchConfig } = config

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers as Record<string, string>),
    }

    if (!skipAuth) {
      Object.assign(headers, await this.getAuthHeader())
    }

    const response = await fetch(`${window.env.API_URL}${endpoint}`, {
      ...fetchConfig,
      headers,
    })

    // Handle 401 - session expired
    if (response.status === 401 && !skipAuth) {
      fullSignOut()
      throw new Error('Session expired. Please login again.')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Request failed: ${response.status}`)
    }

    return response.json()
  }

  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

export const api = new ApiClient()
