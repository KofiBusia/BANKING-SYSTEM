import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2 } from 'lucide-react';

export default function NotFound() {
  const { user } = useAuth();
  const home = user ? ((['admin', 'super_admin', 'manager'].includes(user.role)) ? '/admin' : '/dashboard') : '/login';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 size={28} className="text-white" />
        </div>
        <h1 className="text-6xl font-bold text-primary-900">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mt-2">Page Not Found</h2>
        <p className="text-gray-500 mt-2 text-sm">The page you are looking for does not exist or has been moved.</p>
        <Link to={home} className="btn-primary inline-block mt-6 px-8">
          Go to {user ? 'Dashboard' : 'Login'}
        </Link>
      </div>
    </div>
  );
}
