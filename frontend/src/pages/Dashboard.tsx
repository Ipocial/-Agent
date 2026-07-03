import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FundInfo, FundNAV, FinalReport, AgentProgress as AgentProgressType, LLMModel } from '../types';
import { AVAILABLE_MODELS } from '../types';
import { getFundNav, runAnalysis } from '../services/api';
import FundSearch from '../components/FundSearch';
import FundChart from '../components/FundChart';
import NewsPanel from '../components/NewsPanel';
import AgentProgress from '../components/AgentProgress';
import RecommendCard from '../components/RecommendCard';
import ModelSelector from '../components/ModelSelector';

interface DashboardProps {
  onFundDetail?: (code: string) => void;
  compareList?: import('../types').FundInfo[];
  onAddCompare?: (fund: import('../types').FundInfo) => void;
}

export default function Dashboard({ onFundDetail, compareList = [], onAddCompare }: DashboardProps) {
  const [selectedFund, setSelectedFund] = useState<FundInfo | null>(null);
  const [navHistory, setNavHistory] = useState<FundNAV[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(AVAILABLE_MODELS[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressList, setProgressList] = useState<AgentProgressType[]>([]);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (selectedFund) {
      loadNavData(selectedFund.code);
      setReport(null);
      setProgressList([]);
      setError('');
    }
  }, [selectedFund]);

  const loadNavData = async (code: string) => {
    try {
      const data = await getFundNav(code, 180);
      setNavHistory(data);
    } catch {
      setNavHistory([]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFund) return;
    setAnalyzing(true);
    setReport(null);
    setProgressList([]);
    setError('');

    try {
      const result = await runAnalysis({
        fund_code: selectedFund.code,
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

  return (
    <div className="min-h-screen bg-stone-25">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L6 4L10 9L14 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-semibold text-stone-800 text-lg tracking-tight">FundAdvisor</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <h1 className="text-2xl font-semibold text-stone-800 tracking-tight mb-3">基金智能分析</h1>
          <p className="text-[13px] text-gray-500 mb-8">
            搜索基金，Multi-Agent 系统将从技术面、消息面、风险维度综合分析并给出建议
          </p>
          <div className="flex items-stretch gap-3">
            <FundSearch onSelect={setSelectedFund} selectedFund={selectedFund} onClear={() => { setSelectedFund(null); setNavHistory([]); setReport(null); }} />
            {selectedFund && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="flex gap-2 items-center">
                <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-smooth whitespace-nowrap ${
                    analyzing ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                  }`}
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />分析中
                    </span>
                  ) : '启动 AI 分析'}
                </button>
                {onFundDetail && (
                  <button
                    onClick={() => onFundDetail(selectedFund.code)}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-smooth whitespace-nowrap"
                  >
                    查看详情
                  </button>
                )}
                {onAddCompare && (
                  <button
                    onClick={() => onAddCompare(selectedFund)}
                    disabled={compareList.some((f) => f.code === selectedFund.code) || compareList.length >= 3}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-smooth whitespace-nowrap ${
                      compareList.some((f) => f.code === selectedFund.code)
                        ? 'text-stone-300 border-stone-200 cursor-default'
                        : compareList.length >= 3
                        ? 'text-stone-300 border-stone-200 cursor-not-allowed'
                        : 'text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {compareList.some((f) => f.code === selectedFund.code) ? '已加入对比' : '加入对比'}
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Fund Info Bar */}
        <AnimatePresence>
          {selectedFund && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden mb-6">
              <div className="card px-5 py-4 flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md font-mono text-base font-semibold">{selectedFund.code}</span>
                <div className="h-5 w-px bg-stone-200" />
                <span className="text-stone-700 font-medium">{selectedFund.name}</span>
                {selectedFund.type && (
                  <>
                    <div className="h-5 w-px bg-stone-200" />
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">{selectedFund.type}</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {navHistory.length > 0 && <FundChart navHistory={navHistory} fundName={selectedFund?.name || ''} />}

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
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {report && <RecommendCard report={report} />}
          </div>

          <div className="space-y-6">
            <NewsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
