import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';

// Public pages
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import NotFound from './pages/NotFound';

// Customer pages
import Dashboard from './pages/customer/Dashboard';
import Accounts from './pages/customer/Accounts';
import Transactions from './pages/customer/Transactions';
import Transfer from './pages/customer/Transfer';
import Loans from './pages/customer/Loans';
import KYC from './pages/customer/KYC';
import TreasuryBills from './pages/customer/TreasuryBills';
import Profile from './pages/customer/Profile';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminKYC from './pages/admin/AdminKYC';
import AdminLoans from './pages/admin/AdminLoans';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminStaff from './pages/admin/AdminStaff';
import AdminReports from './pages/admin/AdminReports';
import AdminBranchLeague from './pages/admin/AdminBranchLeague';
import AdminBranches from './pages/admin/AdminBranches';
import AdminRMLeague from './pages/admin/AdminRMLeague';
import AdminTBillRates from './pages/admin/AdminTBillRates';
import AdminAccountProducts from './pages/admin/AdminAccountProducts';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading Crestline...</p>
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'super_admin', 'manager', 'teller'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) {
    if (['admin', 'super_admin', 'manager'].includes(user.role)) return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Customer routes */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="loans" element={<Loans />} />
        <Route path="kyc" element={<KYC />} />
        <Route path="treasury-bills" element={<TreasuryBills />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="kyc" element={<AdminKYC />} />
        <Route path="loans" element={<AdminLoans />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="account-products" element={<AdminAccountProducts />} />
        <Route path="tbill-rates" element={<AdminTBillRates />} />
        <Route path="branch-league" element={<AdminBranchLeague />} />
        <Route path="branches" element={<AdminBranches />} />
        <Route path="rm-league" element={<AdminRMLeague />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', fontSize: '14px', fontWeight: '500' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
