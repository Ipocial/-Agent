import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import type { MarketIndex, TechnicalSignal, DcaPlan, DcaSimulateResult, PriceAlert, TriggeredAlert } from '../types';
import {
  getMarketIndices, getSignals, getDcaPlans, createDcaPlan, deleteDcaPlan, simulateDca,
  getAlerts, createAlert, deleteAlert, checkAlerts,
} from '../services/api';

interface Props {
  onFundDetail?: (code: string) => void;
}

// ============ 工具函数 ============
function ReturnColor({ val }: { val: number }) {
  const cls = val > 0 ? 'text-red-500' : val < 0 ? 'text-green-600' : 'text-stone-500';
  return <span className={`font-semibold ${cls}`}>{val > 0 ? '+' : ''}{val.toFixed(2)}%</span>;
}

function nextInvestDate(dayOfMonth: number): string {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (thisMonth > today) {
    return thisMonth.toLocaleDateString('zh-CN');
  }
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  return nextMonth.toLocaleDateString('zh-CN');
}

// ============ Section 1: 大盘行情 ============
function MarketSection() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMarketIndices();
      setIndices(data);
      setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
    } catch {
      setIndices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const INDEX_ICONS: Record<string, string> = { '上证指数': '📈', '深证成指': '📊', '创业板指': '🚀' };

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-stone-800">大盘行情</h2>
          {lastUpdate && <p className="text-[11px] text-stone-400 mt-0.5">更新于 {lastUpdate}</p>}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-xs text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {loading && indices.length === 0 ? (
        <div className="flex items-center justify-center py-8 gap-2 text-stone-400">
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {indices.length > 0 ? indices.map((idx) => (
            <div key={idx.name} className={`rounded-xl p-4 ${idx.change_pct > 0 ? 'bg-red-50' : idx.change_pct < 0 ? 'bg-green-50' : 'bg-stone-50'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{INDEX_ICONS[idx.name] ?? '📉'}</span>
                <span className="text-xs font-medium text-stone-600">{idx.name}</span>
              </div>
              <p className={`text-xl font-bold ${idx.change_pct > 0 ? 'text-red-600' : idx.change_pct < 0 ? 'text-green-600' : 'text-stone-700'}`}>
                {idx.price?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-xs mt-1 ${idx.change_pct > 0 ? 'text-red-500' : idx.change_pct < 0 ? 'text-green-600' : 'text-stone-500'}`}>
                {idx.change_pct > 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
                <span className="ml-1 opacity-70">({idx.change_val > 0 ? '+' : ''}{idx.change_val?.toFixed(2)})</span>
              </p>
            </div>
          )) : (
            <div className="col-span-3 text-center py-6 text-stone-400 text-sm">暂无数据，请点击刷新</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Section 2: 技术信号 ============
function SignalsSection() {
  const [fundCode, setFundCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [signal, setSignal] = useState<TechnicalSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await getSignals(code.trim());
      setSignal(data);
      setFundCode(code.trim());
    } catch {
      setError('获取失败，请检查基金代码');
      setSignal(null);
    } finally {
      setLoading(false);
    }
  };

  const SIGNAL_CONFIG = {
    bullish: { label: '看多信号', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    bearish: { label: '看空信号', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    neutral: { label: '中性观望', color: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-200' },
  };

  const rsiColor = (rsi: number | null) => {
    if (rsi === null) return 'bg-stone-200';
    if (rsi > 70) return 'bg-red-400';
    if (rsi < 30) return 'bg-green-400';
    return 'bg-brand-400';
  };

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
      <h2 className="text-base font-semibold text-stone-800 mb-4">技术买卖信号</h2>
      <div className="flex gap-2 mb-4">
        <input
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(inputCode)}
          placeholder="输入基金代码，如 110022"
          className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
        />
        <button
          onClick={() => load(inputCode)}
          disabled={loading}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:bg-stone-200 transition-colors"
        >
          {loading ? '分析中...' : '分析'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {signal && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* 信号结论 */}
          {(() => {
            const cfg = SIGNAL_CONFIG[signal.signal];
            return (
              <div className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-stone-400">基金 {fundCode}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{signal.signal_desc}</p>
              </div>
            );
          })()}

          {/* 均线数值 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'MA5', val: signal.ma5 },
              { label: 'MA20', val: signal.ma20 },
              { label: 'MA60', val: signal.ma60 },
              { label: 'RSI(14)', val: signal.rsi, isRsi: true },
            ].map((item) => (
              <div key={item.label} className="bg-stone-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-stone-400 mb-1">{item.label}</p>
                {item.isRsi && item.val !== null ? (
                  <div>
                    <p className="text-sm font-bold text-stone-800">{item.val.toFixed(1)}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${rsiColor(item.val)}`}
                        style={{ width: `${Math.min(item.val, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-stone-400 mt-0.5">
                      {(item.val ?? 0) > 70 ? '超买' : (item.val ?? 0) < 30 ? '超卖' : '正常'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-stone-800">{item.val?.toFixed(4) ?? '--'}</p>
                )}
              </div>
            ))}
          </div>

          {/* 净值走势迷你图 */}
          {signal.nav_history.length > 0 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signal.nav_history}>
                  <Line type="monotone" dataKey="nav" stroke="#16a34a" dot={false} strokeWidth={1.5} />
                  {signal.ma20 && <ReferenceLine y={signal.ma20} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'MA20', position: 'right', fontSize: 9 }} />}
                  {signal.ma5 && <ReferenceLine y={signal.ma5} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'MA5', position: 'right', fontSize: 9 }} />}
                  <Tooltip contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4' }} formatter={(v: number) => [v.toFixed(4), '净值']} labelFormatter={(l) => l} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}

      {!signal && !loading && (
        <p className="text-center text-sm text-stone-400 py-6">输入基金代码查看均线和 RSI 技术信号</p>
      )}
    </div>
  );
}

// ============ Section 3: 定投计划 ============
function DcaSection() {
  const [plans, setPlans] = useState<DcaPlan[]>([]);
  const [adding, setAdding] = useState(false);
  const [simResult, setSimResult] = useState<{ id: number; data: DcaSimulateResult } | null>(null);
  const [simLoading, setSimLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fund_code: '', fund_name: '', monthly_amount: '', day_of_month: '10', start_date: '', note: '',
  });

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try { setPlans(await getDcaPlans()); } catch { setPlans([]); }
  };

  const handleAdd = async () => {
    setError('');
    if (!form.fund_code.trim()) { setError('请填写基金代码'); return; }
    if (!form.monthly_amount || Number(form.monthly_amount) <= 0) { setError('请填写正确的定投金额'); return; }
    if (!form.start_date) { setError('请选择开始日期'); return; }
    try {
      await createDcaPlan({
        fund_code: form.fund_code.trim(),
        fund_name: form.fund_name,
        monthly_amount: Number(form.monthly_amount),
        day_of_month: Number(form.day_of_month),
        start_date: form.start_date,
        note: form.note,
      });
      setAdding(false);
      setForm({ fund_code: '', fund_name: '', monthly_amount: '', day_of_month: '10', start_date: '', note: '' });
      loadPlans();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || '添加失败');
    }
  };

  const handleSimulate = async (id: number) => {
    setSimLoading(id);
    try {
      const data = await simulateDca(id);
      setSimResult({ id, data });
    } catch {
      setError('模拟计算失败');
    } finally {
      setSimLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-stone-800">定投计划</h2>
          <p className="text-xs text-stone-400 mt-0.5">设定每月定投金额和日期，模拟历史收益</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
            + 新建
          </button>
        )}
      </div>

      {/* 新建表单 */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">基金代码</label>
                  <input value={form.fund_code} onChange={(e) => setForm({ ...form, fund_code: e.target.value })} placeholder="如 110022" className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">基金名称（可选）</label>
                  <input value={form.fund_name} onChange={(e) => setForm({ ...form, fund_name: e.target.value })} placeholder="如 易方达蓝筹精选" className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">每月定投金额（元）</label>
                  <input type="number" value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })} placeholder="如 500" className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">每月几号定投（1-28）</label>
                  <input type="number" min="1" max="28" value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">开始日期</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleAdd} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">保存</button>
                <button onClick={() => { setAdding(false); setError(''); }} className="px-3 py-1.5 text-stone-500 text-xs font-medium rounded-lg hover:bg-stone-100 transition-colors">取消</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 计划列表 */}
      {plans.length === 0 && !adding && (
        <div className="text-center py-8 text-stone-400 text-sm">暂无定投计划，点击「新建」添加</div>
      )}
      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.id} className="border border-stone-100 rounded-xl overflow-hidden">
            <div className="p-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-brand-600 text-sm font-semibold">{plan.fund_code}</span>
                  {plan.fund_name && <span className="text-sm text-stone-700">{plan.fund_name}</span>}
                </div>
                <div className="flex gap-4 text-xs text-stone-500">
                  <span>每月 {plan.monthly_amount.toLocaleString()} 元</span>
                  <span>每月 {plan.day_of_month} 号</span>
                  <span>下次：{nextInvestDate(plan.day_of_month)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSimulate(plan.id)}
                  disabled={simLoading === plan.id}
                  className="px-2 py-1 text-[11px] text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors disabled:opacity-50"
                >
                  {simLoading === plan.id ? '计算中...' : '模拟收益'}
                </button>
                <button onClick={async () => { await deleteDcaPlan(plan.id); loadPlans(); }} className="px-2 py-1 text-[11px] text-stone-400 hover:text-red-500 border border-stone-200 hover:border-red-200 rounded-md transition-colors">删除</button>
              </div>
            </div>

            {/* 模拟收益展开 */}
            <AnimatePresence>
              {simResult?.id === plan.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="border-t border-stone-100 bg-stone-50/50 p-4">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {[
                        { label: '累计投入', value: `¥${simResult.data.total_invested.toLocaleString()}` },
                        { label: '当前市值', value: `¥${simResult.data.current_value.toLocaleString()}` },
                        { label: '累计收益', value: `¥${simResult.data.total_return.toLocaleString()}`, colored: true },
                        { label: '收益率', value: `${simResult.data.total_return_pct > 0 ? '+' : ''}${simResult.data.total_return_pct.toFixed(2)}%`, colored: true },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <p className="text-[10px] text-stone-400 mb-0.5">{item.label}</p>
                          <p className={`text-sm font-bold ${item.colored ? (simResult.data.total_return_pct > 0 ? 'text-red-500' : 'text-green-600') : 'text-stone-800'}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-stone-400">共定投 {simResult.data.invest_count} 次，持有 {simResult.data.total_shares.toFixed(2)} 份，最新净值 {simResult.data.latest_nav}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Section 4: 止盈止损提醒 ============
function AlertsSection({ triggeredAlerts }: { triggeredAlerts: TriggeredAlert[] }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fund_code: '', fund_name: '', alert_type: 'profit' as 'profit' | 'loss', target_pct: '', cost_price: '',
  });

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try { setAlerts(await getAlerts()); } catch { setAlerts([]); }
  };

  const handleAdd = async () => {
    setError('');
    if (!form.fund_code.trim()) { setError('请填写基金代码'); return; }
    if (!form.target_pct || !form.cost_price) { setError('请填写目标涨跌幅和成本价'); return; }
    try {
      await createAlert({
        fund_code: form.fund_code.trim(),
        fund_name: form.fund_name,
        alert_type: form.alert_type,
        target_pct: Number(form.target_pct),
        cost_price: Number(form.cost_price),
      });
      setAdding(false);
      setForm({ fund_code: '', fund_name: '', alert_type: 'profit', target_pct: '', cost_price: '' });
      loadAlerts();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || '添加失败');
    }
  };

  const triggeredIds = new Set(triggeredAlerts.map((t) => t.alert.id));

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-stone-800">止盈止损提醒</h2>
          <p className="text-xs text-stone-400 mt-0.5">到达目标涨跌幅时页面提示通知</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
            + 新增
          </button>
        )}
      </div>

      {/* 新增表单 */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">基金代码</label>
                  <input value={form.fund_code} onChange={(e) => setForm({ ...form, fund_code: e.target.value })} placeholder="如 110022" className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">基金名称（可选）</label>
                  <input value={form.fund_name} onChange={(e) => setForm({ ...form, fund_name: e.target.value })} placeholder="如 易方达蓝筹精选" className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">提醒类型</label>
                <div className="flex gap-2">
                  {(['profit', 'loss'] as const).map((t) => (
                    <button key={t} onClick={() => setForm({ ...form, alert_type: t })} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${form.alert_type === t ? 'bg-brand-600 text-white border-brand-600' : 'border-stone-200 text-stone-600 hover:border-brand-300'}`}>
                      {t === 'profit' ? '止盈（达到目标收益）' : '止损（跌至底线）'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">建仓成本价（元/份）</label>
                  <input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="如 2.5" className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">目标{form.alert_type === 'profit' ? '盈利' : '亏损'}幅度（%）</label>
                  <input type="number" value={form.target_pct} onChange={(e) => setForm({ ...form, target_pct: e.target.value })} placeholder={form.alert_type === 'profit' ? '如 20' : '如 -10'} className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none" />
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleAdd} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">保存</button>
                <button onClick={() => { setAdding(false); setError(''); }} className="px-3 py-1.5 text-stone-500 text-xs font-medium rounded-lg hover:bg-stone-100 transition-colors">取消</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {alerts.length === 0 && !adding && (
        <div className="text-center py-8 text-stone-400 text-sm">暂未设置提醒，点击「新增」添加止盈止损目标</div>
      )}
      <div className="space-y-2">
        {alerts.map((alert) => {
          const isTriggered = triggeredIds.has(alert.id);
          const triggered = triggeredAlerts.find((t) => t.alert.id === alert.id);
          return (
            <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isTriggered ? (alert.alert_type === 'profit' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200') : 'bg-stone-50 border-stone-100'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${alert.alert_type === 'profit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {alert.alert_type === 'profit' ? '止盈' : '止损'}
                  </span>
                  <span className="text-sm font-semibold text-stone-700 font-mono">{alert.fund_code}</span>
                  {alert.fund_name && <span className="text-xs text-stone-500">{alert.fund_name}</span>}
                  {isTriggered && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium animate-pulse">已触发</span>}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-stone-500">
                  <span>成本价 {alert.cost_price}</span>
                  <span>目标 {alert.target_pct > 0 ? '+' : ''}{alert.target_pct}%</span>
                  {triggered && <span className={`font-medium ${triggered.current_pct > 0 ? 'text-red-500' : 'text-green-600'}`}>当前 {triggered.current_pct > 0 ? '+' : ''}{triggered.current_pct.toFixed(2)}%</span>}
                </div>
              </div>
              <button onClick={async () => { await deleteAlert(alert.id); loadAlerts(); }} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ 主页面 ============
export default function TrackingPage({ onFundDetail }: Props) {
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 进入页面时检查是否有触发的提醒
    checkAlerts().then((res) => {
      if (res.triggered.length > 0) {
        setTriggeredAlerts(res.triggered);
        setShowBanner(true);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-stone-25">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L6 4L10 9L14 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-semibold text-stone-800 text-lg tracking-tight">FundAdvisor</span>
          </div>
          <div className="h-5 w-px bg-stone-200" />
          <span className="text-sm font-medium text-brand-600">跟踪</span>
        </div>
      </header>

      {/* 止盈止损触发 Banner */}
      <AnimatePresence>
        {showBanner && triggeredAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-yellow-50 border-b border-yellow-200 px-6 py-3"
          >
            <div className="max-w-6xl mx-auto flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-yellow-500 text-lg leading-none mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-800">您有 {triggeredAlerts.length} 条提醒已触发</p>
                  <div className="mt-1 space-y-0.5">
                    {triggeredAlerts.map((t) => (
                      <p key={t.alert.id} className="text-xs text-yellow-700">
                        {t.alert.fund_code} {t.alert.fund_name && `(${t.alert.fund_name})`}
                        {' — '}
                        {t.alert.alert_type === 'profit' ? '收益' : '亏损'}已达
                        <span className="font-semibold mx-1">{t.current_pct > 0 ? '+' : ''}{t.current_pct.toFixed(2)}%</span>
                        （目标 {t.alert.target_pct > 0 ? '+' : ''}{t.alert.target_pct}%）
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowBanner(false)} className="text-yellow-500 hover:text-yellow-700 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Section 1: 大盘行情 */}
        <MarketSection />

        {/* Section 2 & 3 & 4 - 2 column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SignalsSection />
          <DcaSection />
        </div>

        <AlertsSection triggeredAlerts={triggeredAlerts} />
      </main>
    </div>
  );
}

// 避免 ReturnColor 未使用的警告
export { ReturnColor };
