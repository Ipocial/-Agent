import { motion } from 'framer-motion';
import type { AgentProgress } from '../types';

interface Props {
  progressList: AgentProgress[];
}

const statusConfig: Record<string, {
  dotClass: string;
  label: string;
  labelClass: string;
  barClass: string;
  spinning?: boolean;
}> = {
  pending: {
    dotClass: 'bg-stone-200',
    label: '等待中',
    labelClass: 'text-stone-400',
    barClass: 'bg-stone-200',
  },
  running: {
    dotClass: 'bg-brand-500',
    label: '分析中',
    labelClass: 'text-brand-600',
    barClass: 'bg-brand-500',
    spinning: true,
  },
  completed: {
    dotClass: 'bg-green-500',
    label: '已完成',
    labelClass: 'text-green-600',
    barClass: 'bg-green-500',
  },
  failed: {
    dotClass: 'bg-red-500',
    label: '失败',
    labelClass: 'text-red-500',
    barClass: 'bg-red-500',
  },
};

const agentLabels: Record<string, string> = {
  data_analysis: '数据分析 Agent',
  news_analysis: '财经热点 Agent',
  risk_assessment: '风险评估 Agent',
  decision: '决策 Agent',
};

export default function AgentProgress({ progressList }: Props) {
  const latestProgress = progressList.reduce<Record<string, AgentProgress>>((acc, p) => {
    acc[p.agent_name] = p;
    return acc;
  }, {});

  const agents = Object.values(latestProgress);
  if (agents.length === 0) return null;

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-stone-50">
        <h3 className="text-sm font-semibold text-stone-700">Agent 执行进度</h3>
      </div>

      <div className="divide-y divide-stone-50">
        {agents.map((agent) => {
          const config = statusConfig[agent.status] || statusConfig.pending;
          const displayName = agentLabels[agent.agent_name] || agent.agent_name;

          return (
            <motion.div
              key={agent.agent_name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="px-5 py-4"
            >
              <div className="flex items-center gap-3 mb-2.5">
                {/* Status dot */}
                <div className="relative flex items-center justify-center w-5 h-5">
                  {config.spinning && (
                    <span className="absolute inset-0 rounded-full bg-brand-100 animate-ping" />
                  )}
                  <div className={`w-2.5 h-2.5 rounded-full ${config.dotClass} relative z-10`} />
                </div>

                <span className="text-sm font-medium text-stone-700 flex-1">
                  {displayName}
                </span>

                <span className={`text-xs font-medium ${config.labelClass}`}>
                  {config.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-stone-50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${config.barClass}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress_pct}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              {/* Result snippet */}
              {agent.partial_result && agent.status === 'completed' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2.5 text-xs text-stone-500 leading-relaxed line-clamp-2"
                >
                  {agent.partial_result}
                </motion.p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
