import { useState, useRef, useEffect } from 'react';
import type { FundInfo } from '../types';
import { searchFunds } from '../services/api';

interface Props {
  onSelect: (fund: FundInfo) => void;
  onClear?: () => void;
  selectedFund?: FundInfo | null;
}

export default function FundSearch({ onSelect, onClear, selectedFund }: Props) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<FundInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); setShowDropdown(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const funds = await searchFunds(value);
        setResults(funds);
        setShowDropdown(funds.length > 0);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
  };

  const handleClear = () => {
    setKeyword('');
    setResults([]);
    setShowDropdown(false);
    onClear?.();
  };

  // Chip style when fund is selected
  if (selectedFund) {
    return (
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg shadow-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md text-sm font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-mono">{selectedFund.code}</span>
            <span className="text-brand-600/70 hidden sm:inline">{selectedFund.name}</span>
          </span>
          {selectedFund.type && (
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded hidden sm:inline">{selectedFund.type}</span>
          )}
          <div className="flex-1" />
          <button
            onClick={handleClear}
            className="p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-smooth"
            title="切换基金"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Search input mode
  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={keyword}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="输入基金代码或名称搜索..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-300/70 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-smooth shadow-xs"
        />
        {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-stone-100 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {results.map((fund, idx) => (
              <button key={fund.code} onClick={() => { onSelect(fund); setShowDropdown(false); setKeyword(''); }} className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-smooth ${idx < results.length - 1 ? 'border-b border-stone-50' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-sm text-brand-600 font-medium">{fund.code}</span>
                  {fund.type && <span className="text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">{fund.type}</span>}
                </div>
                <p className="text-sm text-stone-600 truncate">{fund.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
