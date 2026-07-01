import { motion } from 'framer-motion';
import type { FinalReport } from '../types';

interface Props {
  report: FinalReport;
}

const ratingConfig: Record<string, { bg: string; text: string; ring: string }> = {
  '强烈推荐': { bg: 'bg-green-600', text: 'text-white', ring: 'ring-green-200' },
  '推荐':     { bg: 'bg-green-500', text: 'text-white', ring: 'ring-green-200' },
  '观望':     { bg: 'bg-amber-500', text: 'text-white', ring: 'ring-amber-200' },
  '谨慎':     { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-200' },
  '不推荐':   { bg: 'bg-red-500',   text: 'text-white', ring: 'ring-red-200' },
};

const sectionLabels: Record<string, string> = {
  technical: '技术面',
  fundamental: '基本面',
  news_impact: '热点影响',
  risk_assessment: '风险评估',
};

const actionLabels: Record<string, string> = {
  operation: '操作',
  position: '仓位',
  timing: '时机',
  stop_loss: '止损',
};

export default function RecommendCard({ report }: Props) {
  const rating = ratingConfig[report.rating] || { bg: 'bg-stone-600', text: 'text-white', ring: '' };
  const consensusPct = Math.round(report.agent_consensus * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-xl border border-stone-100 shadow-xs overflow-hidden"
    >
      {/* Rating header */}
      <div className="px-5 py-5 border-b border-stone-50">
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-semibold ${rating.bg} ${rating.text} ${rating.ring && `ring-2 ${rating.ring}`}`}>
            {report.rating}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 leading-relaxed">{report.summary}</p>
          </div>
        </div>
        {/* Consensus bar */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-stone-400 shrink-0">Agent 一致性</span>
          <div className="flex-1 h-1.5 bg-stone-50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${consensusPct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
          </div>
          <span className="text-xs font-medium text-stone-600 tabular-nums">{consensusPct}%</span>
        </div>
      </div>

      {/* Analysis sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-50">
        {Object.entries(report.detailed_analysis).map(([key, value]) => (
          <div key={key} className="bg-white px-5 py-4">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              {sectionLabels[key] || key}
            </h4>
            <p className="text-sm text-stone-700 leading-relaxed">{value}</p>
          </div>
        ))}
      </div>

      {/* Action suggestion */}
      {Object.keys(report.action_suggestion).length > 0 && (
        <div className="px-5 py-4 bg-brand-50/50 border-t border-stone-50">
          <h4 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">操作建议</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(report.action_suggestion).map(([key, value]) => (
              <div key={key} className="flex items-baseline gap-2">
                <span className="text-xs text-brand-600 shrink-0">{actionLabels[key] || key}</span>
                <span className="text-sm text-stone-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk warnings */}
      {report.risk_warnings.length > 0 && (
        <div className="px-5 py-4 bg-red-50/50 border-t border-stone-50">
          <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">风险提示</h4>
          <ul className="space-y-1">
            {report.risk_warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-red-700 flex items-start gap-2 leading-relaxed">
                <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-5 py-3 bg-stone-25 border-t border-stone-50">
        <p className="text-[11px] text-stone-400 leading-relaxed">{report.disclaimer}</p>
      </div>
    </motion.div>
  );
}
