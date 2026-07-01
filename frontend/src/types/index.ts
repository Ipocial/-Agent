// TypeScript 类型定义

export interface FundInfo {
  code: string;
  name: string;
  type: string;
  manager: string;
  company: string;
  size: string;
  establishment_date: string;
}

export interface FundNAV {
  date: string;
  nav: number;
  acc_nav: number;
  daily_return: number;
}

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  publish_time: string;
  url: string;
}

export interface AgentProgress {
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_pct: number;
  partial_result: string | null;
}

export interface AgentResult {
  agent_name: string;
  analysis_text: string;
  structured_data: Record<string, any>;
  confidence: number;
  success: boolean;
  error: string | null;
}

export interface FinalReport {
  rating: string;
  summary: string;
  detailed_analysis: Record<string, string>;
  action_suggestion: Record<string, string>;
  risk_warnings: string[];
  agent_consensus: number;
  disclaimer: string;
  agent_results: Record<string, AgentResult>;
}

export interface AnalysisRequest {
  fund_code: string;
  model_provider: string;
  model_name: string;
}

export interface LLMModel {
  provider: string;
  name: string;
  label: string;
}

export const AVAILABLE_MODELS: LLMModel[] = [
  { provider: 'openai', name: 'gpt-4o', label: 'GPT-4o' },
  { provider: 'openai', name: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { provider: 'dashscope', name: 'qwen-max', label: '通义千问 Max' },
  { provider: 'dashscope', name: 'qwen-plus', label: '通义千问 Plus' },
];
