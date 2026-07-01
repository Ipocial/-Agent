import { motion } from 'framer-motion';
import type { FinalReport } from '../types';

interface Props {
  report: FinalReport;
}

const ratingColors: Record<string, string> = {
  '强烈推荐': 'bg-green-600',
  '推荐': 'bg-green-500',
  '观望': 'bg-yellow-500',
  '谨慎': 'bg-orange-500',
  '不推荐': 'bg-red-500',
};

export default function RecommendCard({ report }: Props) {
  const ratingColor = ratingColors[report.rating] || 'bg-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
    >
      {/* 评级头部 */}
      <div className="flex items-center gap-4 mb-4">
        <span className={`${ratingColor} text-white px-4 py-2 rounded-lg font-bold text-lg`}>
          {report.rating}
        </span>
        <div className="flex-1">
          <p className="text-gray-800 font-medium">{report.summary}</p>
          <p className="text-sm text-gray-400 mt-1">
            Agent一致性: {(report.agent_consensus * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* 详细分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {Object.entries(report.detailed_analysis).map(([key, value]) => {
          const labels: Record<string, string> = {
            technical: '技术面',
            fundamental: '基本面',
            news_impact: '热点影响',
            risk_assessment: '风险评估',
          };
          return (
            <div key={key} className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-600 mb-1">{labels[key] || key}</h4>
              <p className="text-sm text-gray-700">{value}</p>
            </div>
          );
        })}
      </div>

      {/* 操作建议 */}
      {Object.keys(report.action_suggestion).length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">操作建议</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(report.action_suggestion).map(([key, value]) => {
              const labels: Record<string, string> = {
                operation: '操作',
                position: '仓位',
                timing: '时机',
                stop_loss: '止损',
              };
              return (
                <div key={key}>
                  <span className="text-xs text-blue-600">{labels[key] || key}: </span>
                  <span className="text-sm text-blue-900">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 风险提示 */}
      {report.risk_warnings.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-red-800 mb-2">风险提示</h4>
          <ul className="space-y-1">
            {report.risk_warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                <span className="text-red-500 mt-0.5">!</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 免责声明 */}
      <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-3">
        {report.disclaimer}
      </p>
    </motion.div>
  );
}
