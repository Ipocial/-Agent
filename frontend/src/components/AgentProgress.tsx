import { motion } from 'framer-motion';
import type { AgentProgress } from '../types';

interface Props {
  progressList: AgentProgress[];
}

const statusConfig = {
  pending: { color: 'bg-gray-300', icon: '○', textColor: 'text-gray-400' },
  running: { color: 'bg-blue-500', icon: '◎', textColor: 'text-blue-600' },
  completed: { color: 'bg-green-500', icon: '✓', textColor: 'text-green-600' },
  failed: { color: 'bg-red-500', icon: '✗', textColor: 'text-red-600' },
};

export default function AgentProgress({ progressList }: Props) {
  // 聚合进度（按agent_name取最新状态）
  const latestProgress = progressList.reduce<Record<string, AgentProgress>>((acc, p) => {
    acc[p.agent_name] = p;
    return acc;
  }, {});

  const agents = Object.values(latestProgress);

  if (agents.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Agent 执行进度</h3>
      <div className="space-y-4">
        {agents.map((agent) => {
          const config = statusConfig[agent.status] || statusConfig.pending;
          return (
            <motion.div
              key={agent.agent_name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-100 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${config.color} ${agent.status === 'running' ? 'animate-pulse' : ''}`} />
                <span className={`font-medium ${config.textColor}`}>
                  {agent.agent_name}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {agent.status === 'running' && '分析中...'}
                  {agent.status === 'completed' && '已完成'}
                  {agent.status === 'pending' && '等待中'}
                  {agent.status === 'failed' && '失败'}
                </span>
              </div>

              {/* 进度条 */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${config.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress_pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* 部分结果 */}
              {agent.partial_result && agent.status === 'completed' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-sm text-gray-600 line-clamp-2"
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
