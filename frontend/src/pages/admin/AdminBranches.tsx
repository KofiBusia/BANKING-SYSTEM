import { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, Phone, Mail, Clock, Users, CreditCard, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const GHANA_REGIONS = ['Greater Accra','Ashanti','Western','Central','Eastern','Northern','Upper East','Upper West','Volta','Bono','Bono East','Ahafo','Western North','Oti','North East','Savannah'];

interface Branch {
  id: string; name: string; code: string; address: string; digital_address?: string;
  city: string; region: string; phone?: string; email?: string; opening_hours?: string;
  status: string; customer_count: number; account_count: number; created_at: string;
}

const emptyForm = { name: '', code: '', address: '', digital_address: '', city: '', region: '', phone: '', email: '', opening_hours: 'Mon-Fri: 8AM-5PM, Sat: 9AM-1PM' };

export default function AdminBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBranches(); }, []);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getBranches();
      setBranches(res.data.branches || []);
    } catch { toast.error('Failed to load branches'); }
    finally { setIsLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({ name: b.name, code: b.code, address: b.address, digital_address: b.digital_address || '', city: b.city, region: b.region, phone: b.phone || '', email: b.email || '', opening_hours: b.opening_hours || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.address || !form.city || !form.region) {
      toast.error('Name, code, address, city and region are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateBranch(editing.id, form);
        toast.success('Branch updated');
      } else {
        await adminAPI.createBranch(form);
        toast.success('Branch created successfully');
      }
      setShowModal(false);
      fetchBranches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (b: Branch) => {
    const newStatus = b.status === 'active' ? 'inactive' : 'active';
    try {
      await adminAPI.updateBranch(b.id, { status: newStatus });
      toast.success(`Branch ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchBranches();
    } catch { toast.error('Failed to update status'); }
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create and manage bank branches customers can register under</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm self-start">
          <Plus size={16} /> Add Branch
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-primary-800">{branches.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Branches</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-emerald-700">{branches.filter(b => b.status === 'active').length}</p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-blue-700">{branches.reduce((s, b) => s + b.customer_count, 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Total Customers</p>
        </div>
      </div>

      {/* Branch cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : branches.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No branches yet</p>
          <p className="text-sm mt-1">Create your first branch so customers can register</p>
          <button onClick={openCreate} className="btn-primary mt-4 py-2 px-5 text-sm">Create Branch</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branches.map(b => (
            <div key={b.id} className={`card border-l-4 ${b.status === 'active' ? 'border-emerald-500' : 'border-gray-300 opacity-70'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{b.name}</h3>
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{b.code}</span>
                  </div>
                  <span className={`text-xs font-medium mt-1 inline-block ${b.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {b.status === 'active' ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={15} /></button>
                  <button onClick={() => toggleStatus(b)} className={`p-1.5 hover:bg-gray-100 rounded-lg ${b.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`} title={b.status === 'active' ? 'Deactivate' : 'Activate'}>
                    {b.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-start gap-2"><MapPin size={13} className="mt-0.5 text-gray-400 flex-shrink-0" /><span>{b.address}, {b.city}, {b.region}</span></div>
                {b.phone && <div className="flex items-center gap-2"><Phone size={13} className="text-gray-400" /><span>{b.phone}</span></div>}
                {b.email && <div className="flex items-center gap-2"><Mail size={13} className="text-gray-400" /><span>{b.email}</span></div>}
                {b.opening_hours && <div className="flex items-center gap-2"><Clock size={13} className="text-gray-400" /><span>{b.opening_hours}</span></div>}
              </div>

              <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users size={13} className="text-blue-400" />
                  <span><strong className="text-gray-700">{b.customer_count}</strong> customers</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CreditCard size={13} className="text-purple-400" />
                  <span><strong className="text-gray-700">{b.account_count}</strong> accounts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editing ? 'Edit Branch' : 'Create New Branch'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{editing ? 'Update branch details' : 'Add a new branch for customer registration'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Branch Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} className="input-field text-sm" placeholder="e.g. Tema Branch" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Branch Code *</label>
                  <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} className="input-field text-sm font-mono" placeholder="e.g. TEM001" disabled={!!editing} />
                  {!editing && <p className="text-xs text-gray-400 mt-0.5">Unique, cannot be changed</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field text-sm" placeholder="0302000000" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
                  <input value={form.address} onChange={e => set('address', e.target.value)} className="input-field text-sm" placeholder="e.g. Community 1, Tema" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} className="input-field text-sm" placeholder="e.g. Tema" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Region *</label>
                  <select value={form.region} onChange={e => set('region', e.target.value)} className="input-field text-sm">
                    <option value="">Select region</option>
                    {GHANA_REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ghana Post GPS</label>
                  <input value={form.digital_address} onChange={e => set('digital_address', e.target.value)} className="input-field text-sm" placeholder="GA-123-4567" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field text-sm" placeholder="branch@crestlinesolutions.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Opening Hours</label>
                  <input value={form.opening_hours} onChange={e => set('opening_hours', e.target.value)} className="input-field text-sm" placeholder="Mon-Fri: 8AM-5PM, Sat: 9AM-1PM" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editing ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
