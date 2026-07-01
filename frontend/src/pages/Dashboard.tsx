import { useState, useEffect } from 'react';
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
}

export default function Dashboard({ onFundDetail }: DashboardProps) {
  const [selectedFund, setSelectedFund] = useState<FundInfo | null>(null);
  const [navHistory, setNavHistory] = useState<FundNAV[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(AVAILABLE_MODELS[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressList, setProgressList] = useState<AgentProgressType[]>([]);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string>('');

  // 选中基金后加载净值数据
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
      const data = await getFundNav(code, 90);
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
      setError(err.response?.data?.detail || err.message || '分析失败，请检查后端服务和API Key配置');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              基金购买建议 <span className="text-blue-600">Multi-Agent</span>
            </h1>
            <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 搜索区 */}
        <div className="flex items-center gap-4 mb-8">
          <FundSearch onSelect={setSelectedFund} />
          {selectedFund && (
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${
                  analyzing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}
              >
                {analyzing ? '分析中...' : 'AI 分析建议'}
              </button>
              {onFundDetail && (
                <button
                  onClick={() => onFundDetail(selectedFund.code)}
                  className="px-6 py-3 rounded-lg font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all"
                >
                  详情页面
                </button>
              )}
            </div>
          )}
        </div>

        {/* 基金信息 */}
        {selectedFund && (
          <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-mono text-blue-600">{selectedFund.code}</span>
              <span className="text-lg font-medium text-gray-800">{selectedFund.name}</span>
              {selectedFund.type && (
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">{selectedFund.type}</span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：图表 + 分析结果 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 净值走势图 */}
            {navHistory.length > 0 && (
              <FundChart navHistory={navHistory} fundName={selectedFund?.name || ''} />
            )}

            {/* Agent进度 */}
            {(analyzing || progressList.length > 0) && (
              <AgentProgress progressList={progressList} />
            )}

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* 最终建议 */}
            {report && <RecommendCard report={report} />}
          </div>

          {/* 右侧：新闻面板 */}
          <div className="space-y-6">
            <NewsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
