import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { streamChat, getChatHistory, clearChatHistory, getUsername, logout } from '../services/auth';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolInfo?: { tool: string; status: 'calling' | 'done' };
}

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

const QUICK_QUESTIONS = [
  '查看我的持仓',
  '今日收益如何',
  '帮我分析一下市场行情',
];

export default function ChatPanel({ onClose, onLogout }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const username = getUsername();

  // Load history on mount
  useEffect(() => {
    if (!historyLoaded) {
      loadHistory();
      setHistoryLoaded(true);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    try {
      const history = await getChatHistory();
      const msgs: Message[] = history
        .filter((h) => h.role === 'user' || h.role === 'assistant')
        .map((h, i) => ({
          id: `history-${h.id || i}`,
          role: h.role as 'user' | 'assistant',
          content: h.content,
        }));
      setMessages(msgs);
    } catch {
      // ignore
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      for await (const event of streamChat(text)) {
        if (event.type === 'tool_call') {
          const toolId = `tool-${Date.now()}-${event.tool}`;
          setMessages((prev) => [
            ...prev,
            { id: toolId, role: 'tool', content: '', toolInfo: { tool: event.tool!, status: 'calling' } },
          ]);
        } else if (event.type === 'tool_result') {
          // Update the last tool message to 'done'
          setMessages((prev) => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].toolInfo?.tool === event.tool && updated[i].toolInfo?.status === 'calling') {
                updated[i] = { ...updated[i], toolInfo: { tool: event.tool!, status: 'done' } };
                break;
              }
            }
            return updated;
          });
        } else if (event.type === 'content') {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + (event.content || '') } : m)
          );
        } else if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: event.content || '出错了' } : m)
          );
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: `出错了: ${err.message}` } : m)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = async () => {
    await clearChatHistory();
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-brand-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-stone-700">AI 助理</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-stone-400 mr-2">{username}</span>
          <button onClick={handleClear} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-smooth" title="清空对话">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={() => { logout(); onLogout(); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-smooth" title="退出登录">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-smooth" title="关闭">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
              </svg>
            </div>
            <p className="text-sm text-stone-500 mb-1">你好！我是你的基金助理「小基」</p>
            <p className="text-xs text-stone-400">可以告诉我你的持仓，我来帮你分析收益和买卖建议</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} toolInfo={msg.toolInfo} />
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start mb-3">
            <div className="px-3.5 py-2.5 bg-stone-50 border border-stone-100 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      {messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="px-2.5 py-1.5 bg-brand-50 text-brand-700 text-[11px] font-medium rounded-lg hover:bg-brand-100 transition-smooth"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-stone-100 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送)"
            rows={1}
            className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none resize-none transition-smooth max-h-24"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
