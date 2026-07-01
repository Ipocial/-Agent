// API 调用封装
import axios from 'axios';
import type { FundInfo, FundNAV, NewsItem, AnalysisRequest, FinalReport, AgentProgress } from '../types';

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
