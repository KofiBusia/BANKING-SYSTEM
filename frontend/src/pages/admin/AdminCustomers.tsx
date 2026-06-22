import { useState, useEffect } from 'react';
import { Search, Shield, UserCheck, UserPlus } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatCurrency, formatDate, getKYCStatusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [showKYCReview, setShowKYCReview] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showRMModal, setShowRMModal] = useState(false);
  const [rmCustomer, setRMCustomer] = useState<any>(null);
  const [selectedRM, setSelectedRM] = useState<string>('');
  const [assigningRM, setAssigningRM] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [onboardForm, setOnboardForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    ghana_card_number: '', date_of_birth: '', gender: '',
    password: '', product_id: '', branch_id: '',
  });
  const [onboardResult, setOnboardResult] = useState<any>(null);

  useEffect(() => { fetchCustomers(); }, [page, kycFilter]);
  useEffect(() => { fetchStaff(); }, []);
  useEffect(() => {
    adminAPI.getBranches().then(r => setBranches(r.data.branches || [])).catch(() => {});
    adminAPI.getAccountProducts().then(r => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  const fetchStaff = async () => {
    try {
      const r = await adminAPI.getStaff();
      setStaffList(r.data.staff || []);
    } catch {}
  };

  const openRMModal = (customer: any) => {
    setRMCustomer(customer);
    setSelectedRM(customer.rm_id || '');
    setShowRMModal(true);
  };

  const handleAssignRM = async () => {
    if (!rmCustomer) return;
    setAssigningRM(true);
    try {
      await adminAPI.assignRM({ customer_id: rmCustomer.id, rm_id: selectedRM || null });
      toast.success(selectedRM ? 'RM assigned successfully' : 'RM removed');
      setShowRMModal(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update RM');
    } finally { setAssigningRM(false); }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const r = await adminAPI.getCustomers({ page, per_page: 15, search, kyc_status: kycFilter });
      setCustomers(r.data.customers || []);
      setTotalPages(r.data.pagination?.pages || 1);
    } catch {} finally { setIsLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchCustomers(); };

  const handleKYCReview = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && !rejectionReason) { toast.error('Provide a rejection reason'); return; }
    setIsProcessing(true);
    try {
      await adminAPI.reviewKYC(selected.id, { action, rejection_reason: rejectionReason });
      toast.success(`KYC ${action}d successfully`);
      setShowKYCReview(false);
      setSelected(null);
      fetchCustomers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Action failed'); } finally { setIsProcessing(false); }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboarding(true);
    try {
      const r = await adminAPI.createCustomer(onboardForm);
      setOnboardResult(r.data);
      toast.success('Customer onboarded successfully!');
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Onboarding failed');
    } finally { setOnboarding(false); }
  };

  const resetOnboard = () => {
    setShowOnboard(false);
    setOnboardResult(null);
    setOnboardForm({ first_name: '', last_name: '', email: '', phone: '', ghana_card_number: '', date_of_birth: '', gender: '', password: '', product_id: '', branch_id: '' });
  };

  const handleDepositForCustomer = async (accountNumber: string) => {
    const amount = prompt('Enter deposit amount (GHS):');
    if (!amount || isNaN(parseFloat(amount))) return;
    try {
      await adminAPI.depositForCustomer({ account_number: accountNumber, amount: parseFloat(amount), description: 'Teller Deposit' });
      toast.success('Deposit successful!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Deposit failed'); }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Customers</h1><p className="text-gray-500 text-sm">Manage all customer accounts</p></div>
        <button onClick={() => setShowOnboard(true)} className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm"><UserPlus size={16} /> Onboard Customer</button>
      </div>

      <div className="card flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone, Ghana Card..." className="input-field pl-9 py-2.5 text-sm" />
          </div>
          <button type="submit" className="btn-primary py-2.5 px-4 text-sm">Search</button>
        </form>
        <select value={kycFilter} onChange={e => { setKycFilter(e.target.value); setPage(1); }} className="input-field py-2.5 text-sm w-full sm:w-40">
          <option value="">All KYC</option>
          <option value="basic">Basic</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Ghana Card</th>
                <th className="px-4 py-3 text-left">KYC</th>
                <th className="px-4 py-3 text-left">Balance</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No customers found</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{c.full_name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.ghana_card_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={getKYCStatusColor(c.kyc_status)}>{c.kyc_status}</span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                      <div className="h-1 bg-primary-500 rounded-full" style={{ width: `${c.kyc_completion}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(c.total_balance || 0)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setSelected(c); setShowKYCReview(true); }} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600" title="Review KYC"><Shield size={15} /></button>
                      <button onClick={() => openRMModal(c)} className={`p-1.5 hover:bg-purple-100 rounded-lg ${c.rm_id ? 'text-purple-600' : 'text-gray-400'}`} title={c.rm_id ? 'Change RM' : 'Assign RM'}><UserCheck size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50">Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Onboard Customer Modal */}
      {showOnboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-900">Onboard New Customer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Create a verified customer account</p>
              </div>
              <button onClick={resetOnboard} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {onboardResult ? (
              <div className="p-5 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-sm">
                  <p className="font-bold text-green-800 text-base">Customer Onboarded!</p>
                  <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{onboardResult.user?.first_name} {onboardResult.user?.last_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{onboardResult.user?.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account No.</span><span className="font-mono font-bold">{onboardResult.account?.account_number}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account Type</span><span className="font-medium capitalize">{onboardResult.account?.account_type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Temp Password</span><span className="font-mono font-bold text-orange-600">{onboardResult.temp_password}</span></div>
                </div>
                <p className="text-xs text-gray-400">Share the temp password with the customer. They can change it after first login.</p>
                <button onClick={resetOnboard} className="btn-primary w-full">Done</button>
              </div>
            ) : (
              <form onSubmit={handleOnboard} className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                    <input required value={onboardForm.first_name} onChange={e => setOnboardForm(f => ({...f, first_name: e.target.value}))} className="input-field text-sm" placeholder="Kwame" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                    <input required value={onboardForm.last_name} onChange={e => setOnboardForm(f => ({...f, last_name: e.target.value}))} className="input-field text-sm" placeholder="Asante" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={onboardForm.email} onChange={e => setOnboardForm(f => ({...f, email: e.target.value}))} className="input-field text-sm" placeholder="customer@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                  <input required value={onboardForm.phone} onChange={e => setOnboardForm(f => ({...f, phone: e.target.value}))} className="input-field text-sm" placeholder="024XXXXXXX" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ghana Card</label>
                    <input value={onboardForm.ghana_card_number} onChange={e => setOnboardForm(f => ({...f, ghana_card_number: e.target.value}))} className="input-field text-sm" placeholder="GHA-XXXXXXXXX-X" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" value={onboardForm.date_of_birth} onChange={e => setOnboardForm(f => ({...f, date_of_birth: e.target.value}))} className="input-field text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <select value={onboardForm.gender} onChange={e => setOnboardForm(f => ({...f, gender: e.target.value}))} className="input-field text-sm">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Product</label>
                    <select value={onboardForm.product_id} onChange={e => setOnboardForm(f => ({...f, product_id: e.target.value}))} className="input-field text-sm">
                      <option value="">Default (Basic Savings)</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                  <select value={onboardForm.branch_id} onChange={e => setOnboardForm(f => ({...f, branch_id: e.target.value}))} className="input-field text-sm">
                    <option value="">No specific branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-gray-400 font-normal">(leave blank for default)</span></label>
                  <input type="password" value={onboardForm.password} onChange={e => setOnboardForm(f => ({...f, password: e.target.value}))} className="input-field text-sm" placeholder="Auto-generated if blank" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={resetOnboard} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={onboarding} className="btn-primary flex-1">
                    {onboarding ? 'Onboarding...' : 'Onboard Customer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RM Assignment Modal */}
      {showRMModal && rmCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Assign Relationship Manager</h3>
                <p className="text-xs text-gray-500 mt-0.5">{rmCustomer.full_name}</p>
              </div>
              <button onClick={() => setShowRMModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship Manager <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={selectedRM}
                  onChange={e => setSelectedRM(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">— No RM (walk-in / unassigned) —</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.role?.replace('_', ' ')})</option>
                  ))}
                </select>
                {!selectedRM && (
                  <p className="text-xs text-gray-400 mt-1">Leave blank for walk-in customers with no assigned RM.</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowRMModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAssignRM} disabled={assigningRM} className="btn-primary flex-1">
                  {assigningRM ? 'Saving...' : selectedRM ? 'Assign RM' : 'Remove RM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC Review Modal */}
      {showKYCReview && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between">
              <h3 className="font-bold text-gray-900">KYC Review — {selected.full_name}</h3>
              <button onClick={() => setShowKYCReview(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{selected.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{selected.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ghana Card</span><span className="font-medium font-mono">{selected.ghana_card_number || 'Not provided'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">KYC Status</span><span className={getKYCStatusColor(selected.kyc_status)}>{selected.kyc_status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">KYC Completion</span><span className="font-bold">{selected.kyc_completion}%</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason (if rejecting)</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="input-field text-sm" rows={3} placeholder="e.g. Document quality poor, information mismatch..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleKYCReview('reject')} disabled={isProcessing} className="btn-danger flex-1 py-2.5">Reject KYC</button>
                <button onClick={() => handleKYCReview('approve')} disabled={isProcessing} className="btn-success flex-1 py-2.5">Approve KYC</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
