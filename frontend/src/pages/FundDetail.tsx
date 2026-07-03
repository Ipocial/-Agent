import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FundInfo, FundNAV, FinalReport, AgentProgress as AgentProgressType, LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';
import { getFundNav, getFundInfo, runAnalysis } from '../services/api';
import FundChart from '../components/FundChart';
import AgentProgress from '../components/AgentProgress';
import RecommendCard from '../components/RecommendCard';
import ModelSelector from '../components/ModelSelector';

interface Props {
  fundCode: string;
  onBack?: () => void;
  compareList?: import('../types').FundInfo[];
  onAddCompare?: (fund: import('../types').FundInfo) => void;
}

export default function FundDetail({ fundCode, onBack, compareList = [], onAddCompare }: Props) {
  const [fundInfo, setFundInfo] = useState<FundInfo | null>(null);
  const [navHistory, setNavHistory] = useState<FundNAV[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(AVAILABLE_MODELS[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressList, setProgressList] = useState<AgentProgressType[]>([]);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFundData(); }, [fundCode]);

  const loadFundData = async () => {
    setLoading(true);
    try {
      const [info, nav] = await Promise.all([getFundInfo(fundCode), getFundNav(fundCode, 180)]);
      setFundInfo(info);
      setNavHistory(nav);
    } catch {
      setError('加载基金数据失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setReport(null);
    setProgressList([]);
    setError('');
    try {
      const result = await runAnalysis({
        fund_code: fundCode,
        model_provider: selectedModel.provider,
        model_name: selectedModel.name,
      });
      setReport(result.report);
      setProgressList(result.progress_log);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '分析失败，请检查后端服务和 API Key 配置');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-25 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-400">加载基金数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-25">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-smooth">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="font-mono text-brand-600 text-base font-semibold">{fundCode}</span>
              <span className="text-stone-700 font-medium text-base">{fundInfo?.name}</span>
              {fundInfo?.type && (
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">{fundInfo.type}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-smooth ${
                analyzing ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
              }`}
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />分析中
                </span>
              ) : '启动 AI 分析'}
            </button>
            {onAddCompare && fundInfo && (
              <button
                onClick={() => onAddCompare(fundInfo)}
                disabled={compareList.some((f) => f.code === fundCode) || compareList.length >= 3}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-smooth ${
                  compareList.some((f) => f.code === fundCode)
                    ? 'text-stone-300 border-stone-200 cursor-default'
                    : compareList.length >= 3
                    ? 'text-stone-300 border-stone-200 cursor-not-allowed'
                    : 'text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {compareList.some((f) => f.code === fundCode) ? '已加入对比' : '加入对比'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {fundInfo && (
          <div className="card">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-stone-100">
              {[
                { label: '基金代码', value: fundInfo.code, mono: true, accent: true, badge: true },
                { label: '基金类型', value: fundInfo.type || '未知' },
                { label: '基金经理', value: fundInfo.manager || '未知' },
                { label: '基金规模', value: fundInfo.size || '未知' },
              ].map((item) => (
                <div key={item.label} className="px-5 py-4">
                  <span className="text-xs text-stone-400 block mb-1">{item.label}</span>
                  <p className={`text-sm font-medium ${item.mono ? 'font-mono' : ''} ${item.accent ? 'text-brand-600' : 'text-stone-800'}`}>{item.badge ? <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md">{item.value}</span> : item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {navHistory.length > 0 && <FundChart navHistory={navHistory} fundName={fundInfo?.name || ''} />}

        <AnimatePresence>
          {(analyzing || progressList.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <AgentProgress progressList={progressList} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                {!error.includes('API Key') && (
                  <button onClick={loadFundData} className="mt-1 text-xs text-red-500 hover:text-red-700 font-medium transition-smooth">点击重试</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {report && <RecommendCard report={report} />}

        <div className="text-center py-4">
          <p className="text-[11px] text-stone-400 leading-relaxed max-w-lg mx-auto">
            本系统提供的分析和建议仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
          </p>
        </div>
      </main>
    </div>
  );
}
