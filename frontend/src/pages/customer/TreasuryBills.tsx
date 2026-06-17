import { useState, useEffect } from 'react';
import { treasuryBillsAPI, accountsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface TBillRate {
  tenure_days: number;
  tenure_label: string;
  annual_rate: number;
  withholding_tax: number;
  min_investment: number;
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
  balance: number;
}

interface CalcResult {
  principal: number;
  tenure_days: number;
  annual_rate: number;
  maturity_date: string;
  gross_interest: number;
  withholding_tax: number;
  net_interest: number;
  maturity_value: number;
  effective_rate: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  matured: 'bg-blue-100 text-blue-700',
  rolled_over: 'bg-purple-100 text-purple-700',
  liquidated: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function TreasuryBills() {
  const [rates, setRates] = useState<TBillRate[]>([]);
  const [tbills, setTbills] = useState<TreasuryBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<'invest' | 'portfolio'>('invest');
  const [selectedTenure, setSelectedTenure] = useState(364);
  const [principal, setPrincipal] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isInvesting, setIsInvesting] = useState(false);
  const [showRolloverModal, setShowRolloverModal] = useState<TreasuryBill | null>(null);
  const [rolloverTenure, setRolloverTenure] = useState(364);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [ratesRes, tbillsRes, accountsRes] = await Promise.all([
        treasuryBillsAPI.getRates(),
        treasuryBillsAPI.getAll(),
        accountsAPI.getAll(),
      ]);
      setRates(ratesRes.data.rates || []);
      setTbills(tbillsRes.data.treasury_bills || []);
      setAccounts(accountsRes.data.accounts || []);
      if (accountsRes.data.accounts?.length > 0) {
        setSelectedAccount(accountsRes.data.accounts[0].id);
      }
    } catch {
      toast.error('Failed to load Treasury Bills data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCalculate() {
    if (!principal || parseFloat(principal) < 100) {
      toast.error('Minimum investment is GHS 100');
      return;
    }
    setIsCalculating(true);
    try {
      const res = await treasuryBillsAPI.calculate({ principal: parseFloat(principal), tenure_days: selectedTenure });
      setCalcResult(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleInvest() {
    if (!calcResult) {
      toast.error('Please calculate returns first');
      return;
    }
    if (!selectedAccount) {
      toast.error('Please select a source account');
      return;
    }
    setIsInvesting(true);
    try {
      const res = await treasuryBillsAPI.invest({
        account_id: selectedAccount,
        principal: parseFloat(principal),
        tenure_days: selectedTenure,
      });
      toast.success(res.data.message);
      setPrincipal('');
      setCalcResult(null);
      loadData();
      setActiveTab('portfolio');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Investment failed');
    } finally {
      setIsInvesting(false);
    }
  }

  async function handleRollover() {
    if (!showRolloverModal) return;
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

  const selectedRate = rates.find(r => r.tenure_days === selectedTenure);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Treasury Bills</h1>
          <p className="text-gray-500 text-sm mt-1">Bank of Ghana backed investments — 91, 182 & 364-day tenures</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('invest')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'invest' ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Invest
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'portfolio' ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            My Portfolio ({tbills.length})
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {activeTbills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-sm text-gray-500">Active Investments</p>
            <p className="text-2xl font-bold text-primary-900 mt-1">{activeTbills.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500">Total Invested</p>
            <p className="text-2xl font-bold text-primary-900 mt-1">GHS {totalInvested.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500">Expected at Maturity</p>
            <p className="text-2xl font-bold text-green-600 mt-1">GHS {totalAtMaturity.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {activeTab === 'invest' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rate cards */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Current BOG Rates</h2>
            {rates.map(rate => (
              <button
                key={rate.tenure_days}
                onClick={() => setSelectedTenure(rate.tenure_days)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedTenure === rate.tenure_days ? 'border-primary-900 bg-primary-900/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{rate.tenure_label} T-Bill</p>
                    <p className="text-sm text-gray-500 mt-1">Min. GHS {rate.min_investment.toLocaleString()} • 8% WHT applies</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary-900">{rate.annual_rate}%</p>
                    <p className="text-xs text-gray-400">per annum</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-gray-400">On GHS 1,000</p>
                    <p className="font-semibold text-gray-700">+GHS {rate.sample_on_1000.net_interest.toFixed(2)}</p>
                    <p className="text-gray-400">net interest</p>
                  </div>
                  <div>
                    <p className="text-gray-400">WHT deducted</p>
                    <p className="font-semibold text-red-500">-GHS {rate.sample_on_1000.withholding_tax.toFixed(2)}</p>
                    <p className="text-gray-400">8% WHT</p>
                  </div>
                  <div>
                    <p className="text-gray-400">You receive</p>
                    <p className="font-semibold text-green-600">GHS {rate.sample_on_1000.maturity_value.toFixed(2)}</p>
                    <p className="text-gray-400">at maturity</p>
                  </div>
                </div>
                {selectedTenure === rate.tenure_days && (
                  <div className="mt-2 flex justify-end">
                    <span className="text-xs bg-primary-900 text-white px-2 py-0.5 rounded-full">Selected</span>
                  </div>
                )}
              </button>
            ))}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">Important Information</p>
              <p>Treasury Bills are government securities issued by the Bank of Ghana. Returns are guaranteed by the Government of Ghana. 8% Withholding Tax is deducted from interest as required by the Ghana Revenue Authority (GRA). Funds are locked for the full tenure period.</p>
            </div>
          </div>

          {/* Investment form */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Investment Calculator</h2>
            <div className="card p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investment Amount (GHS) <span className="text-gray-400 font-normal">— min GHS 100</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">GHS</span>
                  <input
                    type="number"
                    value={principal}
                    onChange={e => { setPrincipal(e.target.value); setCalcResult(null); }}
                    placeholder="Enter amount"
                    min="100"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Account</label>
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  className="input-field"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} — {acc.account_number} (GHS {acc.balance.toLocaleString('en-GH', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tenure</label>
                <div className="grid grid-cols-3 gap-2">
                  {rates.map(r => (
                    <button
                      key={r.tenure_days}
                      onClick={() => { setSelectedTenure(r.tenure_days); setCalcResult(null); }}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${selectedTenure === r.tenure_days ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                      {r.tenure_label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={!principal || isCalculating}
                className="btn-secondary w-full"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Returns'}
              </button>

              {/* Results */}
              {calcResult && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                  <h3 className="font-semibold text-gray-700 text-sm">Investment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Principal</span>
                      <span className="font-medium">GHS {calcResult.principal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rate (p.a.)</span>
                      <span className="font-medium">{calcResult.annual_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tenure</span>
                      <span className="font-medium">{calcResult.tenure_days} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Maturity Date</span>
                      <span className="font-medium">{new Date(calcResult.maturity_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gross Interest</span>
                      <span className="font-medium">GHS {calcResult.gross_interest.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">WHT (8%)</span>
                      <span className="font-medium text-red-500">- GHS {calcResult.withholding_tax.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Net Interest</span>
                      <span className="font-medium text-green-600">GHS {calcResult.net_interest.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Maturity Value</span>
                      <span className="font-bold text-xl text-primary-900">GHS {calcResult.maturity_value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Effective Net Rate</span>
                      <span className="text-green-600 font-medium">{calcResult.effective_rate}% p.a.</span>
                    </div>
                  </div>

                  <button
                    onClick={handleInvest}
                    disabled={isInvesting}
                    className="btn-primary w-full mt-2"
                  >
                    {isInvesting ? 'Processing...' : `Invest GHS ${calcResult.principal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Portfolio tab */
        <div className="space-y-4">
          {tbills.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">📈</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Investments Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Start investing in Treasury Bills to grow your savings with government-backed returns.</p>
              <button onClick={() => setActiveTab('invest')} className="btn-primary">Invest Now</button>
            </div>
          ) : (
            tbills.map(tbill => {
              const daysLeft = Math.max(0, Math.ceil((new Date(tbill.maturity_date).getTime() - Date.now()) / 86400000));
              const progress = Math.min(100, Math.round(((tbill.tenure_days - daysLeft) / tbill.tenure_days) * 100));
              return (
                <div key={tbill.id} className="card p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{tbill.tenure_days}-Day Treasury Bill</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tbill.status] || 'bg-gray-100 text-gray-600'}`}>
                          {tbill.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Ref: {tbill.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Interest Rate</p>
                      <p className="font-bold text-primary-900 text-lg">{tbill.interest_rate}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-400">Principal</p>
                      <p className="font-semibold text-gray-800">GHS {tbill.principal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Net Interest</p>
                      <p className="font-semibold text-green-600">GHS {tbill.net_interest.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Maturity Value</p>
                      <p className="font-bold text-primary-900">GHS {tbill.maturity_value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Maturity Date</p>
                      <p className="font-semibold text-gray-800">{new Date(tbill.maturity_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {tbill.status === 'active' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{progress}% ({daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-900 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {tbill.status === 'matured' && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => { setShowRolloverModal(tbill); setRolloverTenure(tbill.tenure_days); }}
                        className="btn-secondary text-sm py-1.5 px-4"
                      >
                        Rollover Investment
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-primary-900 mb-1">Rollover Treasury Bill</h3>
            <p className="text-sm text-gray-500 mb-4">Ref: {showRolloverModal.reference}</p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-green-700">Maturity Value to Rollover</p>
              <p className="text-2xl font-bold text-green-600">GHS {showRolloverModal.maturity_value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Tenure</label>
              <div className="grid grid-cols-3 gap-2">
                {rates.map(r => (
                  <button
                    key={r.tenure_days}
                    onClick={() => setRolloverTenure(r.tenure_days)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${rolloverTenure === r.tenure_days ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {r.tenure_label}
                    <br />
                    <span className="text-xs opacity-80">{r.annual_rate}%</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRolloverModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleRollover} className="btn-primary flex-1">Confirm Rollover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
