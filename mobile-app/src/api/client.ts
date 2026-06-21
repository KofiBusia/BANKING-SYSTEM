import { Preferences } from '@capacitor/preferences';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiError {
  success: false;
  message: string;
  status: number;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  kyc_status: 'basic' | 'pending' | 'verified';
  kyc_completion: number;
  account_status: string;
  unread_notifications?: number;
}

export interface Account {
  id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  balance: number;
  available_balance: number;
  currency: string;
  status: string;
  created_at: string;
  last_transaction_date?: string;
}

export interface Transaction {
  id: string;
  reference: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  balance_after?: number;
}

class ApiClient {
  private async getHeaders(auth = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (auth) {
      const { value } = await Preferences.get({ key: 'gb_token' });
      if (value) headers['Authorization'] = `Bearer ${value}`;
    }
    return headers;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const { value: refresh } = await Preferences.get({ key: 'gb_refresh_token' });
      if (!refresh) return false;

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refresh}`,
        },
      });

      if (!res.ok) return false;
      const data = await res.json();
      if (data.access_token) {
        await Preferences.set({ key: 'gb_token', value: data.access_token });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    auth = true,
    retry = true,
  ): Promise<T> {
    const headers = await this.getHeaders(auth);
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401 && retry) {
      const refreshed = await this.refreshToken();
      if (refreshed) return this.request<T>(path, options, auth, false);
      await this.clearTokens();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw { success: false, message: 'Session expired. Please log in again.', status: 401 };
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      // Non-JSON response — backend may be cold-starting on Render
      throw {
        success: false,
        message: res.ok
          ? '__cold_start__'
          : 'Server error. Please try again.',
        status: res.status,
      };
    }

    if (!res.ok) {
      throw { success: false, message: data.message || 'An error occurred', status: res.status };
    }

    return data as T;
  }

  private async clearTokens() {
    await Preferences.remove({ key: 'gb_token' });
    await Preferences.remove({ key: 'gb_refresh_token' });
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    return this.request<{
      success: boolean;
      access_token: string;
      refresh_token: string;
      user: User;
      accounts: Account[];
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
  }

  async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    ghana_card_number?: string;
    branch_id?: string;
    product_id?: string;
  }) {
    return this.request<{
      success: boolean;
      access_token: string;
      refresh_token: string;
      user: User;
      account: Account;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  }

  async getMe() {
    return this.request<{
      success: boolean;
      user: User;
      accounts: Account[];
      unread_notifications: number;
    }>('/auth/me');
  }

  async getBranches() {
    return this.request<{
      success: boolean;
      branches: Array<{ id: string; name: string; city: string; region: string }>;
    }>('/auth/branches', {}, false);
  }

  async getAccountProducts() {
    return this.request<{
      success: boolean;
      products: Array<{ id: string; name: string; account_type: string; description?: string; min_balance: number }>;
    }>('/auth/account-products', {}, false);
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────
  async getKycStatus() {
    return this.request<{
      success: boolean;
      kyc_status: string;
      kyc_completion: number;
      kyc_info: Record<string, unknown>;
      documents: unknown[];
      missing_items: string[];
    }>('/kyc/status');
  }

  async updateKycPersonal(data: {
    gender?: string;
    date_of_birth?: string;
    place_of_birth?: string;
    nationality?: string;
    marital_status?: string;
    ghana_card_number?: string;
  }) {
    return this.request<{ success: boolean; message: string }>('/kyc/personal', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Accounts ─────────────────────────────────────────────────────────────
  async getAccounts() {
    return this.request<{ success: boolean; accounts: Account[] }>('/accounts/');
  }

  // ─── Transactions ─────────────────────────────────────────────────────────
  async getTransactions(params: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    page?: number;
    per_page?: number;
  } = {}) {
    const q = new URLSearchParams();
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    if (params.account_id) q.set('account_id', params.account_id);
    q.set('page', String(params.page ?? 1));
    q.set('per_page', String(params.per_page ?? 50));

    return this.request<{
      success: boolean;
      transactions: Transaction[];
      pagination: { total: number; page: number; pages: number };
    }>(`/transactions/?${q.toString()}`);
  }

  // ─── Notifications ────────────────────────────────────────────────────────
  async getUnreadCount() {
    return this.request<{ success: boolean; count: number }>('/notifications/unread-count');
  }

  // ─── Tokens ──────────────────────────────────────────────────────────────
  async saveTokens(access: string, refresh: string) {
    await Preferences.set({ key: 'gb_token', value: access });
    await Preferences.set({ key: 'gb_refresh_token', value: refresh });
  }

  async getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: 'gb_token' });
    return value;
  }

  async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: 'gb_refresh_token' });
    return value;
  }

  async logout() {
    await Preferences.remove({ key: 'gb_token' });
    await Preferences.remove({ key: 'gb_refresh_token' });
    await Preferences.remove({ key: 'gb_user' });
    await Preferences.remove({ key: 'gb_accounts' });
  }
}

export const api = new ApiClient();
