import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import FundDetail from './pages/FundDetail';
import ProfilePage from './pages/ProfilePage';
import ChatBubble from './components/ChatBubble';
import AuthModal from './components/AuthModal';
import { isLoggedIn, logout as doLogout, getUsername } from './services/auth';

type Page = 'dashboard' | 'fund-detail' | 'profile';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(isLoggedIn());

  // 页面加载时检查登录状态
  useEffect(() => {
    setAuthenticated(isLoggedIn());
  }, []);

  const handleAuthSuccess = () => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    doLogout();
    setAuthenticated(false);
  };

  const handleFundDetail = (code: string) => {
    setSelectedFundCode(code);
    setPage('fund-detail');
  };

  // 未登录时显示登录弹窗，阻止使用
  if (!authenticated) {
    return <AuthModal onSuccess={handleAuthSuccess} onClose={() => {}} dismissible={false} />;
  }

  return (
    <>
      {/* 右上角“我的”入口 */}
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
        />
      )}
      {page === 'dashboard' && (
        <Dashboard onFundDetail={handleFundDetail} />
      )}

      {/* 聊天气泡 */}
      <ChatBubble onLogout={handleLogout} />
    </>
  );
}

export default App;
