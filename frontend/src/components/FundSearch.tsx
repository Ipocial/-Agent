import { useState, useRef, useEffect } from 'react';
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
          placeholder="搜索基金代码或名称..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-smooth"
        />
        {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-stone-100 rounded-xl shadow-md overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {results.map((fund, idx) => (
              <button key={fund.code} onClick={() => { onSelect(fund); setShowDropdown(false); setKeyword(`${fund.code} ${fund.name}`); }} className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-smooth ${idx < results.length - 1 ? 'border-b border-stone-50' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-sm text-brand-600 font-medium">{fund.code}</span>
                  {fund.type && <span className="text-[11px] text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">{fund.type}</span>}
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
