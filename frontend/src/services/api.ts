import axios from 'axios';

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('gb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.error === 'token_expired') {
      try {
        const refreshToken = localStorage.getItem('gb_refresh_token');
        if (refreshToken) {
          const res = await axios.post('/api/auth/refresh', {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          });
          const newToken = res.data.access_token;
          localStorage.setItem('gb_token', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return API.request(error.config);
        }
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;

// Auth
export const authAPI = {
  register: (data: object) => API.post('/auth/register', data),
  login: (data: object) => API.post('/auth/login', data),
  logout: () => { localStorage.clear(); },
  getMe: () => API.get('/auth/me'),
  forgotPassword: (email: string) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data: object) => API.post('/auth/reset-password', data),
  changePassword: (data: object) => API.post('/auth/change-password', data),
  setPin: (data: object) => API.post('/auth/set-pin', data),
  verifyPin: (pin: string) => API.post('/auth/verify-pin', { pin }),
};

// Accounts
export const accountsAPI = {
  getAll: () => API.get('/accounts/'),
  getOne: (id: string) => API.get(`/accounts/${id}`),
  open: (data: object) => API.post('/accounts/open', data),
  lookup: (account_number: string) => API.post('/accounts/lookup', { account_number }),
  getStatement: (id: string, params?: object) => API.get(`/accounts/${id}/statement`, { params }),
};

// Transactions
export const transactionsAPI = {
  getAll: (params?: object) => API.get('/transactions/', { params }),
  deposit: (data: object) => API.post('/transactions/deposit', data),
  withdraw: (data: object) => API.post('/transactions/withdraw', data),
  transfer: (data: object) => API.post('/transactions/transfer', data),
  interbankTransfer: (data: object) => API.post('/transactions/interbank-transfer', data),
  mobileMoneyOut: (data: object) => API.post('/transactions/mobile-money-send', data),
  mobileMoney: (data: object) => API.post('/transactions/mobile-money', data),
};

// KYC
export const kycAPI = {
  getStatus: () => API.get('/kyc/status'),
  updatePersonal: (data: object) => API.put('/kyc/personal', data),
  updateAddress: (data: object) => API.put('/kyc/address', data),
  updateEmployment: (data: object) => API.put('/kyc/employment', data),
  updateNextOfKin: (data: object) => API.put('/kyc/next-of-kin', data),
  uploadDocument: (formData: FormData) => API.post('/kyc/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submit: () => API.post('/kyc/submit'),
};

// Loans
export const loansAPI = {
  checkEligibility: () => API.get('/loans/eligibility'),
  calculate: (data: object) => API.post('/loans/calculate', data),
  apply: (data: object) => API.post('/loans/apply', data),
  getAll: (params?: object) => API.get('/loans/', { params }),
  getOne: (id: string) => API.get(`/loans/${id}`),
  repay: (loanId: string, data: object) => API.post(`/loans/${loanId}/repay`, data),
};

// Notifications
export const notificationsAPI = {
  getAll: (params?: object) => API.get('/notifications/', { params }),
  markRead: (ids?: string[]) => API.post('/notifications/mark-read', { ids: ids || [] }),
  getUnreadCount: () => API.get('/notifications/unread-count'),
};

// Treasury Bills
export const treasuryBillsAPI = {
  getRates: () => API.get('/treasury-bills/rates'),
  calculate: (data: object) => API.post('/treasury-bills/calculate', data),
  invest: (data: object) => API.post('/treasury-bills/invest', data),
  getAll: (params?: object) => API.get('/treasury-bills/', { params }),
  getOne: (id: string) => API.get(`/treasury-bills/${id}`),
  rollover: (id: string, data: object) => API.post(`/treasury-bills/${id}/rollover`, data),
};

// Admin
export const adminAPI = {
  getDashboard: () => API.get('/admin/dashboard'),
  getCustomers: (params?: object) => API.get('/admin/customers', { params }),
  getCustomer: (id: string) => API.get(`/admin/customers/${id}`),
  updateCustomerStatus: (id: string, data: object) => API.put(`/admin/customers/${id}/status`, data),
  getPendingKYC: (params?: object) => API.get('/admin/kyc/pending', { params }),
  reviewKYC: (customerId: string, data: object) => API.post(`/admin/kyc/${customerId}/review`, data),
  getAllLoans: (params?: object) => API.get('/admin/loans', { params }),
  processLoan: (loanId: string, data: object) => API.post(`/admin/loans/${loanId}/process`, data),
  getStaff: () => API.get('/admin/staff'),
  createStaff: (data: object) => API.post('/admin/staff', data),
  getReports: (params?: object) => API.get('/admin/reports/summary', { params }),
  depositForCustomer: (data: object) => API.post('/admin/deposit-for-customer', data),
  getBranchLeague: (period?: string) => API.get('/admin/branch-league', { params: { period } }),
  getBranches: () => API.get('/admin/branches'),
  createBranch: (data: object) => API.post('/admin/branches', data),
  updateBranch: (id: string, data: object) => API.put(`/admin/branches/${id}`, data),
  assignRM: (data: object) => API.post('/admin/rm/assign', data),
  getRMLeague: (params?: object) => API.get('/admin/rm/league', { params }),
  getTBillRates: () => API.get('/admin/tbill-rates'),
  createTBillRate: (data: object) => API.post('/admin/tbill-rates', data),
  updateTBillRate: (id: string, data: object) => API.put(`/admin/tbill-rates/${id}`, data),
  getAccountProducts: () => API.get('/admin/account-products'),
  createAccountProduct: (data: object) => API.post('/admin/account-products', data),
  updateAccountProduct: (id: string, data: object) => API.put(`/admin/account-products/${id}`, data),
};

export const publicAPI = {
  getBranches: () => API.get('/auth/branches'),
  getAccountProducts: () => API.get('/auth/account-products'),
};

// Migration
export const migrationAPI = {
  getTemplates: () => API.get('/migration/templates'),
  downloadTemplate: (type: string) => API.get(`/migration/template/${type}/download`, { responseType: 'blob' }),
  importData: (type: string, file: File) => {
    const fd = new FormData();
    fd.append('type', type);
    fd.append('file', file);
    return API.post('/migration/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getHistory: (params?: object) => API.get('/migration/history', { params }),
  getHistoryDetail: (id: string) => API.get(`/migration/history/${id}`),
};
