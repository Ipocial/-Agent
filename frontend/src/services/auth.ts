/**
 * 认证服务 - Token 管理 + API 拦截器
 */
import axios from 'axios';

const TOKEN_KEY = 'fund_advisor_token';
const USERNAME_KEY = 'fund_advisor_username';

// 获取 token
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// 获取用户名
export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

// 保存认证信息
export function saveAuth(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

// 清除认证信息
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

// 是否已登录
export function isLoggedIn(): boolean {
  return !!getToken();
}

// 创建带认证的 axios 实例
export const authApi = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

// 请求拦截器：自动附加 token
authApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 自动清除登录态
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
    }
    return Promise.reject(error);
  }
);

// ============ Auth API ============

export async function login(username: string, password: string): Promise<{ token: string; username: string }> {
  const { data } = await authApi.post('/auth/login', { username, password });
  saveAuth(data.access_token, data.username);
  return { token: data.access_token, username: data.username };
}

export async function register(username: string, password: string): Promise<{ token: string; username: string }> {
  const { data } = await authApi.post('/auth/register', { username, password });
  saveAuth(data.access_token, data.username);
  return { token: data.access_token, username: data.username };
}

export function logout(): void {
  clearAuth();
}

// ============ Chat API ============

export interface ChatEvent {
  type: 'tool_call' | 'tool_result' | 'content' | 'done' | 'error';
  tool?: string;
  args?: Record<string, any>;
  result?: string;
  content?: string;
}

export async function* streamChat(
  message: string,
  modelProvider = 'openai',
  modelName = 'gpt-4o',
): AsyncGenerator<ChatEvent> {
  const token = getToken();
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, model_provider: modelProvider, model_name: modelName }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      throw new Error('认证已过期，请重新登录');
    }
    throw new Error(`请求失败: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: ChatEvent = JSON.parse(line.slice(6));
          yield event;
        } catch {
          // ignore parse errors
        }
      }
    }
  }
}

export async function getChatHistory(): Promise<Array<{ id: number; role: string; content: string; created_at: string }>> {
  const { data } = await authApi.get('/chat/history');
  return data;
}

export async function clearChatHistory(): Promise<void> {
  await authApi.delete('/chat/history');
}
