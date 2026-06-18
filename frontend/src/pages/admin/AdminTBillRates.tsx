import { useState, useEffect } from 'react';
import { TrendingUp, Edit2, Plus, ToggleLeft, ToggleRight, X, Info } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface TBillRate {
  id: string;
  tenure_days: number;
  label: string;
  annual_rate: number;
  withholding_tax_rate: number;
  min_investment: number;
  is_active: boolean;
  effective_date: string | null;
  updated_at: string | null;
}

const emptyForm = {
  tenure_days: '',
  label: '',
  annual_rate: '',
  withholding_tax_rate: '8.0',
  min_investment: '100',
  is_active: true,
};

export default function AdminTBillRates() {
  const [rates, setRates] = useState<TBillRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TBillRate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRates(); }, []);

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getTBillRates();
      setRates(res.data.rates || []);
    } catch { toast.error('Failed to load rates'); }
    finally { setIsLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (r: TBillRate) => {
    setEditing(r);
    setForm({
      tenure_days: String(r.tenure_days),
      label: r.label,
      annual_rate: String(r.annual_rate),
      withholding_tax_rate: String(r.withholding_tax_rate),
      min_investment: String(r.min_investment),
      is_active: r.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.label || !form.annual_rate || (!editing && !form.tenure_days)) {
      toast.error('Label, tenure and rate are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label,
        annual_rate: parseFloat(form.annual_rate),
        withholding_tax_rate: parseFloat(form.withholding_tax_rate),
        min_investment: parseFloat(form.min_investment),
        is_active: form.is_active,
        ...(!editing && { tenure_days: parseInt(form.tenure_days) }),
      };
      if (editing) {
        await adminAPI.updateTBillRate(editing.id, payload);
        toast.success('Rate updated');
      } else {
        await adminAPI.createTBillRate(payload);
        toast.success('Rate created');
      }
      setShowModal(false);
      fetchRates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const toggleActive = async (r: TBillRate) => {
    try {
      await adminAPI.updateTBillRate(r.id, { is_active: !r.is_active });
      toast.success(r.is_active ? 'Rate deactivated' : 'Rate activated');
      fetchRates();
    } catch { toast.error('Failed to update'); }
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const netRate = (annual: string, wht: string) => {
    const a = parseFloat(annual) || 0;
    const w = parseFloat(wht) || 0;
    return (a * (1 - w / 100)).toFixed(3);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treasury Bill Rates</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage T-Bill rates published to customers</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm self-start">
          <Plus size={16} /> Add Rate
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
        <p>Changes take effect immediately. Customers will see updated rates the next time they open the Treasury Bills page. Existing active investments are not affected by rate changes.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : rates.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No rates configured</p>
          <p className="text-sm mt-1">Create at least one rate so customers can invest in Treasury Bills</p>
          <button onClick={openCreate} className="btn-primary mt-4 py-2 px-5 text-sm">Add First Rate</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Tenure</th>
                <th className="px-5 py-3 text-right">Annual Rate</th>
                <th className="px-5 py-3 text-right">WHT</th>
                <th className="px-5 py-3 text-right">Net Rate</th>
                <th className="px-5 py-3 text-right">Min. Investment</th>
                <th className="px-5 py-3 text-left">Effective Date</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rates.map(r => {
                const net = (r.annual_rate * (1 - r.withholding_tax_rate / 100)).toFixed(3);
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${!r.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <TrendingUp size={15} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{r.label}</p>
                          <p className="text-xs text-gray-400">{r.tenure_days} days</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600 text-base">{r.annual_rate}%</td>
                    <td className="px-5 py-4 text-right text-gray-500">{r.withholding_tax_rate}%</td>
                    <td className="px-5 py-4 text-right font-semibold text-primary-700">{net}%</td>
                    <td className="px-5 py-4 text-right text-gray-600">GHS {Number(r.min_investment).toLocaleString()}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{r.effective_date || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => toggleActive(r)} className={`p-1.5 hover:bg-gray-100 rounded-lg ${r.is_active ? 'text-emerald-600' : 'text-gray-400'}`} title={r.is_active ? 'Deactivate' : 'Activate'}>
                          {r.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editing ? 'Edit Rate' : 'Add New Rate'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editing ? `${editing.label} — changes live immediately` : 'New T-Bill tenure will appear to customers'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tenure (days) *</label>
                  <input
                    type="number"
                    value={form.tenure_days}
                    onChange={e => set('tenure_days', e.target.value)}
                    className="input-field text-sm"
                    placeholder="e.g. 91, 182, 364"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Cannot be changed after creation</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
                <input
                  value={form.label}
                  onChange={e => set('label', e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g. 91-Day Bill"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Annual Rate (%) *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.annual_rate}
                    onChange={e => set('annual_rate', e.target.value)}
                    className="input-field text-sm"
                    placeholder="e.g. 26.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">WHT Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.withholding_tax_rate}
                    onChange={e => set('withholding_tax_rate', e.target.value)}
                    className="input-field text-sm"
                    placeholder="8.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Investment (GHS)</label>
                <input
                  type="number"
                  step="1"
                  value={form.min_investment}
                  onChange={e => set('min_investment', e.target.value)}
                  className="input-field text-sm"
                  placeholder="100"
                />
              </div>

              {/* Net rate preview */}
              {form.annual_rate && form.withholding_tax_rate && (
                <div className="bg-emerald-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross rate</span>
                    <span className="font-semibold">{form.annual_rate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">WHT deduction</span>
                    <span className="text-red-500">-{(parseFloat(form.annual_rate || '0') * parseFloat(form.withholding_tax_rate || '0') / 100).toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700 border-t border-emerald-100 mt-1.5 pt-1.5">
                    <span>Net effective rate</span>
                    <span>{netRate(form.annual_rate, form.withholding_tax_rate)}%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Active (visible to customers)</label>
                <button
                  onClick={() => set('is_active', !form.is_active)}
                  className={`p-0.5 rounded-full transition-colors ${form.is_active ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  {form.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editing ? 'Update Rate' : 'Create Rate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
