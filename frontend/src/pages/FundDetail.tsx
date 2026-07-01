import { useState, useEffect } from 'react';
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
}

export default function FundDetail({ fundCode, onBack }: Props) {
  const [fundInfo, setFundInfo] = useState<FundInfo | null>(null);
  const [navHistory, setNavHistory] = useState<FundNAV[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(AVAILABLE_MODELS[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressList, setProgressList] = useState<AgentProgressType[]>([]);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFundData();
  }, [fundCode]);

  const loadFundData = async () => {
    setLoading(true);
    try {
      const [info, nav] = await Promise.all([
        getFundInfo(fundCode),
        getFundNav(fundCode, 90),
      ]);
      setFundInfo(info);
      setNavHistory(nav);
    } catch {
      setError('加载基金数据失败');
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
      setError(err.response?.data?.detail || err.message || '分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &larr; 返回
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  <span className="font-mono text-blue-600">{fundCode}</span>
                  {' '}
                  {fundInfo?.name}
                </h1>
                {fundInfo?.type && (
                  <span className="text-sm text-gray-500">{fundInfo.type}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className={`px-6 py-2 rounded-lg font-medium text-white transition-all ${
                  analyzing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}
              >
                {analyzing ? '分析中...' : 'AI 分析建议'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* 基金基本信息 */}
        {fundInfo && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-500">基金代码</span>
                <p className="font-mono text-lg text-blue-600">{fundInfo.code}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">基金类型</span>
                <p className="text-gray-800">{fundInfo.type || '未知'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">基金经理</span>
                <p className="text-gray-800">{fundInfo.manager || '未知'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">基金规模</span>
                <p className="text-gray-800">{fundInfo.size || '未知'}</p>
              </div>
            </div>
          </div>
        )}

        {/* 净值走势图 */}
        {navHistory.length > 0 && (
          <FundChart navHistory={navHistory} fundName={fundInfo?.name || ''} />
        )}

        {/* Multi-Agent 分析面板 */}
        {(analyzing || progressList.length > 0) && (
          <AgentProgress progressList={progressList} />
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 最终决策建议 */}
        {report && <RecommendCard report={report} />}

        {/* 免责声明 */}
        <div className="bg-gray-100 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">
            本系统提供的分析和建议仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
            请根据自身风险承受能力和投资目标做出独立判断。
          </p>
        </div>
      </main>
    </div>
  );
}
