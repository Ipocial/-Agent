import { useState } from 'react';
import type { FundInfo } from '../types';
import { searchFunds } from '../services/api';

interface Props {
  onSelect: (fund: FundInfo) => void;
}

export default function FundSearch({ onSelect }: Props) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<FundInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (value: string) => {
    setKeyword(value);
    if (value.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const funds = await searchFunds(value);
      setResults(funds);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="输入基金代码或名称搜索..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
        />
        {loading && (
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((fund) => (
            <div
              key={fund.code}
              onClick={() => {
                onSelect(fund);
                setShowDropdown(false);
                setKeyword(`${fund.code} ${fund.name}`);
              }}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-blue-600">{fund.code}</span>
                <span className="text-xs text-gray-500">{fund.type}</span>
              </div>
              <div className="text-sm text-gray-700 mt-1">{fund.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
