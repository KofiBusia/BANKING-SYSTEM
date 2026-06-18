import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Building2, Users, ArrowLeftRight, RefreshCw, Medal } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface BranchEntry {
  rank: number;
  branch_id: string;
  branch_name: string;
  branch_code: string;
  city: string;
  region: string;
  total_customers: number;
  total_accounts: number;
  active_accounts: number;
  total_transactions: number;
  total_deposits: number;
  total_withdrawals: number;
  total_volume: number;
  net_flow: number;
  total_balance: number;
}

const PERIODS = [
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
  { label: '1 Year', value: '365' },
  { label: 'All Time', value: 'all' },
];

const SORT_OPTIONS = [
  { label: 'Transaction Volume', key: 'total_volume' },
  { label: 'Total Deposits', key: 'total_deposits' },
  { label: 'Total Withdrawals', key: 'total_withdrawals' },
  { label: 'Net Flow', key: 'net_flow' },
  { label: 'Total Customers', key: 'total_customers' },
  { label: 'Balance Held', key: 'total_balance' },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-400">
      <Trophy size={18} className="text-amber-500" />
    </div>
  );
  if (rank === 2) return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-400">
      <Medal size={18} className="text-gray-500" />
    </div>
  );
  if (rank === 3) return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 border-2 border-orange-400">
      <Medal size={18} className="text-orange-500" />
    </div>
  );
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200">
      <span className="text-sm font-bold text-gray-500">#{rank}</span>
    </div>
  );
}

function RowHighlight({ rank }: { rank: number }) {
  if (rank === 1) return 'bg-amber-50 border-l-4 border-amber-400';
  if (rank === 2) return 'bg-gray-50 border-l-4 border-gray-300';
  if (rank === 3) return 'bg-orange-50 border-l-4 border-orange-300';
  return 'border-l-4 border-transparent';
}

