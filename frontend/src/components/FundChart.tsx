import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { FundNAV } from '../types';

interface Props {
  navHistory: FundNAV[];
  fundName: string;
}

export default function FundChart({ navHistory, fundName }: Props) {
  const [range, setRange] = useState<number>(90);

  const ranges = [
    { label: '1月', days: 30 },
    { label: '3月', days: 90 },
    { label: '6月', days: 180 },
  ];

  const displayData = navHistory.slice(-range).map((item) => ({
    ...item,
    date: item.date.slice(5), // 只显示月-日
    returnPct: (item.daily_return * 100).toFixed(2),
  }));

  // 计算MA均线
  const withMA = displayData.map((item, idx, arr) => {
    const ma5 = idx >= 4
      ? arr.slice(idx - 4, idx + 1).reduce((sum, d) => sum + d.nav, 0) / 5
      : undefined;
    const ma20 = idx >= 19
      ? arr.slice(idx - 19, idx + 1).reduce((sum, d) => sum + d.nav, 0) / 20
      : undefined;
    return { ...item, ma5, ma20 };
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{fundName} - 净值走势</h3>
        <div className="flex gap-2">
          {ranges.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`px-3 py-1 rounded-md text-sm ${
                range === r.days
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={withMA}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = { nav: '净值', ma5: 'MA5', ma20: 'MA20' };
              return [Number(value).toFixed(4), labels[String(name)] || String(name)];
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="nav" stroke="#3b82f6" dot={false} strokeWidth={2} name="净值" />
          <Line type="monotone" dataKey="ma5" stroke="#f59e0b" dot={false} strokeWidth={1} strokeDasharray="4 2" name="MA5" />
          <Line type="monotone" dataKey="ma20" stroke="#10b981" dot={false} strokeWidth={1} strokeDasharray="4 2" name="MA20" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
