import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { FundRankItem, FundCompareItem, LLMModel, FundInfo } from '../types';
import { AVAILABLE_MODELS } from '../types';
import { getRanking, filterFunds, compareFunds, streamRecommend } from '../services/api';
import ModelSelector from '../components/ModelSelector';
import ReactMarkdown from 'react-markdown';

interface Props {
  onFundDetail: (code: string) => void;
  compareList: FundInfo[];
  onAddCompare: (fund: FundInfo) => void;
  initialTab?: TabKey;
}

type TabKey = 'ranking' | 'filter' | 'recommend' | 'compare';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ranking', label: '排行榜' },
  { key: 'filter', label: '智能筛选' },
  { key: 'recommend', label: '个性化推荐' },
  { key: 'compare', label: `基金对比` },
];

const FUND_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'gp', label: '股票型' },
  { value: 'hh', label: '混合型' },
  { value: 'zq', label: '债券型' },
  { value: 'qdii', label: 'QDII' },
];

const PERIODS = [
  { value: 'zzf1m', label: '近1月' },
  { value: 'zzf6m', label: '近6月' },
  { value: 'zzf', label: '近1年' },
  { value: 'zzf3n', label: '近3年' },
];

// 收益率颜色
function ReturnCell({ val }: { val: string }) {
  if (val === '--' || val === '' || val === undefined) return <span className="text-stone-400">--</span>;
  const num = parseFloat(val);
  if (isNaN(num)) return <span className="text-stone-400">--</span>;
  const cls = num > 0 ? 'text-red-500' : num < 0 ? 'text-green-600' : 'text-stone-500';
  return <span className={`font-medium ${cls}`}>{num > 0 ? '+' : ''}{num.toFixed(2)}%</span>;
}

