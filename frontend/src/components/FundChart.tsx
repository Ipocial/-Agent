import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { FundNAV } from '../types';

interface Props { navHistory: FundNAV[]; fundName: string; }
const ranges = [{ label: '1月', days: 30 }, { label: '3月', days: 90 }, { label: '6月', days: 180 }];

export default function FundChart({ navHistory }: Props) {
  const [range, setRange] = useState<number>(90);
  const displayData = navHistory.slice(-range).map((item) => ({ ...item, date: item.date.slice(5) }));
  const withMA = displayData.map((item, idx, arr) => ({
    ...item,
    ma5: idx >= 4 ? arr.slice(idx - 4, idx + 1).reduce((s, d) => s + d.nav, 0) / 5 : undefined,
    ma20: idx >= 19 ? arr.slice(idx - 19, idx + 1).reduce((s, d) => s + d.nav, 0) / 20 : undefined,
  }));
  const latest = navHistory[navHistory.length - 1];
  const earliest = navHistory.slice(-range)[0];
  const changePercent = earliest ? ((latest.nav - earliest.nav) / earliest.nav * 100).toFixed(2) : '0.00';
  const isUp = parseFloat(changePercent) >= 0;

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-xs overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-stone-500 mb-1">净值走势</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-800 tracking-tight">{latest.nav.toFixed(4)}</span>
            <span className={`text-sm font-medium ${isUp ? 'text-red-500' : 'text-green-600'}`}>{isUp ? '+' : ''}{changePercent}%</span>
          </div>
        </div>
        <div className="flex gap-1 bg-stone-50 rounded-lg p-0.5">
          {ranges.map((r) => (
            <button key={r.days} onClick={() => setRange(r.days)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${range === r.days ? 'bg-white text-stone-800 shadow-xs' : 'text-stone-400 hover:text-stone-600'}`}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={withMA} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0eeec" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => v.toFixed(3)} />
            <Tooltip contentStyle={{ background: 'white', border: '1px solid #e7e5e4', borderRadius: '8px', boxShadow: '0 4px 12px rgba(28,25,23,0.06)', fontSize: '13px', padding: '8px 12px' }} formatter={(value: any, name: any) => { const labels: Record<string, string> = { nav: '净值', ma5: 'MA5', ma20: 'MA20' }; return [Number(value).toFixed(4), labels[String(name)] || String(name)]; }} />
            <Legend iconType="line" iconSize={16} wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }} />
            <Line type="monotone" dataKey="nav" stroke="#3b6ef7" dot={false} strokeWidth={2} name="净值" />
            <Line type="monotone" dataKey="ma5" stroke="#d97706" dot={false} strokeWidth={1.2} strokeDasharray="4 2" name="MA5" />
            <Line type="monotone" dataKey="ma20" stroke="#16a34a" dot={false} strokeWidth={1.2} strokeDasharray="4 2" name="MA20" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
