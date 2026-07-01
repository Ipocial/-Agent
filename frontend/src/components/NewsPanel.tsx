import { useEffect, useState } from 'react';
import type { NewsItem } from '../types';
import { getFinancialNews } from '../services/api';

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNews(); }, []);

  const loadNews = async () => {
    try { const data = await getFinancialNews(15); setNews(data); } catch { setNews([]); } finally { setLoading(false); }
  };

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-stone-50">
        <h3 className="text-sm font-semibold text-stone-700">财经热点</h3>
      </div>
      <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex flex-col gap-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            ))
          : news.length === 0
            ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-stone-400">暂无新闻数据</p>
                <button onClick={loadNews} className="mt-2 text-xs text-brand-600 hover:text-brand-700 font-medium transition-smooth">点击刷新</button>
              </div>
            )
            : news.map((item, idx) => (
                <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="block px-5 py-3 hover:bg-stone-50 transition-smooth group">
                  <p className="text-sm text-stone-700 group-hover:text-brand-600 line-clamp-2 leading-relaxed mb-1">{item.title}</p>
                  <div className="flex items-center gap-2 text-[11px] text-stone-400">
                    <span>{item.source}</span>
                    {item.publish_time && (
                      <><span className="w-0.5 h-0.5 rounded-full bg-stone-200" /><span>{item.publish_time}</span></>
                    )}
                  </div>
                </a>
              ))
        }
      </div>
    </div>
  );
}
