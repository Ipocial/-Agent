import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import FundDetail from './pages/FundDetail';

function App() {
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);

  if (selectedFundCode) {
    return (
      <FundDetail
        fundCode={selectedFundCode}
        onBack={() => setSelectedFundCode(null)}
      />
    );
  }

  return <Dashboard onFundDetail={(code) => setSelectedFundCode(code)} />;
}

export default App;
