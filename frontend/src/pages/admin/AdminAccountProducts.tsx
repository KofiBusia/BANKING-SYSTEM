import { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  code: string;
  account_type: string;
  description: string | null;
  features: string[];
  interest_rate: number;
  min_balance: number;
  min_opening_deposit: number;
  monthly_fee: number;
  overdraft_enabled: boolean;
  overdraft_limit: number;
  kyc_required: string;
  is_active: boolean;
  sort_order: number;
  account_count: number;
}

const ACCOUNT_TYPES = ['savings', 'current', 'fixed_deposit', 'student', 'business', 'susu'];
const KYC_LEVELS = ['basic', 'pending', 'verified'];

const TYPE_COLORS: Record<string, string> = {
  savings: 'bg-emerald-100 text-emerald-700',
  current: 'bg-blue-100 text-blue-700',
  fixed_deposit: 'bg-purple-100 text-purple-700',
  student: 'bg-yellow-100 text-yellow-700',
  business: 'bg-orange-100 text-orange-700',
  susu: 'bg-pink-100 text-pink-700',
};

const emptyForm = {
  name: '', code: '', account_type: 'savings', description: '',
  features: '', interest_rate: '0', min_balance: '0',
  min_opening_deposit: '0', monthly_fee: '0', overdraft_enabled: false,
  overdraft_limit: '0', kyc_required: 'basic', is_active: true, sort_order: '0',
};

export default function AdminAccountProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getAccountProducts();
      setProducts(res.data.products || []);
    } catch { toast.error('Failed to load products'); }
    finally { setIsLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, code: p.code, account_type: p.account_type,
      description: p.description || '', features: p.features.join('\n'),
      interest_rate: String(p.interest_rate), min_balance: String(p.min_balance),
      min_opening_deposit: String(p.min_opening_deposit), monthly_fee: String(p.monthly_fee),
      overdraft_enabled: p.overdraft_enabled, overdraft_limit: String(p.overdraft_limit),
      kyc_required: p.kyc_required, is_active: p.is_active, sort_order: String(p.sort_order),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.account_type || (!editing && !form.code)) {
      toast.error('Name, code and account type are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        account_type: form.account_type,
        description: form.description,
        features: form.features.split('\n').filter(Boolean),
        interest_rate: parseFloat(form.interest_rate) || 0,
        min_balance: parseFloat(form.min_balance) || 0,
        min_opening_deposit: parseFloat(form.min_opening_deposit) || 0,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        overdraft_enabled: form.overdraft_enabled,
        overdraft_limit: parseFloat(form.overdraft_limit) || 0,
        kyc_required: form.kyc_required,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
        ...(!editing && { code: form.code }),
      };
      if (editing) {
        await adminAPI.updateAccountProduct(editing.id, payload);
        toast.success('Product updated');
      } else {
        await adminAPI.createAccountProduct(payload);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const toggleActive = async (p: Product) => {
    try {
      await adminAPI.updateAccountProduct(p.id, { is_active: !p.is_active });
      toast.success(p.is_active ? 'Product deactivated' : 'Product activated');
      fetchProducts();
    } catch { toast.error('Failed to update'); }
  };

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">Define the account types customers can choose at registration</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm self-start">
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-primary-800">{products.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Products</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-emerald-700">{products.filter(p => p.is_active).length}</p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-blue-700">{products.reduce((s, p) => s + (p.account_count || 0), 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Accounts Opened</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No products yet</p>
          <p className="text-sm mt-1">Create account products for customers to choose from</p>
          <button onClick={openCreate} className="btn-primary mt-4 py-2 px-5 text-sm">Create First Product</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.id} className={`card border-l-4 ${p.is_active ? 'border-primary-600' : 'border-gray-300 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[p.account_type] || 'bg-gray-100 text-gray-600'}`}>
                      {p.account_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{p.code}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={14} /></button>
                  <button onClick={() => toggleActive(p)} className={`p-1.5 hover:bg-gray-100 rounded-lg ${p.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>

              {p.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description}</p>}

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Interest</span>
                  <span className="font-semibold text-emerald-600">{p.interest_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Min. Balance</span>
                  <span className="font-medium">GHS {p.min_balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Opening Dep.</span>
                  <span className="font-medium">GHS {p.min_opening_deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly Fee</span>
                  <span className="font-medium">{p.monthly_fee > 0 ? `GHS ${p.monthly_fee}` : 'Free'}</span>
                </div>
              </div>

              {p.features.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {p.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Check size={11} className="text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {p.features.length > 3 && <li className="text-xs text-gray-400 pl-4">+{p.features.length - 3} more</li>}
                </ul>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span>KYC: <strong className="text-gray-700 capitalize">{p.kyc_required}</strong></span>
                {p.overdraft_enabled && <span>Overdraft: <strong className="text-gray-700">GHS {p.overdraft_limit.toLocaleString()}</strong></span>}
                <span><strong className="text-gray-700">{p.account_count}</strong> accounts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">{editing ? 'Edit Product' : 'Create Account Product'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editing ? editing.name : 'New product customers can select at registration'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className="input-field text-sm" placeholder="e.g. GhanaBank Savings Account" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!editing && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
                    <input value={form.code} onChange={e => set('code', e.target.value.toLowerCase().replace(/\s/g, '_'))} className="input-field text-sm font-mono" placeholder="savings_basic" />
                  </div>
                )}
                <div className={editing ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Account Type *</label>
                  <select value={form.account_type} onChange={e => set('account_type', e.target.value)} className="input-field text-sm" disabled={!!editing}>
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input-field text-sm" rows={2} placeholder="Short marketing description shown to customers" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Features (one per line)</label>
                <textarea value={form.features} onChange={e => set('features', e.target.value)} className="input-field text-sm font-mono" rows={4} placeholder={'Free ATM withdrawals\nMobile banking access\nInterest paid quarterly'} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Interest Rate (%)</label>
                  <input type="number" step="0.001" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Fee (GHS)</label>
                  <input type="number" step="0.01" value={form.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min. Balance (GHS)</label>
                  <input type="number" step="0.01" value={form.min_balance} onChange={e => set('min_balance', e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Opening Deposit (GHS)</label>
                  <input type="number" step="0.01" value={form.min_opening_deposit} onChange={e => set('min_opening_deposit', e.target.value)} className="input-field text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">KYC Required</label>
                  <select value={form.kyc_required} onChange={e => set('kyc_required', e.target.value)} className="input-field text-sm">
                    {KYC_LEVELS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} className="input-field text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Overdraft facility</span>
                  <button onClick={() => set('overdraft_enabled', !form.overdraft_enabled)} className={`${form.overdraft_enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {form.overdraft_enabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                  </button>
                </div>
                {form.overdraft_enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Overdraft Limit (GHS)</label>
                    <input type="number" step="0.01" value={form.overdraft_limit} onChange={e => set('overdraft_limit', e.target.value)} className="input-field text-sm" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Active (visible to customers)</span>
                  <button onClick={() => set('is_active', !form.is_active)} className={`${form.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {form.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
