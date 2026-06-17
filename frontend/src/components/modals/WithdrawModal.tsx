import { useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { transactionsAPI } from '../../services/api';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface Props { accounts: Account[]; onClose: () => void; onSuccess: () => void; }

export default function WithdrawModal({ accounts, onClose, onSuccess }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const selectedAccount = accounts.find(a => a.id === accountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (selectedAccount && amt > selectedAccount.available_balance) { toast.error('Insufficient funds'); return; }
    setIsLoading(true);
    try {
      await transactionsAPI.withdraw({ account_id: accountId, amount: amt, description: description || 'Cash Withdrawal', pin });
      toast.success('Withdrawal successful!');
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <ArrowUpRight size={18} className="text-red-600" />
            </div>
            <div><h2 className="font-bold text-gray-900">Withdraw Funds</h2><p className="text-xs text-gray-500">Withdraw from your account</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">From Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input-field">
              {accounts.filter(a => a.status === 'active').map(a => (
                <option key={a.id} value={a.id}>{a.account_number} — {formatCurrency(a.available_balance)} available</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (GHS)</label>
            <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="input-field text-xl font-bold" required />
            {selectedAccount && <p className="text-xs text-gray-500 mt-1">Available: {formatCurrency(selectedAccount.available_balance)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="Reason for withdrawal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction PIN (if set)</label>
            <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} className="input-field" placeholder="4-digit PIN" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-danger flex-1">{isLoading ? 'Processing...' : 'Withdraw'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
