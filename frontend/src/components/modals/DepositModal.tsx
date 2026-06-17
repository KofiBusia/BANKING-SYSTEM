import { useState } from 'react';
import { X, ArrowDownLeft } from 'lucide-react';
import { transactionsAPI } from '../../services/api';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface Props {
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function DepositModal({ accounts, onClose, onSuccess }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (!accountId) { toast.error('Select an account'); return; }
    setIsLoading(true);
    try {
      await transactionsAPI.deposit({ account_id: accountId, amount: amt, description: description || 'Cash Deposit' });
      toast.success(`GHS ${amt.toLocaleString()} deposited successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deposit failed');
    } finally {
      setIsLoading(false);
    }
  };

  const activeAccounts = accounts.filter(a => a.status === 'active');
  const selectedAccount = accounts.find(a => a.id === accountId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ArrowDownLeft size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Make a Deposit</h2>
              <p className="text-xs text-gray-500">Add funds to your account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input-field">
              {activeAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_type.replace('_', ' ').toUpperCase()} - {a.account_number} (Bal: {formatCurrency(a.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (GHS)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-field text-xl font-bold"
              required
            />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {quickAmounts.map(a => (
                <button key={a} type="button" onClick={() => setAmount(String(a))} className={`py-1.5 px-2 rounded-lg text-sm font-medium transition-colors ${amount === String(a) ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {formatCurrency(a)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="e.g. Monthly savings" />
          </div>

          {selectedAccount && amount && parseFloat(amount) > 0 && (
            <div className="bg-emerald-50 rounded-xl p-3 text-sm">
              <p className="text-emerald-800 font-medium">Deposit Summary</p>
              <div className="flex justify-between mt-1">
                <span className="text-emerald-700">To Account:</span>
                <span className="text-emerald-900 font-semibold">{selectedAccount.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">Amount:</span>
                <span className="text-emerald-900 font-bold">{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">New Balance:</span>
                <span className="text-emerald-900 font-semibold">{formatCurrency(selectedAccount.balance + (parseFloat(amount) || 0))}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-success flex-1">
              {isLoading ? 'Processing...' : 'Deposit Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
