import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, ChevronRight, X } from 'lucide-react';
import { accountsAPI } from '../../services/api';
import { formatCurrency, formatDateTime, getTransactionColor, getTransactionSign, getTransactionTypeLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account', desc: '3.5% interest p.a. No minimum balance.', kyc: 'basic' },
  { value: 'current', label: 'Current Account', desc: 'No interest. For everyday transactions.', kyc: 'basic' },
  { value: 'susu', label: 'Susu Account', desc: '2.0% interest. Traditional savings scheme.', kyc: 'basic' },
  { value: 'student', label: 'Student Account', desc: '2.5% interest. For students only.', kyc: 'basic' },
  { value: 'fixed_deposit', label: 'Fixed Deposit', desc: '8.5% interest p.a. KYC verified only.', kyc: 'verified' },
  { value: 'business', label: 'Business Account', desc: 'For businesses. KYC verified only.', kyc: 'verified' },
];

const TYPE_COLORS: Record<string, string> = {
  savings: 'bg-blue-100 text-blue-700',
  current: 'bg-purple-100 text-purple-700',
  fixed_deposit: 'bg-amber-100 text-amber-700',
  susu: 'bg-green-100 text-green-700',
  student: 'bg-pink-100 text-pink-700',
  business: 'bg-gray-100 text-gray-700',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [statement, setStatement] = useState<any[]>([]);
  const [hideBalances, setHideBalances] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [selectedType, setSelectedType] = useState('savings');
  const [isOpening, setIsOpening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    setIsLoading(true);
    try {
      const res = await accountsAPI.getAll();
      setAccounts(res.data.accounts || []);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStatement(accountId: string) {
    setIsLoadingStatement(true);
    try {
      const res = await accountsAPI.getStatement(accountId, { per_page: 10 });
      setStatement(res.data.transactions || []);
    } catch {
      setStatement([]);
    } finally {
      setIsLoadingStatement(false);
    }
  }

  function selectAccount(account: any) {
    setSelectedAccount(account);
    loadStatement(account.id);
  }

  async function openAccount() {
    setIsOpening(true);
    try {
      const res = await accountsAPI.open({ account_type: selectedType });
      toast.success(res.data.message);
      setShowOpenModal(false);
      loadAccounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to open account');
    } finally {
      setIsOpening(false);
    }
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">My Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all your bank accounts</p>
        </div>
        <button onClick={() => setShowOpenModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Open Account
        </button>
      </div>

      {/* Total balance */}
      <div className="bank-card p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-200 text-sm">Total Balance Across All Accounts</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-bold">{hideBalances ? '••••••' : formatCurrency(totalBalance)}</h2>
              <button onClick={() => setHideBalances(!hideBalances)} className="text-blue-300 hover:text-white">
                {hideBalances ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-sm">{accounts.length} Account{accounts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts list */}
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <div className="card p-10 text-center">
              <CreditCard size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No accounts yet</p>
              <button onClick={() => setShowOpenModal(true)} className="btn-primary mt-4">Open Your First Account</button>
            </div>
          ) : (
            accounts.map(account => (
              <button
                key={account.id}
                onClick={() => selectAccount(account)}
                className={`w-full text-left card p-5 transition-all ${selectedAccount?.id === account.id ? 'ring-2 ring-primary-900' : 'hover:shadow-md'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${TYPE_COLORS[account.account_type] || 'bg-gray-100 text-gray-700'}`}>
                      {account.account_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </div>
                    <span className={`text-xs font-medium ${account.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                      {account.status}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-400 font-mono">{account.account_number}</p>
                  <p className="text-xl font-bold text-primary-900 mt-0.5">
                    {hideBalances ? '••••••' : formatCurrency(account.balance)}
                  </p>
                  {account.interest_rate > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">{account.interest_rate}% p.a.</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Account detail / statement */}
        <div>
          {selectedAccount ? (
            <div className="card p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedAccount.account_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedAccount.account_number}</p>
                </div>
                <button onClick={() => setSelectedAccount(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Balance</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">{formatCurrency(selectedAccount.balance)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Available</p>
                  <p className="font-bold text-green-600 text-sm mt-0.5">{formatCurrency(selectedAccount.available_balance)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Currency</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">{selectedAccount.currency}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Link to="/dashboard/transactions" className="btn-primary flex-1 text-center text-sm py-2">Deposit</Link>
                <Link to="/dashboard/transfer" className="btn-secondary flex-1 text-center text-sm py-2">Transfer</Link>
              </div>

              <h4 className="font-medium text-gray-700 text-sm mb-3">Recent Transactions</h4>
              {isLoadingStatement ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              ) : statement.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No transactions yet</p>
              ) : (
                <div className="space-y-1">
                  {statement.map(txn => (
                    <div key={txn.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTransactionColor(txn.transaction_type) === 'text-emerald-600' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {getTransactionSign(txn.transaction_type) === '+' ? <ArrowDownLeft size={14} className="text-emerald-600" /> : <ArrowUpRight size={14} className="text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{getTransactionTypeLabel(txn.transaction_type)}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(txn.created_at)}</p>
                      </div>
                      <p className={`text-sm font-bold ${getTransactionColor(txn.transaction_type)}`}>
                        {getTransactionSign(txn.transaction_type)}{formatCurrency(txn.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-10 text-center text-gray-400">
              <CreditCard size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Select an account to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Open account modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary-900">Open New Account</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3 mb-5">
              {ACCOUNT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedType === type.value ? 'border-primary-900 bg-primary-900/5' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-gray-800 text-sm">{type.label}</p>
                    {type.kyc === 'verified' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">KYC Required</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowOpenModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={openAccount} disabled={isOpening} className="btn-primary flex-1">
                {isOpening ? 'Opening...' : 'Open Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
