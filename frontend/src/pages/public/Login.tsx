import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Building2, Lock, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gold-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gold-400 rounded-xl flex items-center justify-center">
              <Building2 size={22} className="text-primary-900" />
            </div>
            <span className="text-2xl font-bold text-white">Crestline</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            Your Trusted<br />Financial Partner
          </h2>
          <p className="text-blue-200 mt-4 text-lg leading-relaxed">
            Experience world-class banking built for the people of Ghana. Secure, fast, and always available.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { label: 'Customers', value: '50,000+' },
            { label: 'Transactions Daily', value: '10,000+' },
            { label: 'Uptime', value: '99.9%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-blue-200 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-primary-900 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-primary-900">Crestline</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or Phone</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('email', { required: 'Email or phone is required' })}
                  type="text"
                  placeholder="Enter email or phone number"
                  className="input-field pl-10"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-sm text-primary-700 hover:text-primary-800 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-700 hover:text-primary-800 font-semibold">
                Open an account
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Regulated by the Bank of Ghana | NDIC Insured
          </p>
        </div>
      </div>
    </div>
  );
}
