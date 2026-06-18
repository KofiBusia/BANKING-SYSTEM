import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { transactionsAPI } from '../../services/api';
import { formatCurrency, formatDateTime, getTransactionColor, getTransactionSign, getTransactionTypeLabel } from '../../utils/helpers';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [filterType, setFilterType] = useState('');

  useEffect(() => { load(); }, [page, filterType]);

  async function load() {
    setIsLoading(true);
    try {
      const res = await transactionsAPI.getAll({ page, per_page: 20, type: filterType || undefined });
      setTransactions(res.data.transactions || []);
      setPagination(res.data.pagination);
    } catch {}
    finally { setIsLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">All Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor all banking transactions</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {['', 'deposit', 'withdrawal', 'transfer_out', 'loan_disbursement', 'mobile_money_in'].map(type => (
          <button
            key={type}
            onClick={() => { setFilterType(type); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterType === type ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            {type ? getTransactionTypeLabel(type) : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-900 border-t-transparent rounded-full animate-spin" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No transactions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Reference', 'Type', 'Amount', 'Account', 'Balance After', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(txn => {
                const isCredit = getTransactionSign(txn.transaction_type) === '+';
                return (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{txn.reference}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          {isCredit ? <ArrowDownLeft size={12} className="text-emerald-600" /> : <ArrowUpRight size={12} className="text-red-500" />}
                        </div>
                        <span className="text-gray-700">{getTransactionTypeLabel(txn.transaction_type)}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${getTransactionColor(txn.transaction_type)}`}>
                      {getTransactionSign(txn.transaction_type)}{formatCurrency(txn.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{txn.account_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(txn.balance_after)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(txn.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.has_prev} className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40">Previous</button>
          <span className="flex items-center text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!pagination.has_next} className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
