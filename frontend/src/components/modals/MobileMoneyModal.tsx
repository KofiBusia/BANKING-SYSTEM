import { useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import { transactionsAPI } from '../../services/api';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface Props { accounts: Account[]; onClose: () => void; onSuccess: () => void; }

const NETWORKS = [
  { id: 'MTN', label: 'MTN MoMo', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { id: 'VODAFONE', label: 'Telecel Cash', color: 'bg-red-50 border-red-200 text-red-800' },
  { id: 'AIRTELTIGO', label: 'AT Money', color: 'bg-blue-50 border-blue-200 text-blue-800' },
];

export default function MobileMoneyModal({ accounts, onClose, onSuccess }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [narration, setNarration] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !phone) { toast.error('Fill in all required fields'); return; }
    setIsLoading(true);
    try {
      await transactionsAPI.mobileMoney({ account_id: accountId, phone, amount: amt, network, direction, narration: narration || `Mobile Money ${direction === 'in' ? 'In' : 'Out'}` });
      toast.success(`Mobile money ${direction === 'in' ? 'received' : 'sent'} successfully!`);
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <Smartphone size={18} className="text-orange-600" />
            </div>
            <div><h2 className="font-bold text-gray-900">Mobile Money</h2><p className="text-xs text-gray-500">MTN, Telecel, AirtelTigo</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Direction */}
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 'in', l: 'Receive (In)' }, { v: 'out', l: 'Send (Out)' }].map(d => (
              <button key={d.v} type="button" onClick={() => setDirection(d.v as 'in' | 'out')} className={`py-2 rounded-lg text-sm font-medium border transition-colors ${direction === d.v ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>{d.l}</button>
            ))}
          </div>
          {/* Network */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Network</label>
            <div className="grid grid-cols-3 gap-2">
              {NETWORKS.map(n => (
                <button key={n.id} type="button" onClick={() => setNetwork(n.id)} className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${network === n.id ? n.color + ' ring-2 ring-offset-1 ring-primary-500' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{n.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{direction === 'in' ? 'Your' : 'Recipient'} Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input-field">
              {accounts.filter(a => a.status === 'active').map(a => (
                <option key={a.id} value={a.id}>{a.account_number} — {formatCurrency(a.balance)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{direction === 'in' ? 'Your' : 'Recipient'} Mobile Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="0241234567" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (GHS)</label>
            <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="input-field text-xl font-bold" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Narration (Optional)</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} className="input-field" placeholder="Purpose of transaction" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">{isLoading ? 'Processing...' : `${direction === 'in' ? 'Receive' : 'Send'} Money`}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
