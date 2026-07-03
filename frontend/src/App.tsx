import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import FundDetail from './pages/FundDetail';
import ProfilePage from './pages/ProfilePage';
import DiscoverPage from './pages/DiscoverPage';
import TrackingPage from './pages/TrackingPage';
import ChatBubble from './components/ChatBubble';
import AuthModal from './components/AuthModal';
import { isLoggedIn, logout as doLogout, getUsername } from './services/auth';
import type { FundInfo } from './types';

type Page = 'dashboard' | 'fund-detail' | 'profile' | 'discover' | 'tracking';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(isLoggedIn());
  const [compareList, setCompareList] = useState<FundInfo[]>([]);
  const [compareNotice, setCompareNotice] = useState('');

  useEffect(() => {
    setAuthenticated(isLoggedIn());
  }, []);

  const handleAuthSuccess = () => setAuthenticated(true);
  const handleLogout = () => { doLogout(); setAuthenticated(false); };

  const handleFundDetail = (code: string) => {
    setSelectedFundCode(code);
    setPage('fund-detail');
  };

  const handleAddCompare = (fund: FundInfo) => {
    if (compareList.some((f) => f.code === fund.code)) {
      setCompareNotice('该基金已在对比列表中');
      setTimeout(() => setCompareNotice(''), 2500);
      return;
    }
    if (compareList.length >= 3) {
      setCompareNotice('最多只能对比 3 只基金');
      setTimeout(() => setCompareNotice(''), 2500);
      return;
    }
    setCompareList((prev) => [...prev, fund]);
    setCompareNotice(`已加入对比：${fund.name}`);
    setTimeout(() => setCompareNotice(''), 2500);
  };

  const handleRemoveCompare = (code: string) => {
    setCompareList((prev) => prev.filter((f) => f.code !== code));
  };

  // 未登录时显示登录弹窗
  if (!authenticated) {
    return <AuthModal onSuccess={handleAuthSuccess} onClose={() => {}} dismissible={false} />;
  }

  return (
    <>
      {/* 顶部固定导航区 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-1 px-1.5 py-1 bg-white/90 backdrop-blur border border-stone-200 rounded-full shadow-sm">
        {([
          { key: 'dashboard', label: '分析' },
          { key: 'discover', label: '发现' },
          { key: 'tracking', label: '跟踪' },
        ] as { key: Page; label: string }[]).map((item) => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${page === item.key ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 右上角"我的"入口 */}
      {page !== 'profile' && (
        <button
          onClick={() => setPage('profile')}
          className="fixed top-4 right-4 z-[80] flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur border border-stone-200 rounded-full shadow-sm hover:shadow hover:border-stone-300 transition-smooth"
        >
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-brand-700">{(getUsername() || 'U')[0].toUpperCase()}</span>
          </div>
          <span className="text-xs font-medium text-stone-600">我的</span>
        </button>
      )}

      {/* 页面内容 */}
      {page === 'profile' && (
        <ProfilePage onBack={() => setPage('dashboard')} />
      )}
      {page === 'fund-detail' && selectedFundCode && (
        <FundDetail
          fundCode={selectedFundCode}
          onBack={() => { setPage('dashboard'); setSelectedFundCode(null); }}
          compareList={compareList}
          onAddCompare={handleAddCompare}
        />
      )}
      {page === 'dashboard' && (
        <Dashboard
          onFundDetail={handleFundDetail}
          compareList={compareList}
          onAddCompare={handleAddCompare}
        />
      )}
      {page === 'discover' && (
        <DiscoverPage
          onFundDetail={handleFundDetail}
          compareList={compareList}
          onAddCompare={handleAddCompare}
        />
      )}
      {page === 'tracking' && (
        <TrackingPage onFundDetail={handleFundDetail} />
      )}

      {/* 聊天气泡 */}
      <ChatBubble onLogout={handleLogout} />

      {/* 对比栏（底部悬浮）*/}
      {compareList.length > 0 && page !== 'discover' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-full shadow-lg">
          <span className="text-xs">已选 {compareList.length} 只基金</span>
          <div className="flex gap-1.5">
            {compareList.map((f) => (
              <span key={f.code} className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-xs">
                {f.name.length > 6 ? f.name.slice(0, 6) + '...' : f.name}
                <button onClick={() => handleRemoveCompare(f.code)} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
              </span>
            ))}
          </div>
          <button
            onClick={() => setPage('discover')}
            className="px-3 py-1 bg-brand-500 hover:bg-brand-400 rounded-full text-xs font-medium transition-colors ml-1"
          >
            去对比
          </button>
        </div>
      )}

      {/* 对比提示 toast */}
      {compareNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 bg-stone-800/90 text-white text-xs rounded-full shadow-lg animate-fade-in">
          {compareNotice}
        </div>
      )}
    </>
  );
}

export default App;
