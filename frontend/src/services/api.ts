// API 调用封装
import axios from 'axios';
import type { FundInfo, FundNAV, NewsItem, AnalysisRequest, FinalReport, AgentProgress, FundRankItem, FundCompareItem, RecommendParams } from '../types';
import { getToken, clearAuth } from './auth';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // Agent分析可能需要较长时间
});

// ============ 基金数据 API ============

export async function searchFunds(keyword: string): Promise<FundInfo[]> {
  const { data } = await api.get('/funds/search', { params: { keyword } });
  return data.funds;
}

export async function getFundNav(code: string, days = 90): Promise<FundNAV[]> {
  const { data } = await api.get(`/funds/${code}/nav`, { params: { days } });
  return data.nav_history;
}

export async function getFundInfo(code: string): Promise<FundInfo> {
  const { data } = await api.get(`/funds/${code}/info`);
  return data;
}

export async function getFundEstimate(code: string) {
  const { data } = await api.get(`/funds/${code}/estimate`);
  return data;
}

// ============ 新闻 API ============

export async function getFinancialNews(limit = 20): Promise<NewsItem[]> {
  const { data } = await api.get('/news/financial', { params: { limit } });
  return data.news;
}

export async function getHotTopics() {
  const { data } = await api.get('/news/hot-topics');
  return data.topics;
}

export async function getMarketSentiment() {
  const { data } = await api.get('/news/sentiment');
  return data;
}

// ============ 分析 API ============

export async function runAnalysis(request: AnalysisRequest): Promise<{
  report: FinalReport;
  progress_log: AgentProgress[];
}> {
  const { data } = await api.post('/analysis/recommend', request);
  return data;
}

// ============ WebSocket 连接 ============

export function createAnalysisWebSocket(
  taskId: string,
  onProgress: (progress: AgentProgress) => void,
  onResult: (report: FinalReport) => void,
  onError: (error: string) => void,
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/analysis/ws/${taskId}`);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'progress') {
      onProgress(message.data);
    } else if (message.type === 'result') {
      onResult(message.data);
    } else if (message.type === 'error') {
      onError(message.message);
    }
  };

  ws.onerror = () => {
    onError('WebSocket连接错误');
  };

  return ws;
}

// ============ 发现 API ============

export async function getRanking(ft = 'all', sc = 'zzf', pn = 20): Promise<FundRankItem[]> {
  const { data } = await api.get('/discover/ranking', { params: { ft, sc, pn } });
  return data.funds;
}

export async function filterFunds(params: {
  ft?: string;
  sc?: string;
  min_return_1y?: number;
  sort_by?: string;
  pn?: number;
}): Promise<FundRankItem[]> {
  const { data } = await api.get('/discover/filter', { params });
  return data.funds;
}

export async function compareFunds(codes: string[]): Promise<FundCompareItem[]> {
  const { data } = await api.get('/discover/compare', { params: { codes: codes.join(',') } });
  return data.funds;
}

export async function* streamRecommend(params: RecommendParams): AsyncGenerator<{ type: string; content?: string }> {
  const token = getToken();
  const response = await fetch('/api/discover/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
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
          yield JSON.parse(line.slice(6));
        } catch {
          // ignore
        }
      }
    }
  }
}
