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

// ============ 发现 / 排行榜类型 ============

export interface FundRankItem {
  rank: number;
  code: string;
  name: string;
  nav: string;
  acc_nav: string;
  daily_return: string;
  return_1w: string;
  return_1m: string;
  return_3m: string;
  return_6m: string;
  return_1y: string;
  return_3y: string;
  return_ytd: string;
}

export interface FundCompareItem {
  code: string;
  name: string;
  manager: string;
  nav_history: Array<{ date: string; nav: number; acc_nav: number }>;
  metrics: {
    volatility: number;
    max_drawdown: number;
    sharpe: number;
    return_1m: string;
    return_3m: string;
    return_6m: string;
    return_1y: string;
  };
}

export interface RecommendParams {
  risk_level: number;
  amount: number;
  period_years: number;
  model_provider: string;
  model_name: string;
}

// ============ 跟踪 / 提醒类型 ============

export interface MarketIndex {
  name: string;
  code: string;
  price: number;
  change_pct: number;
  change_val: number;
}

export interface TechnicalSignal {
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  rsi: number | null;
  signal: 'bullish' | 'bearish' | 'neutral';
  signal_desc: string;
  nav_history: Array<{ date: string; nav: number }>;
}

export interface DcaPlan {
  id: number;
  fund_code: string;
  fund_name: string;
  monthly_amount: number;
  day_of_month: number;
  start_date: string;
  active: boolean;
  note: string;
  created_at: string;
}

export interface DcaSimulateResult {
  fund_code: string;
  fund_name: string;
  total_invested: number;
  current_value: number;
  total_shares: number;
  total_return: number;
  total_return_pct: number;
  latest_nav: number;
  invest_count: number;
  monthly_records: Array<{ date: string; nav: number; shares: number; invested: number }>;
}

export interface PriceAlert {
  id: number;
  fund_code: string;
  fund_name: string;
  alert_type: 'profit' | 'loss';
  target_pct: number;
  cost_price: number;
  active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface TriggeredAlert {
  alert: PriceAlert;
  current_pct: number;
  current_nav: number;
}
