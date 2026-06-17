import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { formatCurrency, formatDate, getLoanTypeLabel, getLoanStatusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminLoans() {
  const [loans, setLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'disburse' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchLoans(); }, [page, statusFilter]);
  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const r = await adminAPI.getAllLoans({ page, per_page: 15, status: statusFilter });
      setLoans(r.data.loans || []);
      setTotalPages(r.data.pagination?.pages || 1);
    } catch {} finally { setIsLoading(false); }
  };

  const handleProcess = async () => {
    if (!selected || !action) return;
    setIsProcessing(true);
    try {
      await adminAPI.processLoan(selected.id, {
        action,
        rejection_reason: rejectionReason,
        approved_amount: approvedAmount ? parseFloat(approvedAmount) : undefined,
        notes,
      });
      toast.success(`Loan ${action}d successfully`);
      setSelected(null); setAction(null); setRejectionReason(''); setApprovedAmount(''); setNotes('');
      fetchLoans();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Action failed'); } finally { setIsProcessing(false); }
  };

  const statusTabs = ['pending', 'approved', 'active', 'completed', 'rejected'];

  return (
    <div className="space-y-6 page-enter">
      <div><h1 className="text-2xl font-bold text-gray-900">Loan Management</h1><p className="text-gray-500 text-sm">Review and process loan applications</p></div>

      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`py-1.5 px-4 rounded-full text-sm font-medium transition-colors capitalize ${statusFilter === s ? 'bg-primary-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>{s}</button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Loan #</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Rate</th>
              <th className="px-4 py-3 text-left">Tenure</th>
              <th className="px-4 py-3 text-left">Applied</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? Array.from({length:5}).map((_, i) => <tr key={i}><td colSpan={9}><div className="h-10 bg-gray-100 m-3 rounded animate-pulse" /></td></tr>) :
            loans.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-gray-400">No loans found</td></tr> :
            loans.map(loan => (
              <tr key={loan.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{loan.loan_number}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-800">{loan.borrower_name}</p>
                  <p className="text-xs text-gray-400">{loan.borrower_phone}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{getLoanTypeLabel(loan.loan_type)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(loan.amount_requested)}</td>
                <td className="px-4 py-3 text-gray-600">{loan.interest_rate}%</td>
                <td className="px-4 py-3 text-gray-600">{loan.tenure_months}m</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(loan.application_date)}</td>
                <td className="px-4 py-3"><span className={getLoanStatusColor(loan.status)}>{loan.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {loan.status === 'pending' && <>
                      <button onClick={() => { setSelected(loan); setAction('approve'); setApprovedAmount(String(loan.amount_requested)); }} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200">Approve</button>
                      <button onClick={() => { setSelected(loan); setAction('reject'); }} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200">Reject</button>
                    </>}
                    {loan.status === 'approved' && <button onClick={() => { setSelected(loan); setAction('disburse'); }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200">Disburse</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-50">Prev</button>
            <span className="text-sm text-gray-500">Page {page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Process Modal */}
      {selected && action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between">
              <h3 className="font-bold text-gray-900">{action.charAt(0).toUpperCase() + action.slice(1)} Loan — {selected.loan_number}</h3>
              <button onClick={() => { setSelected(null); setAction(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-medium">{selected.borrower_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Amount Requested</span><span className="font-bold">{formatCurrency(selected.amount_requested)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Purpose</span><span className="font-medium truncate max-w-[60%] text-right">{selected.purpose}</span></div>
              </div>
              {action === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Approved Amount (GHS)</label>
                  <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} className="input-field" />
                </div>
              )}
              {action === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason *</label>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="input-field" rows={3} placeholder="Reason for rejection..." required />
                </div>
              )}
              {action === 'disburse' && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
                  <p className="font-semibold">Disbursement Confirmation</p>
                  <p className="mt-1">This will credit <strong>{formatCurrency(selected.amount_approved || selected.amount_requested)}</strong> to the customer's account immediately.</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field text-sm" rows={2} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setSelected(null); setAction(null); }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleProcess} disabled={isProcessing} className={`flex-1 ${action === 'reject' ? 'btn-danger' : action === 'approve' ? 'btn-success' : 'btn-primary'}`}>
                  {isProcessing ? 'Processing...' : `Confirm ${action}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
