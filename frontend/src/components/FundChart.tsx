import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { FundNAV } from '../types';

interface Props { navHistory: FundNAV[]; fundName: string; }
const ranges = [{ label: '近1月', days: 30 }, { label: '近3月', days: 90 }, { label: '近6月', days: 180 }];

// X-axis interval based on range
const intervalMap: Record<number, number> = { 30: 4, 90: 14, 180: 29 };

// Custom tooltip with crosshair feel
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-lg" style={{ minWidth: 160 }}>
      <p className="text-xs text-stone-400 mb-2 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-xs text-stone-500">{entry.name}</span>
          </div>
          <span className="text-xs font-semibold text-stone-800 tabular-nums">{Number(entry.value).toFixed(4)}</span>
        </div>
      ))}
    </div>
  );
}

export default function FundChart({ navHistory }: Props) {
  const [range, setRange] = useState<number>(90);

  const displayData = useMemo(() => {
    const sliced = navHistory.slice(-range);
    const interval = intervalMap[range] || 14;
    return sliced.map((item, idx) => ({
      ...item,
      date: item.date.slice(5),
      showLabel: idx % interval === 0 || idx === sliced.length - 1,
    }));
  }, [navHistory, range]);

  const withMA = useMemo(() => displayData.map((item, idx, arr) => ({
    ...item,
    ma5: idx >= 4 ? arr.slice(idx - 4, idx + 1).reduce((s, d) => s + d.nav, 0) / 5 : undefined,
    ma20: idx >= 19 ? arr.slice(idx - 19, idx + 1).reduce((s, d) => s + d.nav, 0) / 20 : undefined,
  })), [displayData]);

  const latest = navHistory[navHistory.length - 1];
  const earliest = navHistory.slice(-range)[0];
  const changePercent = earliest ? ((latest.nav - earliest.nav) / earliest.nav * 100).toFixed(2) : '0.00';
  const isUp = parseFloat(changePercent) >= 0;

  return (
    <div className="card">
      {/* Header: Key metrics + Segmented control */}
      <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">净值走势</h3>
          <div className="flex items-baseline gap-3">
            <span className="text-[32px] font-bold text-stone-800 tracking-tight leading-none">{latest.nav.toFixed(4)}</span>
            <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${isUp ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
              {isUp ? '+' : ''}{changePercent}%
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1.5">截止 {latest.date}</p>
        </div>
        <div className="flex gap-0.5 bg-stone-50 rounded-xl p-1 shrink-0">
          {ranges.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`segmented-btn ${range === r.days ? 'active' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={withMA} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e7e5e4' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v: number) => v.toFixed(3)}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: '#d6d3d1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend
              iconType="line"
              iconSize={16}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            <Line
              type="monotone"
              dataKey="nav"
              stroke="#2850d9"
              dot={false}
              strokeWidth={2.5}
              name="净值"
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="ma5"
              stroke="#d97706"
              dot={false}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              name="MA5"
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="#8b5cf6"
              dot={false}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              name="MA20"
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
