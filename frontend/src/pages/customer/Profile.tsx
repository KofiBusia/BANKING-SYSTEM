import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { getKYCStatusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'pin'>('info');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pwForm = useForm<{ current_password: string; new_password: string; confirm_password: string }>();
  const pinForm = useForm<{ pin: string; confirm_pin: string }>();

  async function changePassword(data: any) {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.changePassword({ current_password: data.current_password, new_password: data.new_password });
      toast.success('Password changed successfully');
      pwForm.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  }

  async function setPin(data: any) {
    if (data.pin !== data.confirm_pin) {
      toast.error('PINs do not match');
      return;
    }
    if (data.pin.length !== 4 || !/^\d{4}$/.test(data.pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.setPin({ pin: data.pin, current_pin: data.current_pin });
      toast.success('Transaction PIN set successfully');
      pinForm.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set PIN');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account settings and security</p>
      </div>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-primary-900 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.full_name}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getKYCStatusColor(user?.kyc_status || '')}`}>
                KYC: {user?.kyc_status?.toUpperCase()}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {user?.kyc_status !== 'verified' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
            <p className="text-sm text-amber-700">Complete KYC to unlock all features</p>
            <Link to="/dashboard/kyc" className="text-xs font-semibold text-amber-700 hover:text-amber-800">Complete Now →</Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'info', label: 'Account Info', icon: User },
          { id: 'password', label: 'Change Password', icon: Lock },
          { id: 'pin', label: 'Transaction PIN', icon: Shield },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-900 text-primary-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={15} />{tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'info' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'First Name', value: user?.first_name },
              { label: 'Last Name', value: user?.last_name },
              { label: 'Email Address', value: user?.email },
              { label: 'Phone Number', value: user?.phone },
              { label: 'Ghana Card', value: user?.ghana_card_number || 'Not provided' },
              { label: 'Account Status', value: user?.account_status },
              { label: 'KYC Status', value: user?.kyc_status },
              { label: 'KYC Completion', value: `${user?.kyc_completion || 0}%` },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="font-medium text-gray-800 mt-0.5 capitalize">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">To update personal information, please visit a branch or contact support.</p>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Change Password</h3>
          <form onSubmit={pwForm.handleSubmit(changePassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  {...pwForm.register('current_password', { required: true })}
                  type={showCurrentPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  {...pwForm.register('new_password', { required: true, minLength: 8 })}
                  type={showNewPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                {...pwForm.register('confirm_password', { required: true })}
                type="password"
                className="input-field"
                placeholder="Repeat new password"
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'pin' && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-700 mb-1">Transaction PIN</h3>
          <p className="text-sm text-gray-500 mb-4">Your 4-digit PIN is required to authorise withdrawals and transfers.</p>
          <form onSubmit={pinForm.handleSubmit(setPin)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (4 digits)</label>
              <div className="relative">
                <input
                  {...pinForm.register('pin', { required: true })}
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  className="input-field pr-10 tracking-widest text-center text-xl"
                  placeholder="••••"
                />
                <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
              <input
                {...pinForm.register('confirm_pin', { required: true })}
                type="password"
                maxLength={4}
                className="input-field tracking-widest text-center text-xl"
                placeholder="••••"
              />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">Never share your PIN with anyone. Bank staff will never ask for your PIN.</p>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Saving...' : 'Set Transaction PIN'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
