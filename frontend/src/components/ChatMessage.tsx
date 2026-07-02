import ReactMarkdown from 'react-markdown';

interface Props {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolInfo?: { tool: string; status: 'calling' | 'done' };
}

const TOOL_LABELS: Record<string, string> = {
  query_fund_nav: '查询净值',
  search_funds: '搜索基金',
  search_news: '搜索新闻',
  get_user_portfolio: '查询持仓',
  calculate_profit: '计算收益',
  get_fund_info: '查询基金信息',
};

export default function ChatMessage({ role, content, toolInfo }: Props) {
  // Tool call indicator
  if (toolInfo) {
    return (
      <div className="flex justify-start mb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 border border-stone-100 rounded-lg text-[11px] text-stone-500">
          {toolInfo.status === 'calling' && (
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          )}
          {toolInfo.status === 'done' && (
            <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{TOOL_LABELS[toolInfo.tool] || toolInfo.tool}</span>
        </div>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-md'
            : 'bg-stone-50 text-stone-700 border border-stone-100 rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>p:last-child]:mb-0">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
