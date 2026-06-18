import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { adminAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';

export default function AdminReports() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminAPI.getDashboard();
        setData(res.data);
      } catch {}
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  if (isLoading) return (
    <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-900 border-t-transparent rounded-full animate-spin" /></div>
  );

  const stats = data?.stats || {};
  const monthlyTrend = data?.monthly_trend || [];

  const summaryCards = [
    { label: 'Total Customers', value: stats.total_customers || 0, format: 'number', color: 'text-blue-600' },
    { label: 'Active Accounts', value: stats.active_accounts || 0, format: 'number', color: 'text-green-600' },
    { label: 'Total Deposits', value: stats.total_deposits || 0, format: 'currency', color: 'text-emerald-600' },
    { label: 'Total Withdrawals', value: stats.total_withdrawals || 0, format: 'currency', color: 'text-red-500' },
    { label: 'Active Loans', value: stats.active_loans || 0, format: 'number', color: 'text-purple-600' },
    { label: 'Loan Portfolio', value: stats.total_loan_amount || 0, format: 'currency', color: 'text-primary-700' },
    { label: 'Pending KYC', value: stats.pending_kyc || 0, format: 'number', color: 'text-amber-600' },
    { label: 'Verified Customers', value: stats.verified_customers || 0, format: 'number', color: 'text-teal-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of bank performance metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <div key={card.label} className="card p-5">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>
              {card.format === 'currency' ? formatCurrency(card.value) : card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {monthlyTrend.length > 0 && (
        <>
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Monthly Transaction Volume</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₵${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="deposits" name="Deposits" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">New Customers Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="new_customers" name="New Customers" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, fill: '#2563eb' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
