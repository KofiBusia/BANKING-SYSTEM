import { useState } from 'react';
import { ArrowLeftRight, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../../services/api';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function Transfer() {
  const { accounts, refreshUser } = useAuth();
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [pin, setPin] = useState('');
  const [lookupResult, setLookupResult] = useState<{ account_name: string; account_number: string; account_type: string } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{ reference: string; amount: number; name: string } | null>(null);

  const fromAccount = accounts.find(a => a.id === fromAccountId);

  const lookupAccount = async () => {
    if (!toAccountNumber.trim()) return;
    setIsLooking(true);
    setLookupResult(null);
    setLookupError('');
    try {
      const res = await accountsAPI.lookup(toAccountNumber.trim());
      setLookupResult(res.data.account);
    } catch {
      setLookupError('Account not found or inactive');
    } finally {
      setIsLooking(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (!lookupResult) { toast.error('Verify the destination account first'); return; }
    if (fromAccount && amt > fromAccount.available_balance) { toast.error('Insufficient funds'); return; }

    setIsLoading(true);
    try {
      const res = await transactionsAPI.transfer({
        from_account_id: fromAccountId,
        to_account_number: toAccountNumber,
        amount: amt,
        narration: narration || 'Funds Transfer',
        pin,
      });
      setSuccess({ reference: res.data.reference, amount: amt, name: lookupResult.account_name });
      refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto page-enter">
        <div className="card text-center py-10">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Transfer Successful!</h2>
          <p className="text-gray-500 mt-2">Your funds have been sent</p>
          <div className="bg-gray-50 rounded-xl p-4 mt-6 text-left space-y-2">
            <div className="flex justify-between"><span className="text-gray-500 text-sm">Recipient</span><span className="font-semibold text-sm">{success.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 text-sm">Amount</span><span className="font-bold text-emerald-600">{formatCurrency(success.amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 text-sm">Reference</span><span className="font-mono text-xs text-gray-600">{success.reference}</span></div>
          </div>
          <button onClick={() => { setSuccess(null); setToAccountNumber(''); setAmount(''); setNarration(''); setLookupResult(null); }} className="btn-primary w-full mt-6">Make Another Transfer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transfer Money</h1>
        <p className="text-gray-500 text-sm mt-0.5">Send funds to any GhanaBank account instantly</p>
      </div>

      <form onSubmit={handleTransfer} className="space-y-5">
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">From</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source Account</label>
            <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="input-field">
              {accounts.filter(a => a.status === 'active').map(a => (
                <option key={a.id} value={a.id}>{a.account_number} — {a.account_type.replace('_',' ').toUpperCase()} — {formatCurrency(a.balance)}</option>
              ))}
            </select>
            {fromAccount && (
              <p className="text-xs text-gray-500 mt-1">Available balance: <strong>{formatCurrency(fromAccount.available_balance)}</strong></p>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">To</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Account Number</label>
            <div className="flex gap-2">
              <input
                value={toAccountNumber}
                onChange={e => { setToAccountNumber(e.target.value); setLookupResult(null); setLookupError(''); }}
                onBlur={lookupAccount}
                placeholder="Enter 10-digit account number"
                className="input-field flex-1"
              />
              <button type="button" onClick={lookupAccount} disabled={isLooking} className="btn-secondary px-4">
                {isLooking ? '...' : <Search size={16} />}
              </button>
            </div>
            {lookupResult && (
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">{lookupResult.account_name}</p>
                  <p className="text-xs text-emerald-600">{lookupResult.account_type.replace('_',' ').toUpperCase()} · {lookupResult.account_number}</p>
                </div>
              </div>
            )}
            {lookupError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{lookupError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">Transfer Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (GHS)</label>
            <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="input-field text-2xl font-bold" required />
            <div className="flex gap-2 mt-2">
              {[50, 100, 200, 500].map(a => (
                <button key={a} type="button" onClick={() => setAmount(String(a))} className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                  {formatCurrency(a)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} className="input-field" placeholder="e.g. Rent payment, school fees..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction PIN (if set)</label>
            <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} className="input-field" placeholder="4-digit PIN" />
          </div>

          {lookupResult && amount && parseFloat(amount) > 0 && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-2">
              <p className="text-sm font-semibold text-blue-800">Transfer Summary</p>
              <div className="flex justify-between text-sm"><span className="text-blue-600">To:</span><span className="font-semibold text-blue-900">{lookupResult.account_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-blue-600">Amount:</span><span className="font-bold text-blue-900">{formatCurrency(parseFloat(amount) || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-blue-600">Fee:</span><span className="font-semibold text-blue-900">Free</span></div>
            </div>
          )}
        </div>

        <button type="submit" disabled={isLoading || !lookupResult} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2">
          {isLoading ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processing...</>
          ) : (
            <><ArrowLeftRight size={18} /> Transfer Money</>
          )}
        </button>
      </form>
    </div>
  );
}
