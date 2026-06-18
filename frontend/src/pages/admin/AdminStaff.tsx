import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Plus, X } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ROLES = ['teller', 'manager', 'admin'];

export default function AdminStaff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => { load(); }, []);

  async function load() {
    setIsLoading(true);
    try {
      const res = await adminAPI.getStaff();
      setStaff(res.data.staff || []);
    } catch { toast.error('Failed to load staff'); }
    finally { setIsLoading(false); }
  }

  async function createStaff(data: any) {
    if (data.password !== data.confirm_password) { toast.error('Passwords do not match'); return; }
    setIsCreating(true);
    try {
      await adminAPI.createStaff(data);
      toast.success('Staff account created successfully');
      setShowModal(false);
      reset();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create staff');
    } finally { setIsCreating(false); }
  }

  const ROLE_COLORS: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-700',
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    teller: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage bank staff accounts and roles</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-900 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-xs">
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <span className="font-medium text-gray-800">{s.first_name} {s.last_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.email}</td>
                  <td className="px-4 py-3 text-gray-500">{s.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[s.role] || 'bg-gray-100 text-gray-600'}`}>
                      {s.role?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${s.account_status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                      {s.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{s.last_login ? new Date(s.last_login).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && (
            <div className="text-center py-10">
              <Users size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">No staff members found</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary-900">Add Staff Member</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit(createStaff)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input {...register('first_name', { required: true })} className="input-field" placeholder="First name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input {...register('last_name', { required: true })} className="input-field" placeholder="Last name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input {...register('email', { required: true })} type="email" className="input-field" placeholder="staff@ghanabank.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input {...register('phone', { required: true })} className="input-field" placeholder="0XX XXX XXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select {...register('role', { required: true })} className="input-field">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input {...register('password', { required: true, minLength: 8 })} type="password" className="input-field" placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input {...register('confirm_password', { required: true })} type="password" className="input-field" placeholder="Repeat password" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isCreating} className="btn-primary flex-1">{isCreating ? 'Creating...' : 'Create Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
