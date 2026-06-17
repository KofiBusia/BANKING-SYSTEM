import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Building2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import type { RegisterData } from '../../types';

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const { register, handleSubmit, watch, formState: { errors }, trigger } = useForm<RegisterData>();
  const password = watch('password', '');

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
    { label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const nextStep = async () => {
    const fields: (keyof RegisterData)[] = step === 1
      ? ['first_name', 'last_name', 'email', 'phone']
      : ['password', 'confirm_password'];
    const valid = await trigger(fields);
    if (valid) setStep(step + 1);
  };

  const onSubmit = async (data: RegisterData) => {
    if (data.password !== data.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await registerUser(data);
      toast.success('Account created! Please complete your KYC.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-primary-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-gold-400 rounded-full" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400 rounded-full" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gold-400 rounded-xl flex items-center justify-center">
              <Building2 size={22} className="text-primary-900" />
            </div>
            <span className="text-2xl font-bold text-white">GhanaBank</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight">Open Your Account Today</h2>
          <p className="text-blue-200 mt-4 text-lg">Join thousands of Ghanaians banking with confidence.</p>
        </div>
        <div className="relative space-y-4">
          {['Zero minimum balance to open', 'Instant account number', 'Mobile money integration', 'Loans up to GHS 500,000', '24/7 customer support'].map(f => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <span className="text-blue-100 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Building2 size={24} className="text-primary-900" />
            <span className="text-xl font-bold text-primary-900">GhanaBank</span>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {step > s ? <CheckCircle2 size={16} /> : s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-primary-900' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {step === 1 ? 'Personal Information' : step === 2 ? 'Set Password' : 'Ghana Card & Deposit'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1 ? 'Tell us about yourself' : step === 2 ? 'Create a secure password' : 'Add your Ghana Card number'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                    <input {...register('first_name', { required: 'First name required' })} className="input-field" placeholder="e.g. Kwame" />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                    <input {...register('last_name', { required: 'Last name required' })} className="input-field" placeholder="e.g. Mensah" />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Other Names</label>
                  <input {...register('other_names')} className="input-field" placeholder="Middle name (optional)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                  <input {...register('email', { required: 'Email required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })} type="email" className="input-field" placeholder="kwame@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                  <input {...register('phone', { required: 'Phone required', pattern: { value: /^(\+?233|0)[2-9]\d{8}$/, message: 'Enter valid Ghana number e.g. 0241234567' } })} type="tel" className="input-field" placeholder="0241234567 or +233241234567" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <button type="button" onClick={nextStep} className="btn-primary w-full py-3">Continue</button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                  <div className="relative">
                    <input {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })} type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="Create a strong password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 space-y-1">
                      {passwordRequirements.map(req => (
                        <div key={req.label} className={`flex items-center gap-1.5 text-xs ${req.test(password) ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {req.test(password) ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {req.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                  <div className="relative">
                    <input {...register('confirm_password', { required: 'Please confirm password', validate: v => v === password || 'Passwords do not match' })} type={showConfirm ? 'text' : 'password'} className="input-field pr-10" placeholder="Repeat your password" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">Back</button>
                  <button type="button" onClick={nextStep} className="btn-primary flex-1 py-3">Continue</button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghana Card Number</label>
                  <input
                    {...register('ghana_card_number', {
                      pattern: { value: /^GHA-\d{9}-\d$/, message: 'Format: GHA-123456789-0' }
                    })}
                    className="input-field"
                    placeholder="GHA-123456789-0"
                  />
                  {errors.ghana_card_number && <p className="text-red-500 text-xs mt-1">{errors.ghana_card_number.message}</p>}
                  <p className="text-xs text-gray-400 mt-1">Format: GHA-XXXXXXXXX-X (Optional but recommended)</p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex gap-2">
                    <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Basic Account Created</p>
                      <p className="text-xs text-amber-700 mt-1">After registration, you'll be prompted to complete your full KYC for higher limits, loans, and all features. You can still make deposits immediately!</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">Back</button>
                  <button type="submit" disabled={isLoading} className="btn-primary flex-1 py-3">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : 'Open My Account'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-700 font-semibold hover:text-primary-800">Sign in</Link>
          </p>

          <p className="mt-4 text-center text-xs text-gray-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
