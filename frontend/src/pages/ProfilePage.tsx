import { useState, useEffect } from 'react';
import { authApi } from '../services/auth';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface ApiKeyItem {
  id: number;
  provider: string;
  api_key_masked: string;
  base_url: string;
  label: string;
  created_at: string;
}

type Section = 'basic' | 'apikeys' | 'portfolio';

interface Props {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: Props) {
  const [section, setSection] = useState<Section>('basic');

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <div className="bg-white border-b border-stone-100 px-6 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-smooth">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-stone-800">个人中心</h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-6">
        {/* Left sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {[
              { key: 'basic' as Section, label: '基础信息', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { key: 'apikeys' as Section, label: 'API Key', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
              { key: 'portfolio' as Section, label: '持仓收益', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth ${
                  section === item.key
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
                }`}
              >
                <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {section === 'basic' && <BasicInfoSection />}
          {section === 'apikeys' && <ApiKeysSection />}
          {section === 'portfolio' && <PortfolioSection />}
        </div>
      </div>
    </div>
  );
}

// ============ 基础信息 ============
function BasicInfoSection() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [email, setEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await authApi.get('/profile/');
      setProfile(data);
      setEmail(data.email || '');
    } catch {}
  };

  const handleEmailSave = async () => {
    setError(''); setMessage('');
    try {
      await authApi.put('/profile/email', { email });
      setMessage('邮箱已更新');
      setEditingEmail(false);
      loadProfile();
    } catch (err: any) {
      setError(err.response?.data?.detail || '更新失败');
    }
  };

  const handlePasswordChange = async () => {
    setError(''); setMessage('');
    try {
      await authApi.put('/profile/password', { old_password: oldPwd, new_password: newPwd });
      setMessage('密码修改成功');
      setChangingPwd(false);
      setOldPwd(''); setNewPwd('');
    } catch (err: any) {
      setError(err.response?.data?.detail || '修改失败');
    }
  };

  if (!profile) return <div className="text-stone-400 text-sm">加载中...</div>;

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm">
      <div className="px-6 py-4 border-b border-stone-100">
        <h2 className="text-base font-semibold text-stone-800">基础信息</h2>
      </div>
      <div className="px-6 py-5 space-y-5">
        {/* 用户名 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">用户名</p>
            <p className="text-sm font-medium text-stone-700">{profile.username}</p>
          </div>
        </div>

        {/* 邮箱 */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-stone-400 mb-0.5">邮箱</p>
            {editingEmail ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
                  placeholder="请输入邮箱"
                />
                <button onClick={handleEmailSave} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-smooth">保存</button>
                <button onClick={() => setEditingEmail(false)} className="px-3 py-1.5 text-stone-500 text-xs font-medium rounded-lg hover:bg-stone-100 transition-smooth">取消</button>
              </div>
            ) : (
              <p className="text-sm text-stone-700">{profile.email || <span className="text-stone-300">未设置</span>}</p>
            )}
          </div>
          {!editingEmail && (
            <button onClick={() => setEditingEmail(true)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">修改</button>
          )}
        </div>

        {/* 修改密码 */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-400">密码</p>
            {!changingPwd && (
              <button onClick={() => setChangingPwd(true)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">修改密码</button>
            )}
          </div>
          {changingPwd && (
            <div className="mt-2 space-y-2">
              <input
                type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
                placeholder="原密码"
              />
              <input
                type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
                placeholder="新密码（至少4位）"
              />
              <div className="flex gap-2">
                <button onClick={handlePasswordChange} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-smooth">确认修改</button>
                <button onClick={() => { setChangingPwd(false); setOldPwd(''); setNewPwd(''); }} className="px-3 py-1.5 text-stone-500 text-xs font-medium rounded-lg hover:bg-stone-100 transition-smooth">取消</button>
              </div>
            </div>
          )}
        </div>

        {/* 注册时间 */}
        <div>
          <p className="text-xs text-stone-400 mb-0.5">注册时间</p>
          <p className="text-sm text-stone-700">{profile.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}</p>
        </div>

        {/* Feedback */}
        {message && <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">{message}</p>}
        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>
    </div>
  );
}

// ============ API Key 管理 ============
function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [customProvider, setCustomProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const { data } = await authApi.get('/profile/api-keys');
      setKeys(data);
    } catch {}
  };

  const handleAdd = async () => {
    setError('');
    const finalProvider = provider === 'custom' ? customProvider.trim() : provider;
    if (!finalProvider) { setError('请填写服务商名称'); return; }
    if (!apiKey.trim()) { setError('请输入 API Key'); return; }
    try {
      await authApi.post('/profile/api-keys', { provider: finalProvider, api_key: apiKey, base_url: baseUrl, label });
      setAdding(false);
      setApiKey(''); setBaseUrl(''); setLabel(''); setCustomProvider('');
      loadKeys();
    } catch (err: any) {
      setError(err.response?.data?.detail || '添加失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await authApi.delete(`/profile/api-keys/${id}`);
      loadKeys();
    } catch {}
  };

  const PROVIDERS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'dashscope', label: '通义千问 (DashScope)' },
    { value: 'custom', label: '自定义 / 中转站' },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-800">API Key 管理</h2>
          <p className="text-xs text-stone-400 mt-0.5">配置调用智能体所需的 API Key</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-smooth">
            + 新增
          </button>
        )}
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* 新增表单 */}
        {adding && (
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 space-y-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">服务商</label>
              <select
                value={provider} onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:border-brand-400 outline-none"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {provider === 'custom' && (
              <div>
                <label className="block text-xs text-stone-500 mb-1">服务商名称</label>
                <input
                  type="text" value={customProvider} onChange={(e) => setCustomProvider(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
                  placeholder="如：openrouter / oneapi"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-stone-500 mb-1">API Key</label>
              <input
                type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Base URL（可选，中转站填写）</label>
              <input
                type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
                placeholder="https://your-proxy.example.com/v1"
              />
              <p className="text-[10px] text-stone-400 mt-1">留空则使用服务商默认地址，中转站请填完整 URL</p>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">备注（可选）</label>
              <input
                type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
                placeholder="如：主账号"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-smooth">保存</button>
              <button onClick={() => { setAdding(false); setError(''); }} className="px-3 py-1.5 text-stone-500 text-xs font-medium rounded-lg hover:bg-stone-100 transition-smooth">取消</button>
            </div>
          </div>
        )}

        {/* Key 列表 */}
        {keys.length === 0 && !adding && (
          <div className="text-center py-8">
            <p className="text-sm text-stone-400">暂未配置 API Key</p>
            <p className="text-xs text-stone-300 mt-1">添加 API Key 后，智能助理将使用您的 Key 进行调用</p>
          </div>
        )}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-semibold rounded uppercase">{k.provider}</span>
                {k.label && <span className="text-xs text-stone-500">{k.label}</span>}
              </div>
              <p className="text-xs text-stone-400 mt-1 font-mono">{k.api_key_masked}</p>
              {k.base_url && <p className="text-[10px] text-stone-400 mt-0.5 truncate">↗ {k.base_url}</p>}
            </div>
            <button onClick={() => handleDelete(k.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-smooth" title="删除">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 持仓收益 ============
function PortfolioSection() {
  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm">
      <div className="px-6 py-4 border-b border-stone-100">
        <h2 className="text-base font-semibold text-stone-800">持仓收益</h2>
      </div>
      <div className="px-6 py-12 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm text-stone-400">功能开发中...</p>
        <p className="text-xs text-stone-300 mt-1">后续将展示您的持仓收益情况</p>
      </div>
    </div>
  );
}
