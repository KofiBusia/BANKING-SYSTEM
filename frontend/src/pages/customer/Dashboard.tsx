import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Banknote, Eye, EyeOff, TrendingUp, Shield, AlertCircle, ChevronRight, Plus, Smartphone } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { transactionsAPI, loansAPI, treasuryBillsAPI } from '../../services/api';
import type { Transaction } from '../../types';
import { formatCurrency, formatDateTime, getTransactionColor, getTransactionSign, getTransactionTypeLabel, maskAccountNumber } from '../../utils/helpers';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const quickActions = [
  { label: 'Deposit', icon: ArrowDownLeft, href: '/dashboard/transactions', color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Transfer', icon: ArrowLeftRight, href: '/dashboard/transfer', color: 'bg-blue-50 text-blue-700' },
  { label: 'Loans', icon: Banknote, href: '/dashboard/loans', color: 'bg-purple-50 text-purple-700' },
  { label: 'T-Bills', icon: TrendingUp, href: '/dashboard/treasury-bills', color: 'bg-amber-50 text-amber-700' },
];

export default function Dashboard() {
  const { user, accounts, refreshUser } = useAuth();
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<{month: string; deposits: number; withdrawals: number}[]>([]);
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [isLoadingTxns, setIsLoadingTxns] = useState(true);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [activeTbills, setActiveTbills] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentTransactions();
    fetchLoansAndTbills();
  }, []);

  const fetchRecentTransactions = async () => {
    try {
      const res = await transactionsAPI.getAll({ per_page: 200 });
      const txns: Transaction[] = res.data.transactions || [];
      setRecentTxns(txns.slice(0, 5));
      buildChartData(txns);
    } catch {
    } finally {
      setIsLoadingTxns(false);
    }
  };

  const buildChartData = (txns: Transaction[]) => {
    const now = new Date();
    const months: {month: string; deposits: number; withdrawals: number}[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: MONTHS[d.getMonth()], deposits: 0, withdrawals: 0 });
    }
    txns.forEach(t => {
      const d = new Date(t.created_at);
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo < 0 || monthsAgo > 5) return;
      const idx = 5 - monthsAgo;
      const credit = ['deposit','transfer_in','loan_disbursement','interest_credit','mobile_money_in','treasury_bill_maturity'].includes(t.transaction_type);
      if (credit) months[idx].deposits += t.amount;
      else months[idx].withdrawals += t.amount;
    });
    setChartData(months);
  };

  const fetchLoansAndTbills = async () => {
    try {
      const [loansRes, tbillsRes] = await Promise.all([
        loansAPI.getAll({ status: 'active' }),
        treasuryBillsAPI.getAll({ status: 'active' }),
      ]);
      setActiveLoans(loansRes.data.loans || []);
      setActiveTbills(tbillsRes.data.treasury_bills || []);
    } catch {}
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const currentAccount = accounts[selectedAccount];

  return (
    <div className="space-y-6 page-enter">
      {/* KYC Alert */}
      {user?.kyc_status !== 'verified' && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${
          user?.kyc_status === 'rejected'
            ? 'bg-red-50 border-red-200'
            : user?.kyc_status === 'pending'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <AlertCircle size={20} className={user?.kyc_status === 'rejected' ? 'text-red-500' : user?.kyc_status === 'pending' ? 'text-blue-500' : 'text-amber-500'} />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${user?.kyc_status === 'rejected' ? 'text-red-800' : user?.kyc_status === 'pending' ? 'text-blue-800' : 'text-amber-800'}`}>
              {user?.kyc_status === 'pending' ? 'KYC Under Review' : user?.kyc_status === 'rejected' ? 'KYC Rejected - Action Required' : 'Complete Your KYC Verification'}
            </p>
            <p className={`text-xs mt-0.5 ${user?.kyc_status === 'rejected' ? 'text-red-600' : user?.kyc_status === 'pending' ? 'text-blue-600' : 'text-amber-600'}`}>
              {user?.kyc_status === 'pending'
                ? 'Your documents are being reviewed. We\'ll notify you within 1-3 business days.'
                : user?.kyc_status === 'rejected'
                ? 'Your KYC was rejected. Please update your information and resubmit.'
                : `Your account is ${user?.kyc_completion}% complete. Complete KYC to unlock loans, higher limits & all features.`}
            </p>
          </div>
          {user?.kyc_status !== 'pending' && (
            <Link to="/dashboard/kyc" className="text-xs font-semibold text-primary-700 hover:text-primary-800 whitespace-nowrap flex items-center gap-1">
              Complete Now <ChevronRight size={12} />
            </Link>
          )}
        </div>
      )}

      {/* Balance Card */}
      <div className="bank-card p-6 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-200 text-sm">Total Balance</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-bold">
                {hideBalance ? '••••••' : formatCurrency(totalBalance)}
              </h2>
              <button onClick={() => setHideBalance(!hideBalance)} className="text-blue-300 hover:text-white">
                {hideBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <div className={`w-2 h-2 rounded-full ${user?.kyc_status === 'verified' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs font-medium capitalize">{user?.kyc_status === 'verified' ? 'Verified' : 'Basic KYC'}</span>
            </div>
          </div>
        </div>

        {accounts.length > 0 && currentAccount && (
          <div>
            <p className="text-blue-200 text-xs mb-1">Account Number</p>
            <p className="text-lg font-mono font-semibold tracking-wider">
              {hideBalance ? '•••• •••• ••••' : currentAccount.account_number.replace(/(\d{4})/g, '$1 ').trim()}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <div>
            <p className="text-blue-200 text-xs">{currentAccount?.account_type?.replace('_', ' ').toUpperCase() || 'SAVINGS'}</p>
            <p className="font-semibold">{user?.full_name}</p>
          </div>
          {accounts.length > 1 && (
            <div className="flex gap-1">
              {accounts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAccount(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === selectedAccount ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Quick Actions</h3>
          <Link to="/dashboard/accounts" className="text-sm text-primary-700 hover:text-primary-800 flex items-center gap-1">
            <Plus size={14} /> New Account
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.href} className="card-hover flex flex-col items-center p-4 text-center group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${action.color} group-hover:scale-110 transition-transform`}>
                  <Icon size={22} />
                </div>
                <span className="text-xs font-medium text-gray-700">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Loans & T-Bills Summary */}
      {(activeLoans.length > 0 || activeTbills.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeLoans.length > 0 && (
            <Link to="/dashboard/loans" className="card-hover p-5 border-l-4 border-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Loans</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{activeLoans.length} Loan{activeLoans.length > 1 ? 's' : ''}</p>
                  <p className="text-sm text-purple-700 mt-1">
                    Outstanding: {formatCurrency(activeLoans.reduce((s, l) => s + (l.outstanding_balance || 0), 0))}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Banknote size={20} className="text-purple-600" />
                </div>
              </div>
              {activeLoans[0]?.next_payment_date && (
                <p className="text-xs text-gray-400 mt-2">
                  Next payment: {new Date(activeLoans[0].next_payment_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                  {' — '}{formatCurrency(activeLoans[0].monthly_installment || 0)}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-purple-600 font-medium">
                View details <ChevronRight size={12} />
              </div>
            </Link>
          )}

          {activeTbills.length > 0 && (
            <Link to="/dashboard/treasury-bills" className="card-hover p-5 border-l-4 border-amber-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Treasury Bills</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{activeTbills.length} Investment{activeTbills.length > 1 ? 's' : ''}</p>
                  <p className="text-sm text-amber-700 mt-1">
                    At maturity: {formatCurrency(activeTbills.reduce((s, t) => s + (t.maturity_value || 0), 0))}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-amber-600" />
                </div>
              </div>
              {activeTbills[0]?.maturity_date && (
                <p className="text-xs text-gray-400 mt-2">
                  Next maturity: {new Date(activeTbills[0].maturity_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 font-medium">
                View portfolio <ChevronRight size={12} />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Accounts Overview */}
      {accounts.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">My Accounts</h3>
            <Link to="/dashboard/accounts" className="text-sm text-primary-700 hover:text-primary-800 flex items-center gap-1">View all <ChevronRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.slice(0, 4).map((account) => (
              <Link key={account.id} to={`/dashboard/accounts/${account.id}`} className="card-hover flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={18} className="text-primary-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{account.account_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                  <p className="text-xs text-gray-500">{maskAccountNumber(account.account_number)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{hideBalance ? '••••' : formatCurrency(account.balance)}</p>
                  <span className={`text-xs ${account.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>{account.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Chart — only show when there is real data */}
      {chartData.some(d => d.deposits > 0 || d.withdrawals > 0) && (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Transaction Overview</h3>
          <span className="text-xs text-gray-400 badge-gray">Last 6 months</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₵${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
              <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#2563eb" strokeWidth={2} fill="url(#colorDeposits)" />
              <Area type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#ef4444" strokeWidth={2} fill="url(#colorWithdrawals)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
          <Link to="/dashboard/transactions" className="text-sm text-primary-700 hover:text-primary-800 flex items-center gap-1">View all <ChevronRight size={14} /></Link>
        </div>
        {isLoadingTxns ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : recentTxns.length === 0 ? (
          <div className="text-center py-8">
            <ArrowLeftRight size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No transactions yet</p>
            <Link to="/dashboard/transactions" className="text-primary-700 text-sm font-medium mt-2 inline-block">Make your first deposit</Link>
          </div>
        ) : (
          <div className="space-y-1">
            {recentTxns.map(txn => (
              <div key={txn.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getTransactionColor(txn.transaction_type) === 'text-emerald-600' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {getTransactionSign(txn.transaction_type) === '+' ? <ArrowDownLeft size={16} className="text-emerald-600" /> : <ArrowUpRight size={16} className="text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{getTransactionTypeLabel(txn.transaction_type)}</p>
                  <p className="text-xs text-gray-400 truncate">{txn.description || txn.reference}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${getTransactionColor(txn.transaction_type)}`}>
                    {getTransactionSign(txn.transaction_type)}{formatCurrency(txn.amount)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateTime(txn.created_at).split(',')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
