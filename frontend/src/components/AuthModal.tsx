import { useState } from 'react';
import { login, register } from '../services/auth';

interface Props {
  onSuccess: (username: string) => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const result = await fn(username, password);
      onSuccess(result.username);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-lg w-[340px] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">
            {mode === 'login' ? '登录' : '注册'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-smooth">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-smooth"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-smooth"
              required
              minLength={4}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>

          <p className="text-center text-xs text-stone-400">
            {mode === 'login' ? '没有账号？' : '已有账号？'}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-brand-600 hover:text-brand-700 font-medium ml-1"
            >
              {mode === 'login' ? '去注册' : '去登录'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
