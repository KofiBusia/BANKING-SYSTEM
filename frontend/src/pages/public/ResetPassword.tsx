import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setIsLoading(true);
    try {
      await authAPI.resetPassword({ token, password, confirm_password: confirm });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center">
              <Building2 size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-primary-900">Crestline</span>
          </div>
        </div>
        <div className="card">
          {!done ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={28} className="text-primary-700" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
                <p className="text-gray-500 mt-2">Create a strong password for your account</p>
              </div>
              {!token ? (
                <div className="text-center text-red-600 py-4">Invalid or missing reset token. <Link to="/forgot-password" className="underline">Request a new link</Link></div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input type={show1 ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-10" placeholder="At least 8 characters" required />
                      <button type="button" onClick={() => setShow1(!show1)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{show1 ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input type={show2 ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field pr-10" placeholder="Repeat your password" required />
                      <button type="button" onClick={() => setShow2(!show2)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{show2 ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">{isLoading ? 'Resetting...' : 'Reset Password'}</button>
                </form>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Password Reset!</h2>
              <p className="text-gray-500 mt-2">Redirecting to login...</p>
            </div>
          )}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link to="/login" className="text-sm text-primary-700 font-medium hover:text-primary-800">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