export default function AdminBranchLeague() {
  const [league, setLeague] = useState<BranchEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [sortKey, setSortKey] = useState('total_volume');
  const [generatedAt, setGeneratedAt] = useState('');

  useEffect(() => { fetchLeague(); }, [period]);

  const fetchLeague = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getBranchLeague(period);
      const data: BranchEntry[] = res.data.league || [];
      setGeneratedAt(res.data.generated_at);
      applySort(data, sortKey);
    } catch {
      toast.error('Failed to load branch league');
    } finally {
      setIsLoading(false);
    }
  };

  const applySort = (data: BranchEntry[], key: string) => {
    const sorted = [...data].sort((a: any, b: any) => b[key] - a[key]);
    sorted.forEach((e, i) => { e.rank = i + 1; });
    setLeague(sorted);
    setSortKey(key);
  };

  const topDeposit = league.length ? Math.max(...league.map(b => b.total_deposits)) : 1;
  const topVolume = league.length ? Math.max(...league.map(b => b.total_volume)) : 1;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch League</h1>
          <p className="text-gray-500 text-sm mt-0.5">Live performance rankings across all branches</p>
        </div>
        <button onClick={fetchLeague} disabled={isLoading} className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm self-start">
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${period === p.value ? 'bg-primary-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-400'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Sort by */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sort by:</span>
        {SORT_OPTIONS.map(s => (
          <button key={s.key} onClick={() => applySort(league, s.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${sortKey === s.key ? 'bg-primary-100 text-primary-800 ring-1 ring-primary-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {!isLoading && league.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[league[1], league[0], league[2]].filter(Boolean).map((branch, podiumIdx) => {
            const isPrimary = podiumIdx === 1;
            const colors = [
              'border-gray-300 bg-gray-50',
              'border-amber-400 bg-amber-50',
              'border-orange-300 bg-orange-50',
            ];
            const heights = ['h-28', 'h-36', 'h-24'];
            return (
              <div key={branch.branch_id}
                className={`card border-2 ${colors[podiumIdx]} flex flex-col items-center justify-center text-center ${heights[podiumIdx]} relative`}>
                <RankBadge rank={branch.rank} />
                <p className={`font-bold mt-2 ${isPrimary ? 'text-base' : 'text-sm'} text-gray-900`}>{branch.branch_name}</p>
                <p className="text-xs text-gray-500">{branch.city}</p>
                <p className={`font-bold mt-1 ${isPrimary ? 'text-primary-700' : 'text-gray-700'}`}>
                  {formatCurrency(branch[sortKey as keyof BranchEntry] as number)}
                </p>
                <p className="text-xs text-gray-400">{SORT_OPTIONS.find(s => s.key === sortKey)?.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full League Table */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Full Standings
          </h2>
          {generatedAt && (
            <span className="text-xs text-gray-400">
              Updated {new Date(generatedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : league.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No branch data available</p>
            <p className="text-sm mt-1">Transactions will appear as branches process activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {league.map(branch => {
              const volumeBar = topVolume > 0 ? (branch.total_volume / topVolume) * 100 : 0;
              const depositBar = topDeposit > 0 ? (branch.total_deposits / topDeposit) * 100 : 0;
              return (
                <div key={branch.branch_id} className={`px-6 py-4 ${RowHighlight({ rank: branch.rank })}`}>
                  <div className="flex items-center gap-4">
                    <RankBadge rank={branch.rank} />

                    {/* Branch info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{branch.branch_name}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{branch.branch_code}</span>
                        <span className="text-xs text-gray-400">{branch.city}, {branch.region}</span>
                      </div>

                      {/* Volume bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-primary-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${volumeBar}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-16 text-right">{formatCurrency(branch.total_volume)}</span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="hidden md:grid grid-cols-5 gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Customers</p>
                        <div className="flex items-center justify-end gap-1">
                          <Users size={12} className="text-blue-400" />
                          <span className="font-semibold text-gray-800 text-sm">{branch.total_customers}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Transactions</p>
                        <div className="flex items-center justify-end gap-1">
                          <ArrowLeftRight size={12} className="text-purple-400" />
                          <span className="font-semibold text-gray-800 text-sm">{branch.total_transactions.toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Deposits</p>
                        <span className="font-semibold text-emerald-700 text-sm">{formatCurrency(branch.total_deposits)}</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Withdrawals</p>
                        <span className="font-semibold text-red-600 text-sm">{formatCurrency(branch.total_withdrawals)}</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Net Flow</p>
                        <div className="flex items-center justify-end gap-1">
                          {branch.net_flow >= 0
                            ? <TrendingUp size={13} className="text-emerald-500" />
                            : <TrendingDown size={13} className="text-red-500" />}
                          <span className={`font-bold text-sm ${branch.net_flow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {branch.net_flow >= 0 ? '+' : ''}{formatCurrency(branch.net_flow)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="md:hidden mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <p className="text-xs text-emerald-600">Deposits</p>
                      <p className="font-bold text-emerald-800">{formatCurrency(branch.total_deposits)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-xs text-red-600">Withdrawals</p>
                      <p className="font-bold text-red-800">{formatCurrency(branch.total_withdrawals)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-blue-600">Customers</p>
                      <p className="font-bold text-blue-800">{branch.total_customers}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${branch.net_flow >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <p className={`text-xs ${branch.net_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Net Flow</p>
                      <p className={`font-bold ${branch.net_flow >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                        {branch.net_flow >= 0 ? '+' : ''}{formatCurrency(branch.net_flow)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {!isLoading && league.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Volume', value: formatCurrency(league.reduce((s, b) => s + b.total_volume, 0)), color: 'text-primary-700' },
            { label: 'Total Deposits', value: formatCurrency(league.reduce((s, b) => s + b.total_deposits, 0)), color: 'text-emerald-700' },
            { label: 'Total Withdrawals', value: formatCurrency(league.reduce((s, b) => s + b.total_withdrawals, 0)), color: 'text-red-600' },
            { label: 'Total Customers', value: league.reduce((s, b) => s + b.total_customers, 0).toLocaleString(), color: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className="card text-center py-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
