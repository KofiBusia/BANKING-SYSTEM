import { useState, useEffect } from 'react';
import { Banknote, Plus, ChevronRight, Calculator, CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';
import { loansAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Loan, Account } from '../../types';
import { formatCurrency, formatDate, getLoanStatusColor, getLoanTypeLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';

const LOAN_TYPES = ['personal','business','mortgage','auto','salary_advance','sme','education','agricultural'];

export default function Loans() {
  const { user, accounts } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);
  const [showApply, setShowApply] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [form, setForm] = useState({ loan_type: 'personal', amount: '', tenure_months: '12', purpose: '', account_id: accounts[0]?.id || '', guarantor_name: '', guarantor_phone: '', interest_type: 'reducing' });
  const [isApplying, setIsApplying] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    Promise.all([fetchLoans(), fetchEligibility()]);
  }, []);

  const fetchLoans = async () => { try { const r = await loansAPI.getAll(); setLoans(r.data.loans || []); } catch {} finally { setIsLoading(false); } };
  const fetchEligibility = async () => { try { const r = await loansAPI.checkEligibility(); setEligibility(r.data); } catch {} };

  const handleCalculate = async () => {
    if (!form.amount || !form.tenure_months) { toast.error('Enter amount and tenure'); return; }
    setIsCalculating(true);
    try {
      const r = await loansAPI.calculate({ amount: parseFloat(form.amount), months: parseInt(form.tenure_months), loan_type: form.loan_type, interest_type: form.interest_type });
      setCalcResult(r.data);
    } catch { toast.error('Calculation failed'); } finally { setIsCalculating(false); }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.purpose) { toast.error('Purpose is required'); return; }
    setIsApplying(true);
    try {
      await loansAPI.apply({ ...form, amount: parseFloat(form.amount), tenure_months: parseInt(form.tenure_months) });
      toast.success('Loan application submitted!');
      setShowApply(false);
      fetchLoans();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Application failed'); } finally { setIsApplying(false); }
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const statusIcon = (status: string) => {
    if (['approved','disbursed','active','completed'].includes(status)) return <CheckCircle2 size={16} className="text-emerald-500" />;
    if (status === 'pending' || status === 'under_review') return <Clock size={16} className="text-amber-500" />;
    return <XCircle size={16} className="text-red-500" />;
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Loans</h1><p className="text-gray-500 text-sm mt-0.5">Manage your loan applications</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowCalculator(!showCalculator)} className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm"><Calculator size={16} /> Calculator</button>
          {eligibility?.eligible && <button onClick={() => setShowApply(true)} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"><Plus size={16} /> Apply</button>}
        </div>
      </div>

      {eligibility && !eligibility.eligible && (
        <div className="card bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Banknote size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Complete KYC to Access Loans</p>
            <p className="text-sm text-amber-700 mt-0.5">Your KYC level: <strong>{user?.kyc_status}</strong>. Complete and get KYC verified to apply for loans up to GHS 500,000.</p>
          </div>
        </div>
      )}

      {/* Loan Calculator */}
      {showCalculator && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Calculator size={18} className="text-primary-700" />Loan Calculator</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Loan Type</label><select value={form.loan_type} onChange={e => set('loan_type', e.target.value)} className="input-field text-sm">{LOAN_TYPES.map(t => <option key={t} value={t}>{getLoanTypeLabel(t)}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Amount (GHS)</label><input type="number" min="100" value={form.amount} onChange={e => set('amount', e.target.value)} className="input-field text-sm" placeholder="5000" /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Tenure (Months)</label><input type="number" min="1" max="240" value={form.tenure_months} onChange={e => set('tenure_months', e.target.value)} className="input-field text-sm" /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Interest Type</label><select value={form.interest_type} onChange={e => set('interest_type', e.target.value)} className="input-field text-sm"><option value="reducing">Reducing Balance</option><option value="flat">Flat Rate</option></select></div>
          </div>
          <button onClick={handleCalculate} disabled={isCalculating} className="btn-primary py-2 px-6 text-sm">{isCalculating ? 'Calculating...' : 'Calculate'}</button>
          {calcResult && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="font-semibold text-blue-900 mb-3">Loan Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center"><p className="text-xs text-blue-600">Monthly Payment</p><p className="text-lg font-bold text-blue-900">{formatCurrency(calcResult.monthly_payment)}</p></div>
                <div className="text-center"><p className="text-xs text-blue-600">Total Repayment</p><p className="text-lg font-bold text-blue-900">{formatCurrency(calcResult.total_repayment)}</p></div>
                <div className="text-center"><p className="text-xs text-blue-600">Total Interest</p><p className="text-lg font-bold text-blue-900">{formatCurrency(calcResult.total_interest)}</p></div>
                <div className="text-center"><p className="text-xs text-blue-600">Interest Rate</p><p className="text-lg font-bold text-blue-900">{calcResult.interest_rate}% p.a.</p></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {showApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Loan Application</h2>
              <button onClick={() => setShowApply(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleApply} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Loan Type</label><select value={form.loan_type} onChange={e => set('loan_type', e.target.value)} className="input-field text-sm">{LOAN_TYPES.map(t => <option key={t} value={t}>{getLoanTypeLabel(t)}</option>)}</select></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Amount (GHS)</label><input type="number" min="100" value={form.amount} onChange={e => set('amount', e.target.value)} className="input-field text-sm" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Tenure (Months)</label><input type="number" min="1" max="240" value={form.tenure_months} onChange={e => set('tenure_months', e.target.value)} className="input-field text-sm" required /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Disbursement Account</label><select value={form.account_id} onChange={e => set('account_id', e.target.value)} className="input-field text-sm">{accounts.filter(a => a.status === 'active').map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Purpose *</label><textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} className="input-field text-sm" rows={2} placeholder="What is this loan for?" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Guarantor Name</label><input value={form.guarantor_name} onChange={e => set('guarantor_name', e.target.value)} className="input-field text-sm" placeholder="Optional" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Guarantor Phone</label><input value={form.guarantor_phone} onChange={e => set('guarantor_phone', e.target.value)} className="input-field text-sm" placeholder="0241234567" /></div>
              </div>
              {eligibility?.interest_rates?.[form.loan_type] && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  Interest rate for {getLoanTypeLabel(form.loan_type)}: <strong>{eligibility.interest_rates[form.loan_type]}% per annum</strong>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowApply(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isApplying} className="btn-primary flex-1">{isApplying ? 'Submitting...' : 'Submit Application'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loans list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : loans.length === 0 ? (
        <div className="card text-center py-12">
          <Banknote size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No loan applications yet</p>
          {eligibility?.eligible && <button onClick={() => setShowApply(true)} className="btn-primary mt-4 py-2 px-6 text-sm">Apply for a Loan</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map(loan => (
            <div key={loan.id} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {statusIcon(loan.status)}
                    <span className="font-semibold text-gray-800">{getLoanTypeLabel(loan.loan_type)}</span>
                    <span className={getLoanStatusColor(loan.status)}>{loan.status.replace('_',' ')}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">#{loan.loan_number} · Applied {formatDate(loan.application_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(loan.amount_requested)}</p>
                  <p className="text-xs text-gray-500">{loan.interest_rate}% p.a.</p>
                </div>
              </div>
              {loan.status === 'active' && loan.outstanding_balance !== undefined && (
                <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-gray-500">Outstanding</span>
                  <span className="font-bold text-red-600">{formatCurrency(loan.outstanding_balance)}</span>
                  <span className="text-gray-500">Monthly</span>
                  <span className="font-semibold">{formatCurrency(loan.monthly_payment || 0)}</span>
                  <span className="text-gray-500">Next Due</span>
                  <span className="font-semibold text-amber-700">{loan.next_payment_date ? formatDate(loan.next_payment_date) : 'N/A'}</span>
                </div>
              )}
              {loan.rejection_reason && <p className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">{loan.rejection_reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
