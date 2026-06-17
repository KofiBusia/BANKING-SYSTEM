import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, Filter, Search, Download, Plus, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { transactionsAPI } from '../../services/api';
import type { Transaction, Account } from '../../types';
import { formatCurrency, formatDateTime, getTransactionColor, getTransactionSign, getTransactionTypeLabel } from '../../utils/helpers';
import DepositModal from '../../components/modals/DepositModal';
import WithdrawModal from '../../components/modals/WithdrawModal';
import MobileMoneyModal from '../../components/modals/MobileMoneyModal';
import toast from 'react-hot-toast';

export default function Transactions() {
  const { accounts, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showMobileMoney, setShowMobileMoney] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter, dateFilter]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (typeFilter) params.type = typeFilter;
      if (dateFilter) {
        const now = new Date();
        if (dateFilter === 'today') params.start_date = new Date().toISOString().split('T')[0];
        else if (dateFilter === 'week') {
          const d = new Date(now); d.setDate(d.getDate() - 7);
          params.start_date = d.toISOString().split('T')[0];
        } else if (dateFilter === 'month') {
          params.start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        }
      }
      const res = await transactionsAPI.getAll(params);
      setTransactions(res.data.transactions || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = search
    ? transactions.filter(t =>
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.reference.toLowerCase().includes(search.toLowerCase()) ||
        getTransactionTypeLabel(t.transaction_type).toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  const onSuccess = () => {
    fetchTransactions();
    refreshUser();
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your deposits, withdrawals and transfers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowDeposit(true)} className="btn-success flex items-center gap-2 py-2 px-4 text-sm">
            <ArrowDownLeft size={16} /> Deposit
          </button>
          <button onClick={() => setShowWithdraw(true)} className="btn-danger flex items-center gap-2 py-2 px-4 text-sm">
            <ArrowUpRight size={16} /> Withdraw
          </button>
          <button onClick={() => setShowMobileMoney(true)} className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
            <Smartphone size={16} /> Mobile Money
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="input-field pl-9 py-2.5 text-sm"
          />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input-field py-2.5 text-sm w-full sm:w-44">
          <option value="">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="transfer_out">Transfers Out</option>
          <option value="transfer_in">Transfers In</option>
          <option value="loan_disbursement">Loan Disbursements</option>
          <option value="loan_repayment">Loan Repayments</option>
          <option value="mobile_money_in">Mobile Money In</option>
          <option value="mobile_money_out">Mobile Money Out</option>
        </select>
        <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} className="input-field py-2.5 text-sm w-full sm:w-36">
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Transactions list */}
      <div className="card">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Filter size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No transactions found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div>
            {filtered.map((txn, idx) => (
              <div key={txn.id} className={`flex items-center gap-4 py-3.5 ${idx < filtered.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTransactionSign(txn.transaction_type) === '+' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {getTransactionSign(txn.transaction_type) === '+' ? <ArrowDownLeft size={18} className="text-emerald-600" /> : <ArrowUpRight size={18} className="text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{getTransactionTypeLabel(txn.transaction_type)}</p>
                  <p className="text-xs text-gray-400 truncate">{txn.description || txn.reference} · {txn.channel}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${getTransactionColor(txn.transaction_type)}`}>
                    {getTransactionSign(txn.transaction_type)}{formatCurrency(txn.amount)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateTime(txn.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full hidden sm:inline-flex ${txn.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : txn.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {txn.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {showDeposit && <DepositModal accounts={accounts} onClose={() => setShowDeposit(false)} onSuccess={onSuccess} />}
      {showWithdraw && <WithdrawModal accounts={accounts} onClose={() => setShowWithdraw(false)} onSuccess={onSuccess} />}
      {showMobileMoney && <MobileMoneyModal accounts={accounts} onClose={() => setShowMobileMoney(false)} onSuccess={onSuccess} />}
    </div>
  );
}
