import { useState, useEffect } from 'react';
import { Award, TrendingUp, TrendingDown, Users, CreditCard, Wallet } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface RMEntry {
  rm_id: string;
  rm_name: string;
  rm_role: string;
  rank: number;
  total_customers: number;
  total_transactions: number;
  total_deposits: number;
  total_withdrawals: number;
  total_volume: number;
  net_flow: number;
  portfolio_balance: number;
}

const PERIODS = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: '365', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

const SORT_OPTIONS = [
  { value: 'total_volume', label: 'Volume' },
  { value: 'total_deposits', label: 'Deposits' },
  { value: 'total_customers', label: 'Customers' },
  { value: 'portfolio_balance', label: 'Portfolio' },
  { value: 'net_flow', label: 'Net Flow' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const roleLabel = (role: string) => role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

const medalColor = (rank: number) => {
  if (rank === 1) return 'text-yellow-500';
  if (rank === 2) return 'text-gray-400';
  if (rank === 3) return 'text-amber-600';
  return 'text-gray-300';
};

const podiumHeight = (rank: number) => {
  if (rank === 1) return 'h-28';
  if (rank === 2) return 'h-20';
  return 'h-14';
};

export default function AdminRMLeague() {
  const [league, setLeague] = useState<RMEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [sortBy, setSortBy] = useState('total_volume');
  const [useMonthYear, setUseMonthYear] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchLeague(); }, [period, selectedMonth, selectedYear, useMonthYear]);

  const fetchLeague = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = useMonthYear
        ? { month: selectedMonth + 1, year: selectedYear }
        : { period };
      const res = await adminAPI.getRMLeague(params);
      setLeague(res.data.league || []);
    } catch { toast.error('Failed to load RM league'); }
    finally { setIsLoading(false); }
  };

  const sorted = [...league].sort((a, b) => (b[sortBy as keyof RMEntry] as number) - (a[sortBy as keyof RMEntry] as number));
  const top3 = sorted.slice(0, 3);
  const maxVolume = sorted[0]?.total_volume || 1;

  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  const podiumRank = (entry: RMEntry) => sorted.findIndex(e => e.rm_id === entry.rm_id) + 1;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RM League</h1>
        <p className="text-gray-500 text-sm mt-0.5">Relationship Manager performance rankings</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setUseMonthYear(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!useMonthYear ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Period
          </button>
          <button
            onClick={() => setUseMonthYear(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${useMonthYear ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Month / Year
          </button>
        </div>

        {!useMonthYear ? (
          <div className="flex gap-1 flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.value ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="input-field py-1.5 text-xs w-28"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="input-field py-1.5 text-xs w-24"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field py-1.5 text-xs w-32">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : league.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Award size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No RM data yet</p>
          <p className="text-sm mt-1">Assign RMs to customers to see rankings here</p>
        </div>
      ) : (
        <>
          {/* Podium — only shown if ≥ 2 RMs */}
          {sorted.length >= 2 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-600 mb-6 text-center tracking-wide uppercase">Top Performers</h2>
              <div className="flex items-end justify-center gap-4">
                {podiumOrder.map((rm) => {
                  const rank = podiumRank(rm);
                  return (
                    <div key={rm.rm_id} className="flex flex-col items-center gap-2 flex-1 max-w-[140px]">
                      <Award size={20} className={medalColor(rank)} />
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-800 truncate w-full">{rm.rm_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{roleLabel(rm.rm_role)}</p>
                        <p className="text-xs font-bold text-primary-700 mt-0.5">{formatCurrency(rm.total_volume)}</p>
                      </div>
                      <div className={`w-full rounded-t-lg flex items-center justify-center ${podiumHeight(rank)} ${rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-gray-300' : 'bg-amber-500'}`}>
                        <span className="text-2xl font-black text-white">#{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Standings */}
          <div className="card overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Full Standings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">RM</th>
                    <th className="px-4 py-3 text-right">Customers</th>
                    <th className="px-4 py-3 text-right">Deposits</th>
                    <th className="px-4 py-3 text-right">Withdrawals</th>
                    <th className="px-4 py-3 text-right">Net Flow</th>
                    <th className="px-4 py-3 text-right">Portfolio</th>
                    <th className="px-4 py-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((rm, idx) => {
                    const rank = idx + 1;
                    const volPct = maxVolume > 0 ? (rm.total_volume / maxVolume) * 100 : 0;
                    return (
                      <tr key={rm.rm_id} className={`hover:bg-gray-50 transition-colors ${rank <= 3 ? 'font-medium' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Award size={16} className={medalColor(rank)} />
                            <span className="text-gray-700 font-bold">#{rank}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs">
                              {rm.rm_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-gray-800 font-semibold">{rm.rm_name}</p>
                              <p className="text-xs text-gray-400 capitalize">{roleLabel(rm.rm_role)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Users size={13} className="text-blue-400" />
                            <span className="text-gray-700">{rm.total_customers}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(rm.total_deposits)}</td>
                        <td className="px-4 py-3 text-right text-red-500">{formatCurrency(rm.total_withdrawals)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {rm.net_flow >= 0
                              ? <TrendingUp size={13} className="text-emerald-500" />
                              : <TrendingDown size={13} className="text-red-400" />}
                            <span className={rm.net_flow >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                              {formatCurrency(Math.abs(rm.net_flow))}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Wallet size={13} className="text-purple-400" />
                            <span className="text-gray-700">{formatCurrency(rm.portfolio_balance)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-bold text-primary-800">{formatCurrency(rm.total_volume)}</span>
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full">
                              <div className="h-1.5 bg-primary-600 rounded-full" style={{ width: `${volPct}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer totals */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-6 text-xs text-gray-500">
              <span><strong className="text-gray-700">{sorted.length}</strong> Relationship Managers</span>
              <span>Total deposits: <strong className="text-emerald-600">{formatCurrency(sorted.reduce((s, r) => s + r.total_deposits, 0))}</strong></span>
              <span>Total withdrawals: <strong className="text-red-500">{formatCurrency(sorted.reduce((s, r) => s + r.total_withdrawals, 0))}</strong></span>
              <span>Total portfolio: <strong className="text-primary-700">{formatCurrency(sorted.reduce((s, r) => s + r.portfolio_balance, 0))}</strong></span>
              <span className="flex items-center gap-1">
                <CreditCard size={12} />
                Total txns: <strong className="text-gray-700">{sorted.reduce((s, r) => s + r.total_transactions, 0)}</strong>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