// 基金列表表格
function FundTable({
  funds,
  loading,
  showPeriod,
  onDetail,
  onAddCompare,
  compareList,
}: {
  funds: FundRankItem[];
  loading: boolean;
  showPeriod: string;
  onDetail: (code: string) => void;
  onAddCompare: (fund: FundInfo) => void;
  compareList: FundInfo[];
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-stone-400">加载排行数据...</span>
      </div>
    );
  }
  if (!funds.length) {
    return <div className="text-center py-16 text-stone-400 text-sm">暂无数据</div>;
  }

  const periodKey = showPeriod === 'zzf1m' ? 'return_1m' : showPeriod === 'zzf6m' ? 'return_6m' : showPeriod === 'zzf3n' ? 'return_3y' : 'return_1y';
  const inCompare = (code: string) => compareList.some((f) => f.code === code);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left py-3 px-3 text-xs font-medium text-stone-400 w-12">排名</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-stone-400">基金名称</th>
            <th className="text-right py-3 px-3 text-xs font-medium text-stone-400">净值</th>
            <th className="text-right py-3 px-3 text-xs font-medium text-stone-400">日涨幅</th>
            <th className="text-right py-3 px-3 text-xs font-medium text-stone-400">近1月</th>
            <th className="text-right py-3 px-3 text-xs font-medium text-stone-400">近6月</th>
            <th className="text-right py-3 px-3 text-xs font-medium text-stone-400 font-semibold">
              {PERIODS.find((p) => p.value === showPeriod)?.label ?? '近1年'}
            </th>
            <th className="text-right py-3 px-3 text-xs font-medium text-stone-400">操作</th>
          </tr>
        </thead>
        <tbody>
          {funds.map((fund, idx) => (
            <motion.tr
              key={fund.code}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02, duration: 0.2 }}
              className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors"
            >
              <td className="py-3 px-3">
                <span className={`inline-flex w-6 h-6 items-center justify-center rounded text-xs font-bold ${fund.rank <= 3 ? 'bg-brand-600 text-white' : 'text-stone-400'}`}>
                  {fund.rank}
                </span>
              </td>
              <td className="py-3 px-3">
                <div>
                  <span className="text-stone-800 font-medium">{fund.name}</span>
                  <span className="ml-2 text-[11px] text-stone-400 font-mono">{fund.code}</span>
                </div>
              </td>
              <td className="py-3 px-3 text-right text-stone-600 font-mono text-xs">{fund.nav}</td>
              <td className="py-3 px-3 text-right"><ReturnCell val={fund.daily_return} /></td>
              <td className="py-3 px-3 text-right"><ReturnCell val={fund.return_1m} /></td>
              <td className="py-3 px-3 text-right"><ReturnCell val={fund.return_6m} /></td>
              <td className="py-3 px-3 text-right font-semibold"><ReturnCell val={fund[periodKey as keyof FundRankItem] as string} /></td>
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onDetail(fund.code)}
                    className="px-2 py-1 text-[11px] text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors"
                  >
                    详情
                  </button>
                  <button
                    onClick={() => onAddCompare({ code: fund.code, name: fund.name, type: '', manager: '', company: '', size: '', establishment_date: '' })}
                    disabled={inCompare(fund.code) || compareList.length >= 3}
                    className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
                      inCompare(fund.code)
                        ? 'text-stone-300 border-stone-200 cursor-default'
                        : compareList.length >= 3
                        ? 'text-stone-300 border-stone-200 cursor-not-allowed'
                        : 'text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {inCompare(fund.code) ? '已加入' : '对比'}
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Tab 1: 排行榜 ============
function RankingTab({ onDetail, onAddCompare, compareList }: { onDetail: (c: string) => void; onAddCompare: (f: FundInfo) => void; compareList: FundInfo[] }) {
  const [fundType, setFundType] = useState('all');
  const [period, setPeriod] = useState('zzf');
  const [funds, setFunds] = useState<FundRankItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (ft: string, sc: string) => {
    setLoading(true);
    try {
      const data = await getRanking(ft, sc, 20);
      setFunds(data);
    } catch {
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(fundType, period); }, [fundType, period]);

  return (
    <div>
      {/* 类型切换 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FUND_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFundType(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${fundType === t.value ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${period === p.value ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <FundTable funds={funds} loading={loading} showPeriod={period} onDetail={onDetail} onAddCompare={onAddCompare} compareList={compareList} />
    </div>
  );
}

// ============ Tab 2: 智能筛选 ============
function FilterTab({ onDetail, onAddCompare, compareList }: { onDetail: (c: string) => void; onAddCompare: (f: FundInfo) => void; compareList: FundInfo[] }) {
  const [fundType, setFundType] = useState('all');
  const [minReturn1y, setMinReturn1y] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('return_1y');
  const [funds, setFunds] = useState<FundRankItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { ft: fundType, sc: 'zzf', pn: 50, sort_by: sortBy };
      if (minReturn1y !== '') params.min_return_1y = minReturn1y;
      const data = await filterFunds(params);
      setFunds(data);
    } catch {
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleFilter(); }, []);

  return (
    <div className="flex gap-6">
      {/* 左侧筛选面板 */}
      <div className="w-52 shrink-0 space-y-5">
        <div>
          <p className="text-xs font-medium text-stone-500 mb-2">基金类型</p>
          <div className="space-y-1.5">
            {FUND_TYPES.map((t) => (
              <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ft"
                  value={t.value}
                  checked={fundType === t.value}
                  onChange={() => setFundType(t.value)}
                  className="accent-brand-600"
                />
                <span className="text-sm text-stone-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-stone-500 mb-2">近1年最低收益率（%）</p>
          <input
            type="number"
            value={minReturn1y}
            onChange={(e) => setMinReturn1y(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="如 10"
            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 outline-none"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-stone-500 mb-2">排序依据</p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:border-brand-400 outline-none"
          >
            <option value="return_1y">近1年收益</option>
            <option value="return_6m">近6月收益</option>
            <option value="return_1m">近1月收益</option>
            <option value="return_3y">近3年收益</option>
            <option value="daily_return">日涨幅</option>
          </select>
        </div>

        <button
          onClick={handleFilter}
          className="w-full px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          筛选
        </button>
      </div>

      {/* 右侧结果 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-stone-400">共 {funds.length} 条结果</p>
        </div>
        <FundTable funds={funds} loading={loading} showPeriod="zzf" onDetail={onDetail} onAddCompare={onAddCompare} compareList={compareList} />
      </div>
    </div>
  );
}

// ============ Tab 3: 个性化推荐 ============
function RecommendTab() {
  const [riskLevel, setRiskLevel] = useState(3);
  const [amount, setAmount] = useState('10000');
  const [periodYears, setPeriodYears] = useState(3);
  const [model, setModel] = useState<LLMModel>(AVAILABLE_MODELS[0]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const RISK_LABELS = ['', '保守型', '稳健型', '平衡型', '成长型', '激进型'];
  const RISK_DESCS = ['', '不接受亏损，追求稳定', '可承受少量亏损', '接受一定波动', '可承受较大波动', '追求高收益，承受大亏损'];

  const handleStart = async () => {
    if (loading) return;
    setContent('');
    setStarted(true);
    setLoading(true);
    try {
      for await (const event of streamRecommend({
        risk_level: riskLevel,
        amount: parseFloat(amount) || 10000,
        period_years: periodYears,
        model_provider: model.provider,
        model_name: model.name,
      })) {
        if (event.type === 'content' && event.content) {
          setContent((prev) => prev + event.content);
          // 自动滚动到底部
          setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
        } else if (event.type === 'done') {
          break;
        } else if (event.type === 'error') {
          setContent((prev) => prev + `\n\n> 错误：${event.content}`);
          break;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败，请检查 API Key 配置';
      setContent(`**分析失败：** ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* 问卷 */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-6 mb-6">
        <h3 className="text-base font-semibold text-stone-800 mb-5">告诉我你的投资偏好</h3>

        {/* 风险偏好 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-stone-700 mb-3">风险偏好</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setRiskLevel(level)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  riskLevel === level ? 'bg-brand-600 text-white border-brand-600' : 'border-stone-200 text-stone-600 hover:border-brand-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          {riskLevel > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              <span className="font-medium text-brand-600">{RISK_LABELS[riskLevel]}</span> — {RISK_DESCS[riskLevel]}
            </p>
          )}
        </div>

        {/* 投资金额 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-stone-700 mb-2">计划投入金额（元）</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
            placeholder="如：10000"
          />
        </div>

        {/* 投资期限 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-stone-700 mb-2">投资期限</label>
          <div className="flex gap-2">
            {[1, 3, 5].map((y) => (
              <button
                key={y}
                onClick={() => setPeriodYears(y)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  periodYears === y ? 'bg-brand-600 text-white border-brand-600' : 'border-stone-200 text-stone-600 hover:border-brand-300'
                }`}
              >
                {y} 年
              </button>
            ))}
          </div>
        </div>

        {/* 模型选择 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-stone-700 mb-2">AI 模型</label>
          <ModelSelector selected={model} onChange={setModel} />
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
            loading ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 分析中...
            </span>
          ) : '开始分析，获取推荐组合'}
        </button>
      </div>

      {/* AI 输出 */}
      <AnimatePresence>
        {started && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-stone-100 shadow-sm p-6"
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-stone-800">AI 投资顾问建议</span>
              {loading && <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse ml-auto" />}
            </div>
            <div className="prose prose-sm prose-stone max-w-none text-stone-700 leading-relaxed">
              <ReactMarkdown>{content || ' '}</ReactMarkdown>
            </div>
            <div ref={contentRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Tab 4: 基金对比 ============
function CompareTab({ compareList, onDetail }: { compareList: FundInfo[]; onDetail: (c: string) => void }) {
  const [compareData, setCompareData] = useState<FundCompareItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (compareList.length > 0) loadCompareData();
    else setCompareData([]);
  }, [compareList]);

  const loadCompareData = async () => {
    setLoading(true);
    try {
      const codes = compareList.map((f) => f.code);
      const data = await compareFunds(codes);
      setCompareData(data);
    } catch {
      setCompareData([]);
    } finally {
      setLoading(false);
    }
  };

  if (compareList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm text-stone-500 font-medium">还没有加入对比的基金</p>
        <p className="text-xs text-stone-400 mt-1">在排行榜或基金详情页点击「对比」按钮，最多可加入 3 只</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-stone-400">加载对比数据...</span>
      </div>
    );
  }

  const METRICS = [
    { key: 'return_1m', label: '近1月收益', isReturn: true },
    { key: 'return_3m', label: '近3月收益', isReturn: true },
    { key: 'return_6m', label: '近6月收益', isReturn: true },
    { key: 'return_1y', label: '近1年收益', isReturn: true },
    { key: 'volatility', label: '年化波动率', unit: '%', lowerBetter: true },
    { key: 'max_drawdown', label: '最大回撤', unit: '%', lowerBetter: true },
    { key: 'sharpe', label: '夏普比率', unit: '', higherBetter: true },
  ];

  return (
    <div>
      {/* 基金卡片并排 */}
      <div className={`grid gap-4 mb-6 grid-cols-${compareData.length}`} style={{ gridTemplateColumns: `repeat(${compareData.length}, 1fr)` }}>
        {compareData.map((fund) => (
          <div key={fund.code} className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
            <button
              onClick={() => onDetail(fund.code)}
              className="text-left w-full hover:opacity-80 transition-opacity"
            >
              <span className="block text-sm font-semibold text-stone-800 truncate">{fund.name}</span>
              <span className="block text-xs text-stone-400 font-mono mt-0.5">{fund.code}</span>
              {fund.manager && <span className="block text-xs text-stone-400 mt-0.5">基金经理：{fund.manager}</span>}
            </button>
            {/* 迷你净值图 */}
            {fund.nav_history.length > 0 && (
              <div className="mt-3 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fund.nav_history}>
                    <Line type="monotone" dataKey="acc_nav" stroke="#16a34a" dot={false} strokeWidth={1.5} />
                    <Tooltip
                      contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4' }}
                      formatter={(val: number) => [val.toFixed(4), '累计净值']}
                      labelFormatter={(label) => label}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 指标对比表 */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-stone-500 w-32">指标</th>
              {compareData.map((fund) => (
                <th key={fund.code} className="text-right py-3 px-4 text-xs font-medium text-stone-800">
                  {fund.name.length > 10 ? fund.name.slice(0, 10) + '...' : fund.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric, midx) => {
              // 找最大/最小值用于高亮
              const vals = compareData.map((f) => {
                const raw = f.metrics[metric.key as keyof typeof f.metrics];
                return typeof raw === 'string' ? parseFloat(raw) : raw as number;
              });
              const validVals = vals.filter((v) => !isNaN(v));
              const best = metric.lowerBetter ? Math.min(...validVals) : Math.max(...validVals);

              return (
                <tr key={metric.key} className={`border-b border-stone-50 ${midx % 2 === 0 ? '' : 'bg-stone-50/30'}`}>
                  <td className="py-3 px-4 text-xs text-stone-500">{metric.label}</td>
                  {compareData.map((fund) => {
                    const rawVal = fund.metrics[metric.key as keyof typeof fund.metrics];
                    const numVal = typeof rawVal === 'string' ? parseFloat(rawVal as string) : rawVal as number;
                    const isValid = !isNaN(numVal);
                    const isBest = isValid && validVals.length > 1 && numVal === best;

                    let display = '--';
                    let colorCls = 'text-stone-600';
                    if (isValid) {
                      if (metric.isReturn) {
                        display = `${numVal > 0 ? '+' : ''}${numVal.toFixed(2)}%`;
                        colorCls = numVal > 0 ? 'text-red-500' : numVal < 0 ? 'text-green-600' : 'text-stone-500';
                      } else {
                        display = `${numVal.toFixed(2)}${metric.unit ?? ''}`;
                      }
                    }

                    return (
                      <td key={fund.code} className="py-3 px-4 text-right">
                        <span className={`text-sm font-medium ${colorCls} ${isBest ? 'bg-yellow-50 px-1.5 py-0.5 rounded' : ''}`}>
                          {display}
                        </span>
                        {isBest && validVals.length > 1 && (
                          <span className="ml-1 text-[10px] text-yellow-600">★</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-stone-400 text-center mt-4">★ 表示该指标表现最佳。数据基于近1年历史净值计算，仅供参考。</p>
    </div>
  );
}

// ============ 主页面 ============
export default function DiscoverPage({ onFundDetail, compareList, onAddCompare, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? 'ranking');

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
          <span className="text-sm font-medium text-brand-600">发现基金</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 bg-stone-100/70 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.key === 'compare' ? `${tab.label}${compareList.length > 0 ? ` (${compareList.length})` : ''}` : tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl border border-stone-100 shadow-sm p-6"
          >
            {activeTab === 'ranking' && (
              <RankingTab onDetail={onFundDetail} onAddCompare={onAddCompare} compareList={compareList} />
            )}
            {activeTab === 'filter' && (
              <FilterTab onDetail={onFundDetail} onAddCompare={onAddCompare} compareList={compareList} />
            )}
            {activeTab === 'recommend' && <RecommendTab />}
            {activeTab === 'compare' && (
              <CompareTab compareList={compareList} onDetail={onFundDetail} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
