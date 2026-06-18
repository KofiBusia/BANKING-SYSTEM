import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Eye } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminKYC() {
  const [pending, setPending] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    setIsLoading(true);
    try {
      const res = await adminAPI.getPendingKYC();
      setPending(res.data.customers || []);
    } catch { toast.error('Failed to load KYC queue'); }
    finally { setIsLoading(false); }
  }

  async function processKYC(customerId: string, action: 'verified' | 'rejected') {
    if (action === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setIsProcessing(true);
    try {
      await adminAPI.reviewKYC(customerId, { action, rejection_reason: rejectionReason });
      toast.success(`KYC ${action === 'verified' ? 'approved' : 'rejected'} successfully`);
      setSelected(null);
      setRejectionReason('');
      loadPending();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process KYC');
    } finally { setIsProcessing(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">KYC Review</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve customer identity verification requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{pending.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-900 border-t-transparent rounded-full animate-spin" /></div>
      ) : pending.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">All caught up! No pending KYC requests.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Customer', 'Phone', 'Ghana Card', 'Completion', 'Submitted', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.ghana_card_number || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${c.kyc_completion}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{c.kyc_completion}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(c.updated_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(c)} className="flex items-center gap-1 text-primary-700 hover:text-primary-800 text-xs font-medium">
                      <Eye size={13} /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-primary-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{selected.full_name}</h3>
                <p className="text-xs text-gray-400">{selected.email} • {selected.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              {[
                ['Ghana Card', selected.ghana_card_number || '—'],
                ['KYC Completion', `${selected.kyc_completion}%`],
                ['Account Status', selected.account_status],
                ['Joined', formatDateTime(selected.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">{k}</p>
                  <p className="font-medium text-gray-700">{v}</p>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (if rejecting)</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Explain why the KYC is being rejected..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => processKYC(selected.id, 'rejected')} disabled={isProcessing} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                <XCircle size={16} /> Reject
              </button>
              <button onClick={() => processKYC(selected.id, 'verified')} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                <CheckCircle size={16} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
