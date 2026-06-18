import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Calendar, Shield, ChevronRight, RefreshCw, Info } from 'lucide-react';
import { treasuryBillsAPI, accountsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface TBillRate {
  tenure_days: number;
  tenure_label: string;
  annual_rate: number;
  withholding_tax: number;
  min_investment: number;
  effective_date: string | null;
  sample_on_1000: {
    gross_interest: number;
    withholding_tax: number;
    net_interest: number;
    maturity_value: number;
    effective_rate: number;
  };
}

interface TreasuryBill {
  id: string;
  reference: string;
  principal: number;
  interest_rate: number;
  tenure_days: number;
  interest_earned: number;
  withholding_tax: number;
  net_interest: number;
  maturity_value: number;
  investment_date: string;
  maturity_date: string;
  actual_maturity_date: string | null;
  status: string;
  account_id: string;
}

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  account_name: string;
  balance: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  matured: 'bg-blue-100 text-blue-700',
  rolled_over: 'bg-purple-100 text-purple-700',
  liquidated: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

function calcReturns(principal: number, annualRate: number, tenureDays: number, whtRate: number) {
  const gross = principal * (annualRate / 100) * (tenureDays / 364);
  const wht = gross * (whtRate / 100);
  const net = gross - wht;
  const maturity = principal + net;
  const effectiveRate = (net / principal) * (364 / tenureDays) * 100;
  return {
    gross_interest: Math.round(gross * 100) / 100,
    withholding_tax: Math.round(wht * 100) / 100,
    net_interest: Math.round(net * 100) / 100,
    maturity_value: Math.round(maturity * 100) / 100,
    effective_rate: Math.round(effectiveRate * 100) / 100,
  };
}

function maturityDateStr(tenureDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + tenureDays);
  return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TreasuryBills() {
  const [rates, setRates] = useState<TBillRate[]>([]);
  const [tbills, setTbills] = useState<TreasuryBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<'invest' | 'portfolio'>('invest');
  const [selectedTenure, setSelectedTenure] = useState<number | null>(null);
  const [principal, setPrincipal] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);
  const [showRolloverModal, setShowRolloverModal] = useState<TreasuryBill | null>(null);
  const [rolloverTenure, setRolloverTenure] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [ratesRes, tbillsRes, accountsRes] = await Promise.all([
        treasuryBillsAPI.getRates(),
        treasuryBillsAPI.getAll(),
        accountsAPI.getAll(),
      ]);
      const loadedRates: TBillRate[] = ratesRes.data.rates || [];
      setRates(loadedRates);
      setTbills(tbillsRes.data.treasury_bills || []);
      setAccounts(accountsRes.data.accounts || []);
      if (loadedRates.length > 0 && !selectedTenure) {
        setSelectedTenure(loadedRates[loadedRates.length - 1].tenure_days); // default to longest
      }
      const accs = accountsRes.data.accounts || [];
      if (accs.length > 0) setSelectedAccount(accs[0].id);
    } catch {
      toast.error('Failed to load Treasury Bills data');
    } finally {
      setIsLoading(false);
    }
  }

  const selectedRate = rates.find(r => r.tenure_days === selectedTenure) ?? null;
  const parsedPrincipal = parseFloat(principal) || 0;

  // Live calculation — no API call needed
  const calcResult = useMemo(() => {
    if (!selectedRate || parsedPrincipal < selectedRate.min_investment) return null;
    return calcReturns(parsedPrincipal, selectedRate.annual_rate, selectedRate.tenure_days, selectedRate.withholding_tax);
  }, [parsedPrincipal, selectedRate]);

  const selectedAccountObj = accounts.find(a => a.id === selectedAccount);
  const insufficientFunds = selectedAccountObj ? parsedPrincipal > selectedAccountObj.balance : false;

  async function handleInvest() {
    if (!calcResult || !selectedRate) return;
    if (!selectedAccount) { toast.error('Please select a source account'); return; }
    if (parsedPrincipal < selectedRate.min_investment) {
      toast.error(`Minimum investment is ${formatCurrency(selectedRate.min_investment)}`);
      return;
    }
    if (insufficientFunds) { toast.error('Insufficient funds in selected account'); return; }

    setIsInvesting(true);
    try {
      const res = await treasuryBillsAPI.invest({
        account_id: selectedAccount,
        principal: parsedPrincipal,
        tenure_days: selectedTenure,
      });
      toast.success(res.data.message);
      setPrincipal('');
      await loadData();
      setActiveTab('portfolio');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Investment failed');
    } finally {
      setIsInvesting(false);
    }
  }

  async function handleRollover() {
    if (!showRolloverModal || !rolloverTenure) return;
    try {
      const res = await treasuryBillsAPI.rollover(showRolloverModal.id, {
        tenure_days: rolloverTenure,
        principal: showRolloverModal.maturity_value,
      });
      toast.success(res.data.message);
      setShowRolloverModal(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rollover failed');
    }
  }

  const activeTbills = tbills.filter(t => t.status === 'active');
  const totalInvested = activeTbills.reduce((s, t) => s + t.principal, 0);
  const totalAtMaturity = activeTbills.reduce((s, t) => s + t.maturity_value, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-gray-600">Treasury Bills not yet available</p>
        <p className="text-sm mt-1">Your bank has not configured T-Bill rates yet. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Treasury Bills</h1>
          <p className="text-gray-500 text-sm mt-0.5">Bank of Ghana backed government securities</p>
        </div>
        <div className="flex gap-2">
          {(['invest', 'portfolio'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === tab ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {tab === 'invest' ? 'Invest' : `My Portfolio (${tbills.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio summary bar */}
      {activeTbills.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card py-4 text-center">
            <p className="text-2xl font-bold text-primary-900">{activeTbills.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-xl font-bold text-primary-900">{formatCurrency(totalInvested)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Invested</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalAtMaturity)}</p>
            <p className="text-xs text-gray-500 mt-0.5">At Maturity</p>
          </div>
        </div>
      )}

      {activeTab === 'invest' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: rate cards */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Available Tenures</h2>
            {rates.map(rate => (
              <button
                key={rate.tenure_days}
                onClick={() => { setSelectedTenure(rate.tenure_days); setPrincipal(''); }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedTenure === rate.tenure_days ? 'border-primary-800 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{rate.tenure_label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Min. {formatCurrency(rate.min_investment)} · WHT {rate.withholding_tax}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-900">{rate.annual_rate}%</p>
                    <p className="text-xs text-gray-400">p.a. gross</p>
                  </div>
                </div>

                {/* Sample on 1000 */}
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-gray-400 mb-0.5">Gross</p>
                    <p className="font-semibold text-gray-700">+{formatCurrency(rate.sample_on_1000.gross_interest)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">WHT ({rate.withholding_tax}%)</p>
                    <p className="font-semibold text-red-500">-{formatCurrency(rate.sample_on_1000.withholding_tax)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">You get</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(rate.sample_on_1000.maturity_value)}</p>
                  </div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-1.5">On GHS 1,000 · Net rate {rate.sample_on_1000.effective_rate}% p.a.</p>

                {selectedTenure === rate.tenure_days && (
                  <div className="mt-2 flex justify-end">
                    <span className="text-xs bg-primary-800 text-white px-2 py-0.5 rounded-full">Selected</span>
                  </div>
                )}
              </button>
            ))}

            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
              <Info size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
              <p>Treasury Bills are government securities issued by the Bank of Ghana. Returns are guaranteed. WHT is deducted from interest as required by the Ghana Revenue Authority. Funds are locked for the full tenure.</p>
            </div>
          </div>

          {/* Right: calculator */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Investment Calculator</h2>
            <div className="card space-y-5">

              {/* Amount input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Investment Amount (GHS)
                  {selectedRate && <span className="text-gray-400 font-normal ml-1">— min {formatCurrency(selectedRate.min_investment)}</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">GHS</span>
                  <input
                    type="number"
                    value={principal}
                    onChange={e => setPrincipal(e.target.value)}
                    placeholder="0.00"
                    min={selectedRate?.min_investment ?? 100}
                    className={`input-field pl-12 text-lg font-semibold ${principal && parsedPrincipal < (selectedRate?.min_investment ?? 0) ? 'border-red-300 focus:border-red-400' : ''}`}
                  />
                </div>
                {principal && selectedRate && parsedPrincipal < selectedRate.min_investment && (
                  <p className="text-xs text-red-500 mt-1">Minimum investment is {formatCurrency(selectedRate.min_investment)}</p>
                )}
                {insufficientFunds && parsedPrincipal >= (selectedRate?.min_investment ?? 0) && (
                  <p className="text-xs text-red-500 mt-1">Insufficient balance in selected account</p>
                )}
              </div>

              {/* Source account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Source Account</label>
                <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="input-field">
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} · {acc.account_number} — {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tenure selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tenure</label>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rates.length}, 1fr)` }}>
                  {rates.map(r => (
                    <button
                      key={r.tenure_days}
                      onClick={() => { setSelectedTenure(r.tenure_days); setPrincipal(''); }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${selectedTenure === r.tenure_days ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
                    >
                      {r.tenure_label}
                      <span className={`block text-xs font-normal mt-0.5 ${selectedTenure === r.tenure_days ? 'text-blue-200' : 'text-gray-400'}`}>{r.annual_rate}%</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live results */}
              {selectedRate && parsedPrincipal >= selectedRate.min_investment && calcResult ? (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  {/* Summary header */}
                  <div className="bg-primary-900 text-white px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-200 uppercase tracking-wide">Maturity Value</p>
                        <p className="text-3xl font-bold mt-0.5">{formatCurrency(calcResult.maturity_value)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-200">Net return</p>
                        <p className="text-xl font-bold text-emerald-300">+{formatCurrency(calcResult.net_interest)}</p>
                        <p className="text-xs text-blue-300">{calcResult.effective_rate}% net p.a.</p>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="bg-white px-5 py-4 space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Principal</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(parsedPrincipal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Gross interest ({selectedRate.annual_rate}% × {selectedRate.tenure_days} days)</span>
                      <span className="font-semibold text-gray-800">+{formatCurrency(calcResult.gross_interest)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Withholding Tax ({selectedRate.withholding_tax}% of interest)</span>
                      <span className="font-semibold text-red-500">-{formatCurrency(calcResult.withholding_tax)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Net interest</span>
                      <span className="font-semibold text-emerald-600">+{formatCurrency(calcResult.net_interest)}</span>
                    </div>
                    <hr className="border-gray-100" />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar size={13} />
                        <span>Matures on</span>
                      </div>
                      <span className="font-semibold text-gray-800">{maturityDateStr(selectedRate.tenure_days)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Shield size={13} />
                        <span>Security</span>
                      </div>
                      <span className="text-xs text-emerald-600 font-medium">Government of Ghana backed</span>
                    </div>
                  </div>

                  {/* Invest button */}
                  <div className="px-5 pb-5">
                    <button
                      onClick={handleInvest}
                      disabled={isInvesting || insufficientFunds}
                      className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isInvesting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <TrendingUp size={18} />
                          Invest {formatCurrency(parsedPrincipal)} Now
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-2">Funds will be debited from your selected account immediately</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-gray-400">
                  <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Enter an amount to see your returns</p>
                  {selectedRate && <p className="text-xs mt-1">Min. {formatCurrency(selectedRate.min_investment)} for {selectedRate.tenure_label}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Portfolio tab */
        <div className="space-y-4">
          {tbills.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-600">No Investments Yet</p>
              <p className="text-sm mt-1">Start investing in Treasury Bills to grow your savings.</p>
              <button onClick={() => setActiveTab('invest')} className="btn-primary mt-4 py-2 px-6 text-sm">Invest Now</button>
            </div>
          ) : (
            tbills.map(tbill => {
              const daysLeft = Math.max(0, Math.ceil((new Date(tbill.maturity_date).getTime() - Date.now()) / 86400000));
              const progress = Math.min(100, Math.round(((tbill.tenure_days - daysLeft) / tbill.tenure_days) * 100));
              const whtRate = rates.find(r => r.tenure_days === tbill.tenure_days)?.withholding_tax ?? 8;
              return (
                <div key={tbill.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{tbill.tenure_days}-Day Treasury Bill</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tbill.status] || 'bg-gray-100 text-gray-600'}`}>
                          {tbill.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Ref: {tbill.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Gross Rate</p>
                      <p className="font-bold text-primary-900 text-lg">{tbill.interest_rate}% p.a.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Principal</p>
                      <p className="font-semibold text-gray-800">{formatCurrency(tbill.principal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Gross Interest</p>
                      <p className="font-semibold text-gray-700">{formatCurrency(tbill.interest_earned)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">WHT ({whtRate}%)</p>
                      <p className="font-semibold text-red-500">-{formatCurrency(tbill.withholding_tax)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Net Interest</p>
                      <p className="font-semibold text-emerald-600">+{formatCurrency(tbill.net_interest)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl mb-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Investment Date</p>
                      <p className="font-medium text-gray-700">{formatDate(tbill.investment_date)}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Maturity Value</p>
                      <p className="font-bold text-primary-900 text-lg">{formatCurrency(tbill.maturity_value)}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Maturity Date</p>
                      <p className="font-medium text-gray-700">{formatDate(tbill.maturity_date)}</p>
                    </div>
                  </div>

                  {tbill.status === 'active' && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Progress</span>
                        <span>{progress}% complete · {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary-800 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {tbill.status === 'matured' && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => { setShowRolloverModal(tbill); setRolloverTenure(tbill.tenure_days); }}
                        className="flex items-center gap-2 btn-secondary text-sm py-1.5 px-4"
                      >
                        <RefreshCw size={14} /> Rollover Investment
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Rollover Modal */}
      {showRolloverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Rollover Treasury Bill</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ref: {showRolloverModal.reference}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-sm text-emerald-700 font-medium">Amount to Rollover</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">{formatCurrency(showRolloverModal.maturity_value)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Principal + net interest</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Tenure</label>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rates.length}, 1fr)` }}>
                  {rates.map(r => (
                    <button
                      key={r.tenure_days}
                      onClick={() => setRolloverTenure(r.tenure_days)}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${rolloverTenure === r.tenure_days ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
                    >
                      {r.tenure_label}
                      <span className={`block text-xs font-normal mt-0.5 ${rolloverTenure === r.tenure_days ? 'text-blue-200' : 'text-gray-400'}`}>{r.annual_rate}%</span>
                    </button>
                  ))}
                </div>
              </div>

              {rolloverTenure && (() => {
                const r = rates.find(x => x.tenure_days === rolloverTenure);
                if (!r) return null;
                const preview = calcReturns(showRolloverModal.maturity_value, r.annual_rate, r.tenure_days, r.withholding_tax);
                return (
                  <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Rollover Preview</p>
                    <div className="flex justify-between text-gray-600"><span>Gross interest</span><span>+{formatCurrency(preview.gross_interest)}</span></div>
                    <div className="flex justify-between text-gray-600"><span>WHT ({r.withholding_tax}%)</span><span className="text-red-500">-{formatCurrency(preview.withholding_tax)}</span></div>
                    <div className="flex justify-between font-bold text-primary-900 border-t border-gray-200 pt-2"><span>New maturity value</span><span>{formatCurrency(preview.maturity_value)}</span></div>
                    <p className="text-xs text-gray-400">Matures on {maturityDateStr(r.tenure_days)}</p>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button onClick={() => setShowRolloverModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleRollover} className="btn-primary flex-1">Confirm Rollover</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
