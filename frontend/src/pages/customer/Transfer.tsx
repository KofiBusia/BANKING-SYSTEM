import { useState } from 'react';
import { ArrowLeftRight, Search, CheckCircle2, AlertCircle, Building2, Smartphone, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../../services/api';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ── Ghana banks ──────────────────────────────────────────────────────────────
const GHANA_BANKS = [
  { code: 'GCB', name: 'GCB Bank' },
  { code: 'ABSA', name: 'Absa Bank Ghana' },
  { code: 'ECOBANK', name: 'Ecobank Ghana' },
  { code: 'FIDELITY', name: 'Fidelity Bank Ghana' },
  { code: 'STANBIC', name: 'Stanbic Bank Ghana' },
  { code: 'ZENITH', name: 'Zenith Bank Ghana' },
  { code: 'CALBANK', name: 'CalBank' },
  { code: 'ACCESS', name: 'Access Bank Ghana' },
  { code: 'UBA', name: 'UBA Ghana' },
  { code: 'FAB', name: 'First Atlantic Bank' },
  { code: 'NIB', name: 'National Investment Bank' },
  { code: 'ADB', name: 'Agricultural Development Bank' },
  { code: 'PRUDENTIAL', name: 'Prudential Bank' },
  { code: 'REPUBLIC', name: 'Republic Bank Ghana' },
  { code: 'CBG', name: 'Consolidated Bank Ghana' },
  { code: 'SOCGEN', name: 'Societe Generale Ghana' },
  { code: 'BOA', name: 'Bank of Africa Ghana' },
  { code: 'FBN', name: 'FBNBank Ghana' },
  { code: 'GTBANK', name: 'Guaranty Trust Bank Ghana' },
  { code: 'SCB', name: 'Standard Chartered Ghana' },
  { code: 'FNB', name: 'First National Bank Ghana' },
  { code: 'OMNI', name: 'OmniBank Ghana' },
  { code: 'ARB', name: 'ARB Apex Bank' },
  { code: 'BANK_OF_GHANA', name: 'Bank of Ghana' },
];

// ── Mobile money networks ─────────────────────────────────────────────────────
const MOMO_NETWORKS = [
  { code: 'MTN', name: 'MTN Mobile Money (MoMo)', color: 'bg-yellow-400', prefixes: '024, 054, 055, 059' },
  { code: 'TELECEL', name: 'Telecel Cash', color: 'bg-red-500', prefixes: '020, 050' },
  { code: 'AIRTELTIGO', name: 'AirtelTigo Money', color: 'bg-blue-500', prefixes: '026, 027, 056, 057' },
];

type TransferMode = 'internal' | 'interbank' | 'momo';

interface SuccessData {
  reference: string;
  amount: number;
  recipient: string;
  mode: TransferMode;
  bank?: string;
  network?: string;
}

export default function Transfer() {
  const { accounts, refreshUser } = useAuth();
  const [mode, setMode] = useState<TransferMode>('internal');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  // Internal transfer state
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<{ account_name: string; account_number: string; account_type: string } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isLooking, setIsLooking] = useState(false);

  // Interbank state
  const [ibBankCode, setIbBankCode] = useState('');
  const [ibAccountNumber, setIbAccountNumber] = useState('');
  const [ibAccountName, setIbAccountName] = useState('');

  // MoMo state
  const [momoNetwork, setMomoNetwork] = useState('');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoName, setMomoName] = useState('');

  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const parsedAmount = parseFloat(amount) || 0;
  const insufficientFunds = fromAccount ? parsedAmount > (fromAccount.available_balance || 0) : false;

  const selectedBank = GHANA_BANKS.find(b => b.code === ibBankCode);
  const selectedNetwork = MOMO_NETWORKS.find(n => n.code === momoNetwork);

  // ── Internal account lookup ────────────────────────────────────────────────
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) { toast.error('Enter a valid amount'); return; }
    if (insufficientFunds) { toast.error('Insufficient funds'); return; }

    setIsLoading(true);
    try {
      if (mode === 'internal') {
        if (!lookupResult) { toast.error('Verify the destination account first'); setIsLoading(false); return; }
        const res = await transactionsAPI.transfer({
          from_account_id: fromAccountId,
          to_account_number: toAccountNumber,
          amount: parsedAmount,
          narration: narration || 'Funds Transfer',
          pin,
        });
        setSuccess({ reference: res.data.reference, amount: parsedAmount, recipient: lookupResult.account_name, mode });

      } else if (mode === 'interbank') {
        if (!ibBankCode || !ibAccountNumber || !ibAccountName) {
          toast.error('Fill in all bank details'); setIsLoading(false); return;
        }
        const res = await transactionsAPI.interbankTransfer({
          from_account_id: fromAccountId,
          bank_code: ibBankCode,
          bank_name: selectedBank?.name,
          to_account_number: ibAccountNumber,
          to_account_name: ibAccountName,
          amount: parsedAmount,
          narration: narration || 'Interbank Transfer',
          pin,
        });
        setSuccess({ reference: res.data.reference, amount: parsedAmount, recipient: ibAccountName, mode, bank: selectedBank?.name });

      } else {
        if (!momoNetwork || !momoPhone) {
          toast.error('Select a network and enter a phone number'); setIsLoading(false); return;
        }
        const res = await transactionsAPI.mobileMoneyOut({
          from_account_id: fromAccountId,
          network: momoNetwork,
          phone: momoPhone,
          recipient_name: momoName,
          amount: parsedAmount,
          narration: narration || 'Mobile Money Transfer',
          pin,
        });
        setSuccess({ reference: res.data.reference, amount: parsedAmount, recipient: momoName || momoPhone, mode, network: selectedNetwork?.name });
      }

      refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setSuccess(null);
    setAmount(''); setNarration(''); setPin('');
    setToAccountNumber(''); setLookupResult(null); setLookupError('');
    setIbBankCode(''); setIbAccountNumber(''); setIbAccountName('');
    setMomoNetwork(''); setMomoPhone(''); setMomoName('');
  };

  const switchMode = (m: TransferMode) => { setMode(m); reset(); };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    const modeLabels: Record<TransferMode, string> = { internal: 'Crestline Transfer', interbank: 'Interbank Transfer', momo: 'Mobile Money' };
    return (
      <div className="max-w-md mx-auto page-enter">
        <div className="card text-center py-10">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Transfer Successful!</h2>
          <p className="text-gray-500 mt-1">{modeLabels[success.mode]}</p>
          <div className="bg-gray-50 rounded-xl p-4 mt-6 text-left space-y-3">
            <div className="flex justify-between"><span className="text-gray-500 text-sm">Recipient</span><span className="font-semibold text-sm text-right">{success.recipient}</span></div>
            {success.bank && <div className="flex justify-between"><span className="text-gray-500 text-sm">Bank</span><span className="font-semibold text-sm">{success.bank}</span></div>}
            {success.network && <div className="flex justify-between"><span className="text-gray-500 text-sm">Network</span><span className="font-semibold text-sm">{success.network}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500 text-sm">Amount</span><span className="font-bold text-emerald-600 text-lg">{formatCurrency(success.amount)}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Reference</span><span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{success.reference}</span></div>
          </div>
          <button onClick={reset} className="btn-primary w-full mt-6">Make Another Transfer</button>
        </div>
      </div>
    );
  }

  const canSubmit = mode === 'internal' ? !!lookupResult
    : mode === 'interbank' ? !!ibBankCode && !!ibAccountNumber && !!ibAccountName
    : !!momoNetwork && !!momoPhone;

  return (
    <div className="max-w-lg mx-auto space-y-5 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transfer Money</h1>
        <p className="text-gray-500 text-sm mt-0.5">Send to Crestline accounts, other banks, or mobile wallets</p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: 'internal', icon: Users, label: 'Crestline', sub: 'Instant · Free' },
          { id: 'interbank', icon: Building2, label: 'Other Banks', sub: 'Via GhIPSS' },
          { id: 'momo', icon: Smartphone, label: 'Mobile Money', sub: 'MTN · Telecel · AirtelTigo' },
        ] as const).map(tab => {
          const Icon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchMode(tab.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${active ? 'border-primary-800 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-200'}`}
            >
              <Icon size={18} className={active ? 'text-primary-800 mb-1' : 'text-gray-400 mb-1'} />
              <p className={`text-xs font-bold leading-tight ${active ? 'text-primary-900' : 'text-gray-700'}`}>{tab.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{tab.sub}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source account */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">From</h3>
          <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="input-field">
            {accounts.filter(a => a.status === 'active').map(a => (
              <option key={a.id} value={a.id}>
                {a.account_number} — {a.account_type.replace(/_/g, ' ').toUpperCase()} — {formatCurrency(a.balance)}
              </option>
            ))}
          </select>
          {fromAccount && (
            <p className="text-xs text-gray-500">Available: <strong>{formatCurrency(fromAccount.available_balance)}</strong></p>
          )}
        </div>

        {/* Destination — varies by mode */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">To</h3>

          {mode === 'internal' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Crestline Account Number</label>
              <div className="flex gap-2">
                <input
                  value={toAccountNumber}
                  onChange={e => { setToAccountNumber(e.target.value); setLookupResult(null); setLookupError(''); }}
                  onBlur={lookupAccount}
                  placeholder="Enter account number"
                  className="input-field flex-1"
                />
                <button type="button" onClick={lookupAccount} disabled={isLooking} className="btn-secondary px-4 text-sm">
                  {isLooking ? '...' : <Search size={15} />}
                </button>
              </div>
              {lookupResult && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">{lookupResult.account_name}</p>
                    <p className="text-xs text-emerald-600">{lookupResult.account_type.replace(/_/g,' ').toUpperCase()} · {lookupResult.account_number}</p>
                  </div>
                </div>
              )}
              {lookupError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{lookupError}</p>
                </div>
              )}
            </div>
          )}

          {mode === 'interbank' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Destination Bank</label>
                <select value={ibBankCode} onChange={e => setIbBankCode(e.target.value)} className="input-field">
                  <option value="">Select a bank</option>
                  {GHANA_BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Account Number</label>
                <input
                  value={ibAccountNumber}
                  onChange={e => setIbAccountNumber(e.target.value)}
                  placeholder="Recipient's account number"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Account Name</label>
                <input
                  value={ibAccountName}
                  onChange={e => setIbAccountName(e.target.value)}
                  placeholder="Full name on the account"
                  className="input-field"
                />
                <p className="text-xs text-amber-600 mt-1">Please confirm the name matches the account holder at the destination bank.</p>
              </div>
            </div>
          )}

          {mode === 'momo' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Mobile Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {MOMO_NETWORKS.map(n => (
                    <button
                      key={n.code}
                      type="button"
                      onClick={() => setMomoNetwork(n.code)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${momoNetwork === n.code ? 'border-primary-800 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className={`w-6 h-6 ${n.color} rounded-full mx-auto mb-1.5`} />
                      <p className="text-xs font-bold text-gray-800 leading-tight">
                        {n.code === 'MTN' ? 'MTN' : n.code === 'TELECEL' ? 'Telecel' : 'AirtelTigo'}
                      </p>
                      <p className="text-xs text-gray-400">{n.prefixes}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number (wallet number)</label>
                <input
                  value={momoPhone}
                  onChange={e => setMomoPhone(e.target.value)}
                  placeholder="e.g. 0241234567"
                  className="input-field"
                  type="tel"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Recipient Name <span className="text-gray-400">(optional)</span></label>
                <input
                  value={momoName}
                  onChange={e => setMomoName(e.target.value)}
                  placeholder="e.g. John Mensah"
                  className="input-field"
                />
              </div>
            </div>
          )}
        </div>

        {/* Amount + details */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">Details</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (GHS)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">GHS</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className={`input-field pl-12 text-xl font-bold ${insufficientFunds ? 'border-red-300' : ''}`}
                required
              />
            </div>
            {insufficientFunds && <p className="text-xs text-red-500 mt-1">Insufficient balance</p>}
            <div className="flex gap-2 mt-2">
              {[50, 100, 200, 500, 1000].map(a => (
                <button key={a} type="button" onClick={() => setAmount(String(a))}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition-colors">
                  {a >= 1000 ? '1K' : a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} className="input-field" placeholder="e.g. Rent, school fees, goods payment..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Transaction PIN <span className="text-gray-400">(if set)</span></label>
            <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} className="input-field tracking-widest" placeholder="••••" />
          </div>

          {/* Summary preview */}
          {canSubmit && parsedAmount > 0 && !insufficientFunds && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-primary-800 uppercase tracking-wide">Transfer Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">To</span>
                <span className="font-semibold text-gray-900 text-right max-w-[60%]">
                  {mode === 'internal' && lookupResult?.account_name}
                  {mode === 'interbank' && `${ibAccountName} · ${selectedBank?.name}`}
                  {mode === 'momo' && `${momoName || momoPhone} · ${selectedNetwork?.name}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-bold text-primary-900 text-lg">{formatCurrency(parsedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fee</span>
                <span className="font-semibold text-emerald-600">Free</span>
              </div>
              <div className="flex justify-between text-sm border-t border-primary-100 pt-2">
                <span className="text-gray-600">Balance after</span>
                <span className="font-semibold text-gray-800">{formatCurrency((fromAccount?.available_balance || 0) - parsedAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !canSubmit || insufficientFunds || parsedAmount <= 0}
          className="btn-primary w-full py-3.5 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
          ) : (
            <><ArrowLeftRight size={18} />
              {mode === 'internal' ? 'Transfer Now' : mode === 'interbank' ? 'Send to Bank' : 'Send to Wallet'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
