import { useState, useEffect } from 'react';
import { Users, CreditCard, Banknote, TrendingUp, AlertCircle, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { adminAPI } from '../../services/api';
import { formatCurrency, formatDateTime, getTransactionTypeLabel, getTransactionColor } from '../../utils/helpers';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(r => { setData(r.data); }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const stats = data?.stats || {};
  const statCards = [
    { label: 'Total Customers', value: stats.total_customers?.toLocaleString() || '0', sub: `+${stats.new_customers_month || 0} this month`, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Deposits Balance', value: formatCurrency(stats.total_balance || 0), sub: `${stats.active_accounts || 0} active accounts`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Today\'s Deposits', value: formatCurrency(stats.total_deposits_today || 0), sub: `${stats.total_transactions_today || 0} transactions`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'Loan Portfolio', value: formatCurrency(stats.total_loan_portfolio || 0), sub: `${stats.active_loans || 0} active loans`, icon: Banknote, color: 'bg-amber-50 text-amber-600' },
    { label: 'Pending KYC', value: stats.kyc_pending || 0, sub: 'Awaiting review', icon: AlertCircle, color: 'bg-red-50 text-red-500' },
    { label: 'Pending Loans', value: stats.pending_loans || 0, sub: `${stats.total_loans || 0} total applications`, icon: Clock, color: 'bg-orange-50 text-orange-500' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Crestline Operations Overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      {data?.monthly_trend && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Transaction Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₵${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
                <Legend />
                <Bar dataKey="deposits" name="Deposits" fill="#2563eb" radius={[4,4,0,0]} />
                <Bar dataKey="withdrawals" name="Withdrawals" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {(data?.recent_transactions || []).slice(0, 8).map((txn: any) => (
              <div key={txn.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{getTransactionTypeLabel(txn.transaction_type)}</p>
                  <p className="text-xs text-gray-400 truncate">{txn.reference}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${getTransactionColor(txn.transaction_type)}`}>{formatCurrency(txn.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(txn.created_at).split(',')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Customers */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">New Customers</h3>
          <div className="space-y-3">
            {(data?.recent_customers || []).slice(0, 6).map((customer: any) => (
              <div key={customer.id} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {customer.first_name?.[0]}{customer.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{customer.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                </div>
                <span className={customer.kyc_status === 'verified' ? 'badge-success' : customer.kyc_status === 'pending' ? 'badge-info' : 'badge-warning'}>
                  {customer.kyc_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
