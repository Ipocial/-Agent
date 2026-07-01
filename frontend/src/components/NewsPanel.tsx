import { useEffect, useState } from 'react';
import type { NewsItem } from '../types';
import { getFinancialNews } from '../services/api';

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const data = await getFinancialNews(10);
      setNews(data);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">财经热点</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">财经热点</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {news.map((item, idx) => (
          <div key={idx} className="border-b border-gray-50 pb-2 last:border-b-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 hover:text-blue-600 line-clamp-2"
            >
              {item.title}
            </a>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">{item.source}</span>
              <span className="text-xs text-gray-400">{item.publish_time}</span>
            </div>
          </div>
        ))}
        {news.length === 0 && (
          <p className="text-sm text-gray-400">暂无新闻数据</p>
        )}
      </div>
    </div>
  );
}
