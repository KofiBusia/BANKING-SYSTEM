import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, Banknote, FileText,
  User, LogOut, Shield, Users, BarChart3, Building2, X, ChevronRight, TrendingUp, Trophy, Award, Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clsx } from '../../utils/helpers';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const customerNav = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'My Accounts', icon: CreditCard, href: '/dashboard/accounts' },
  { label: 'Transactions', icon: ArrowLeftRight, href: '/dashboard/transactions' },
  { label: 'Transfer Money', icon: FileText, href: '/dashboard/transfer' },
  { label: 'Loans', icon: Banknote, href: '/dashboard/loans' },
  { label: 'Treasury Bills', icon: TrendingUp, href: '/dashboard/treasury-bills' },
  { label: 'KYC Verification', icon: Shield, href: '/dashboard/kyc' },
  { label: 'My Profile', icon: User, href: '/dashboard/profile' },
];

const adminNav = [
  { label: 'Admin Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Customers', icon: Users, href: '/admin/customers' },
  { label: 'KYC Review', icon: Shield, href: '/admin/kyc' },
  { label: 'Loan Management', icon: Banknote, href: '/admin/loans' },
  { label: 'Transactions', icon: ArrowLeftRight, href: '/admin/transactions' },
  { label: 'Branches', icon: Building2, href: '/admin/branches' },
  { label: 'Account Products', icon: CreditCard, href: '/admin/account-products' },
  { label: 'T-Bill Rates', icon: TrendingUp, href: '/admin/tbill-rates' },
  { label: 'Branch League', icon: Trophy, href: '/admin/branch-league' },
  { label: 'RM League', icon: Award, href: '/admin/rm-league' },
  { label: 'Staff Management', icon: Users, href: '/admin/staff' },
  { label: 'Reports', icon: BarChart3, href: '/admin/reports' },
  { label: 'Data Migration', icon: Database, href: '/admin/migration' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role && ['admin', 'super_admin', 'manager', 'teller'].includes(user.role);
  const navItems = isAdmin ? adminNav : customerNav;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-primary-900 text-white z-30 transform transition-transform duration-300 ease-in-out flex flex-col',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-primary-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-400 rounded-lg flex items-center justify-center">
              <Building2 size={20} className="text-primary-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Crestline</h1>
              <p className="text-xs text-blue-300 leading-tight">Solutions LTD</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-blue-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-primary-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.full_name}</p>
              <p className="text-xs text-blue-300 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && item.href !== '/admin' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                    isActive
                      ? 'bg-primary-700 text-white'
                      : 'text-blue-200 hover:bg-primary-800 hover:text-white'
                  )}
                >
                  <Icon size={18} className={isActive ? 'text-gold-400' : 'text-blue-400 group-hover:text-blue-200'} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="text-gold-400" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* KYC Status (customers only) */}
        {!isAdmin && user?.kyc_status !== 'verified' && (
          <div className="p-3 border-t border-primary-800">
            <div className="bg-amber-900/40 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-amber-300">KYC Progress</span>
                <span className="text-xs font-bold text-amber-300">{user?.kyc_completion}%</span>
              </div>
              <div className="w-full bg-primary-800 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${user?.kyc_completion || 0}%` }}
                />
              </div>
              <Link
                to="/dashboard/kyc"
                className="mt-2 text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1"
                onClick={onClose}
              >
                Complete KYC <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="p-3 border-t border-primary-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
