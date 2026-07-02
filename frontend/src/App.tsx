import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import FundDetail from './pages/FundDetail';
import ChatBubble from './components/ChatBubble';

function App() {
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);

  return (
    <>
      {selectedFundCode ? (
        <FundDetail
          fundCode={selectedFundCode}
          onBack={() => setSelectedFundCode(null)}
        />
      ) : (
        <Dashboard onFundDetail={(code) => setSelectedFundCode(code)} />
      )}
      <ChatBubble />
    </>
  );
}

export default App;
