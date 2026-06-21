import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { api } from './api/client';
import { store } from './store';
import type { Account, Transaction } from './api/client';

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL || '';

// ─── Utility helpers ─────────────────────────────────────────────────────────

function $<T extends HTMLElement = HTMLElement>(sel: string, ctx: Document | HTMLElement = document): T | null {
  return ctx.querySelector<T>(sel);
}

function $$(sel: string, ctx: Document | HTMLElement = document): HTMLElement[] {
  return Array.from(ctx.querySelectorAll(sel));
}

export function toast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  const container = document.getElementById('toast-container')!;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

export function setLoading(show: boolean) {
  const overlay = document.getElementById('overlay')!;
  overlay.classList.toggle('hidden', !show);
}

export function setNavVisible(show: boolean, activeRoute?: string) {
  const nav = document.getElementById('bottom-nav')!;
  nav.classList.toggle('hidden', !show);
  if (activeRoute) {
    $$('.nav-item', nav).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === activeRoute);
    });
  }
}

function formatCurrency(amount: number, currency = 'GHS'): string {
  return `${currency} ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function groupByDate(txns: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = t.created_at.split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}

function dateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = daysAgo(1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'short' });
}

function txTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Cash Deposit',
    withdrawal: 'Cash Withdrawal',
    transfer_in: 'Transfer Received',
    transfer_out: 'Transfer Sent',
    mobile_money_in: 'Mobile Money In',
    mobile_money_out: 'Mobile Money Out',
    interbank_out: 'Interbank Transfer',
    loan_repayment: 'Loan Repayment',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function isCredit(type: string): boolean {
  return ['deposit', 'transfer_in', 'mobile_money_in'].includes(type);
}

function txIconSvg(type: string): string {
  if (isCredit(type)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>`;
  }
  if (type === 'withdrawal') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>`;
  }
  if (type.includes('transfer')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>`;
  }
  if (type.includes('mobile')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`;
}

function maskAccountNumber(num: string): string {
  if (!num || num.length < 6) return num;
  const visible = num.slice(-4);
  const masked = '•'.repeat(num.length - 4);
  return `${masked.match(/.{1,4}/g)?.join(' ')} ${visible}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

type ScreenName = 'login' | 'register' | 'kyc-personal' | 'kyc-redirect' | 'dashboard' | 'transactions';

const screenEl = () => document.getElementById('screen')!;

let currentScreen: ScreenName | null = null;
let cleanupFn: (() => void) | null = null;

export async function navigate(name: ScreenName, params?: Record<string, unknown>) {
  if (cleanupFn) { cleanupFn(); cleanupFn = null; }

  const el = screenEl();
  el.innerHTML = '';
  el.classList.remove('screen-enter');

  try {
    await screenRenderers[name](el, params ?? {});
  } catch (e) {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100%;padding:40px 24px;text-align:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5" width="48" height="48" style="margin-bottom:16px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style="font-size:16px;font-weight:700;color:#374151;margin-bottom:8px;">Something went wrong</div>
        <div style="font-size:14px;color:#9CA3AF;margin-bottom:24px;">Could not load this screen. Check your connection and try again.</div>
        <button onclick="location.reload()" style="padding:12px 28px;background:#1B3A6B;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">Reload App</button>
      </div>`;
    throw e;
  }

  requestAnimationFrame(() => el.classList.add('screen-enter'));
  currentScreen = name;
}

// ─── Screens ──────────────────────────────────────────────────────────────────

const screenRenderers: Record<ScreenName, (el: HTMLElement, params: Record<string, unknown>) => Promise<void>> = {
  login: renderLogin,
  register: renderRegister,
  'kyc-personal': renderKycPersonal,
  'kyc-redirect': renderKycRedirect,
  dashboard: renderDashboard,
  transactions: renderTransactions,
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
async function renderLogin(el: HTMLElement) {
  setNavVisible(false);
  el.innerHTML = `
    <div class="auth-screen">
      <div class="auth-hero">
        <div class="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
          </svg>
        </div>
        <div>
          <div class="auth-hero-title">Crestline Capital</div>
          <div class="auth-hero-sub">Your trusted financial partner</div>
        </div>
      </div>

      <div class="auth-body">
        <div class="auth-form" id="login-form">
          <div class="form-group">
            <label class="form-label">Email or Phone</label>
            <div class="form-input-wrap has-icon">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input id="login-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="you@email.com" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="form-input-wrap has-icon">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input id="login-password" type="password" autocomplete="current-password" class="form-input" placeholder="••••••••" style="padding-right:50px" />
              <button class="input-action" id="toggle-password" type="button" aria-label="Show password">
                <svg id="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button id="login-btn" class="btn btn-primary" style="margin-top:4px">Sign In</button>
          <div class="text-center" style="margin-top:4px">
            <span class="auth-link" id="forgot-link" style="font-size:14px">Forgot password?</span>
          </div>
        </div>

        <div class="divider"><span>New to Crestline?</span></div>

        <button id="register-link" class="btn btn-outline">Create Account</button>
      </div>

      <div class="auth-footer pb-safe">
        By continuing, you agree to our <span class="auth-link">Terms of Service</span>
      </div>
    </div>
  `;

  const emailEl = $<HTMLInputElement>('#login-email', el)!;
  const passEl = $<HTMLInputElement>('#login-password', el)!;
  const btn = $<HTMLButtonElement>('#login-btn', el)!;

  // Toggle password visibility
  $('#toggle-password', el)!.addEventListener('click', () => {
    const isPass = passEl.type === 'password';
    passEl.type = isPass ? 'text' : 'password';
    const icon = $('#eye-icon', el)!;
    icon.innerHTML = isPass
      ? `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  // Forgot password → open webapp
  $('#forgot-link', el)!.addEventListener('click', () => openWebapp('/forgot-password'));

  // Register
  $('#register-link', el)!.addEventListener('click', () => navigate('register'));

  // Login submit
  const doLogin = async () => {
    const email = emailEl.value.trim();
    const password = passEl.value;
    if (!email || !password) { toast('Please fill in all fields', 'error'); return; }

    btn.disabled = true;
    btn.classList.add('btn-loading');
    try {
      const res = await api.login(email, password);
      if (!res.access_token || !res.user) {
        throw { message: 'Login failed. Please check your connection and try again.' };
      }
      await api.saveTokens(res.access_token, res.refresh_token);
      await store.setUser(res.user);
      await store.setAccounts(res.accounts ?? []);
      await navigate('dashboard');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || 'Login failed. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  };

  btn.addEventListener('click', doLogin);
  passEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
async function renderRegister(el: HTMLElement) {
  setNavVisible(false);

  let branches: Array<{ id: string; name: string; city: string }> = [];
  let products: Array<{ id: string; name: string; account_type: string }> = [];

  try {
    const [bRes, pRes] = await Promise.all([api.getBranches(), api.getAccountProducts()]);
    branches = bRes.branches;
    products = pRes.products;
  } catch { /* non-critical */ }

  el.innerHTML = `
    <div class="auth-screen">
      <div class="screen-header">
        <button class="header-btn" id="back-btn" aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="header-title">Create Account</div>
      </div>

      <div style="padding:24px 20px;display:flex;flex-direction:column;gap:18px;overflow-y:auto;padding-bottom:40px">
        <div class="step-dots" style="justify-content:flex-start;margin-bottom:4px">
          <div class="step-dot active"></div>
          <div class="step-dot"></div>
          <div class="step-dot"></div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px">Personal Details</div>
          <div style="font-size:14px;color:var(--text-secondary);margin-top:4px">Let's get you started</div>
        </div>

        <div style="display:flex;gap:12px">
          <div class="form-group" style="flex:1">
            <label class="form-label">First Name</label>
            <input id="reg-fname" type="text" autocomplete="given-name" class="form-input" placeholder="Kwame" />
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Last Name</label>
            <input id="reg-lname" type="text" autocomplete="family-name" class="form-input" placeholder="Mensah" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email Address</label>
          <div class="form-input-wrap has-icon">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <input id="reg-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="you@email.com" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <div class="form-input-wrap has-icon">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.41-.41a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            <input id="reg-phone" type="tel" inputmode="tel" autocomplete="tel" class="form-input" placeholder="024XXXXXXX" />
          </div>
          <div class="form-hint">Ghana format: 024XXXXXXX or +233XXXXXXXXX</div>
        </div>

        <div class="form-group">
          <label class="form-label">Ghana Card Number <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
          <input id="reg-ghana-card" type="text" autocomplete="off" class="form-input" placeholder="GHA-000000000-0" />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="reg-password" type="password" autocomplete="new-password" class="form-input" placeholder="Min. 8 characters" />
          <div class="form-hint">Must include uppercase, number, and special character</div>
        </div>

        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input id="reg-confirm" type="password" autocomplete="new-password" class="form-input" placeholder="Repeat password" />
        </div>

        ${products.length ? `
        <div class="form-group">
          <label class="form-label">Account Type</label>
          <select id="reg-product" class="form-input">
            <option value="">Select account type</option>
            ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>` : ''}

        ${branches.length ? `
        <div class="form-group">
          <label class="form-label">Preferred Branch <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
          <select id="reg-branch" class="form-input">
            <option value="">Select branch</option>
            ${branches.map(b => `<option value="${b.id}">${b.name} — ${b.city}</option>`).join('')}
          </select>
        </div>` : ''}

        <button id="reg-btn" class="btn btn-primary" style="margin-top:8px">Create Account</button>

        <div class="auth-footer">
          Already have an account? <span class="auth-link" id="login-link">Sign in</span>
        </div>
      </div>
    </div>
  `;

  $('#back-btn', el)!.addEventListener('click', () => navigate('login'));
  $('#login-link', el)!.addEventListener('click', () => navigate('login'));

  const btn = $<HTMLButtonElement>('#reg-btn', el)!;
  btn.addEventListener('click', async () => {
    const fname = $<HTMLInputElement>('#reg-fname', el)!.value.trim();
    const lname = $<HTMLInputElement>('#reg-lname', el)!.value.trim();
    const email = $<HTMLInputElement>('#reg-email', el)!.value.trim();
    const phone = $<HTMLInputElement>('#reg-phone', el)!.value.trim();
    const ghCard = $<HTMLInputElement>('#reg-ghana-card', el)?.value.trim() || undefined;
    const password = $<HTMLInputElement>('#reg-password', el)!.value;
    const confirm = $<HTMLInputElement>('#reg-confirm', el)!.value;
    const productId = $<HTMLSelectElement>('#reg-product', el)?.value || undefined;
    const branchId = $<HTMLSelectElement>('#reg-branch', el)?.value || undefined;

    if (!fname || !lname || !email || !phone || !password) {
      toast('Please fill in all required fields', 'error');
      return;
    }
    if (password !== confirm) {
      toast('Passwords do not match', 'error');
      return;
    }
    if (password.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }

    btn.disabled = true;
    btn.classList.add('btn-loading');
    try {
      const res = await api.register({
        first_name: fname,
        last_name: lname,
        email,
        phone,
        password,
        ghana_card_number: ghCard,
        product_id: productId,
        branch_id: branchId,
      });
      await api.saveTokens(res.access_token, res.refresh_token);
      await store.setUser(res.user);
      await store.setAccounts([res.account]);
      toast('Account created successfully!', 'success');
      await navigate('kyc-personal');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  });
}

// ── KYC PERSONAL ─────────────────────────────────────────────────────────────
async function renderKycPersonal(el: HTMLElement) {
  setNavVisible(false);
  const user = store.user;

  el.innerHTML = `
    <div class="kyc-screen">
      <div class="screen-header">
        <button class="header-btn" id="skip-btn" aria-label="Skip for now">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="header-title">Identity Verification</div>
        <span style="font-size:13px;color:var(--primary);font-weight:600">Step 1 of 2</span>
      </div>

      <div class="kyc-progress-bar"><div class="kyc-progress-fill" style="width:50%"></div></div>
      <div class="kyc-step-label">Step 1 — Basic information</div>

      <div class="kyc-body">
        <div>
          <div class="kyc-title">Complete Your Profile</div>
          <div class="kyc-sub">This helps us verify your identity and protect your account. Takes less than 2 minutes.</div>
        </div>

        ${user ? `
        <div class="card card-border">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--primary-50);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--primary)">
              ${user.first_name[0]}${user.last_name[0]}
            </div>
            <div>
              <div style="font-weight:700;font-size:15px">${user.first_name} ${user.last_name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${user.email}</div>
            </div>
          </div>
        </div>` : ''}

        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input id="kyc-dob" type="date" class="form-input" max="${new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}" />
          <div class="form-hint">You must be 18 or older to open an account</div>
        </div>

        <div class="form-group">
          <label class="form-label">Gender</label>
          <select id="kyc-gender" class="form-input">
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Ghana Card Number <span style="color:var(--text-muted);font-weight:400">(if not provided at signup)</span></label>
          <input id="kyc-card" type="text" autocomplete="off" class="form-input" placeholder="GHA-000000000-0" />
          <div class="form-hint">Format: GHA-XXXXXXXXX-X</div>
        </div>

        <div class="form-group">
          <label class="form-label">Nationality</label>
          <select id="kyc-nationality" class="form-input">
            <option value="Ghanaian" selected>Ghanaian</option>
            <option value="Nigerian">Nigerian</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div class="kyc-footer">
        <button id="kyc-continue-btn" class="btn btn-primary">Save & Continue</button>
        <div style="text-align:center;margin-top:12px">
          <span class="auth-link" id="kyc-later-link" style="font-size:14px">Complete later on the full app</span>
        </div>
      </div>
    </div>
  `;

  $('#skip-btn', el)!.addEventListener('click', () => navigate('dashboard'));
  $('#kyc-later-link', el)!.addEventListener('click', () => navigate('dashboard'));

  $<HTMLButtonElement>('#kyc-continue-btn', el)!.addEventListener('click', async () => {
    const dob = $<HTMLInputElement>('#kyc-dob', el)!.value;
    const gender = $<HTMLSelectElement>('#kyc-gender', el)!.value;
    const card = $<HTMLInputElement>('#kyc-card', el)!.value.trim();
    const nationality = $<HTMLSelectElement>('#kyc-nationality', el)!.value;

    if (!dob || !gender) {
      toast('Date of birth and gender are required', 'error');
      return;
    }

    const btn = $<HTMLButtonElement>('#kyc-continue-btn', el)!;
    btn.disabled = true;
    btn.classList.add('btn-loading');

    try {
      await api.updateKycPersonal({
        date_of_birth: dob,
        gender,
        nationality,
        ...(card ? { ghana_card_number: card } : {}),
      });
      toast('Profile updated!', 'success');
      await navigate('kyc-redirect');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || 'Could not save profile', 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  });
}

// ── KYC REDIRECT ─────────────────────────────────────────────────────────────
async function renderKycRedirect(el: HTMLElement) {
  setNavVisible(false);

  el.innerHTML = `
    <div class="success-screen animate-fade-in">
      <div class="success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px;margin-bottom:8px">
          Great start!
        </div>
        <div style="font-size:15px;color:var(--text-secondary);line-height:1.7">
          Your basic profile is saved. To unlock higher transaction limits and full banking features, complete your full KYC verification — it only takes a few more minutes.
        </div>
      </div>

      <div style="background:var(--surface);border-radius:var(--radius);padding:20px;width:100%;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow-sm)">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:4px">Remaining steps:</div>
        ${['Residential address', 'Employment details', 'Next of kin', 'Upload ID documents'].map((s, i) => `
          <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:var(--text-secondary)">
            <div style="width:22px;height:22px;border-radius:50%;background:var(--surface-3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-muted);flex-shrink:0">${i + 2}</div>
            ${s}
          </div>
        `).join('')}
      </div>

      <div style="width:100%;display:flex;flex-direction:column;gap:12px">
        <button id="complete-kyc-btn" class="btn btn-primary">Complete KYC on Full App</button>
        <button id="go-dashboard-btn" class="btn btn-ghost">Go to Dashboard</button>
      </div>

      <div style="font-size:12px;color:var(--text-muted);text-align:center;line-height:1.6">
        Basic account limit: GHS 1,000/transaction · GHS 2,000/day<br/>
        Verified limit: GHS 50,000/transaction · GHS 100,000/day
      </div>
    </div>
  `;

  $('#complete-kyc-btn', el)!.addEventListener('click', () => openWebapp('/kyc'));
  $('#go-dashboard-btn', el)!.addEventListener('click', () => navigate('dashboard'));
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function renderDashboard(el: HTMLElement) {
  setNavVisible(true, 'dashboard');
  const user = store.user;
  const accounts = store.accounts ?? [];

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;min-height:100%">
      <div class="dashboard-header">
        <div class="flex items-center justify-between" style="position:relative;z-index:2">
          <div>
            <div class="dashboard-greeting">Good ${getTimeGreeting()}, 👋</div>
            <div class="dashboard-name">${user ? `${user.first_name} ${user.last_name}` : 'Welcome back'}</div>
          </div>
          <button class="dashboard-notif-btn" id="notif-btn" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span id="notif-badge" class="badge hidden">0</span>
          </button>
        </div>
      </div>

      <div class="dashboard-body">
        <!-- Account Cards -->
        <div class="account-cards-container" style="margin-top:-12px">
          ${accounts.length ? `
          <div class="account-cards-slider" id="cards-slider">
            ${accounts.map(acc => accountCardHtml(acc)).join('')}
          </div>
          ${accounts.length > 1 ? `<div class="card-dots" id="card-dots">
            ${accounts.map((_, i) => `<div class="card-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
          </div>` : ''}
          ` : `<div class="card" style="text-align:center;padding:32px;color:var(--text-muted)">No accounts found</div>`}
        </div>

        <!-- KYC Banner (if not verified) -->
        ${user && user.kyc_status !== 'verified' ? kycBannerHtml(user.kyc_status, user.kyc_completion) : ''}

        <!-- Quick Actions -->
        <div>
          <div class="section-header">
            <div class="section-title">Quick Actions</div>
          </div>
          <div class="quick-actions">
            <div class="quick-action" id="qa-transfer">
              <div class="quick-action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
              <div class="quick-action-label">Transfer</div>
            </div>
            <div class="quick-action" id="qa-momo">
              <div class="quick-action-icon accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <div class="quick-action-label">Mobile Money</div>
            </div>
            <div class="quick-action" id="qa-loans">
              <div class="quick-action-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <div class="quick-action-label">Loans</div>
            </div>
            <div class="quick-action" id="qa-more">
              <div class="quick-action-icon" style="background:var(--surface-3)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                </svg>
              </div>
              <div class="quick-action-label">More</div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div>
          <div class="section-header">
            <div class="section-title">Recent Transactions</div>
            <span class="section-link" id="view-all-txns">View all</span>
          </div>
          <div id="recent-txns">
            ${skeletonTransactions(3)}
          </div>
        </div>
      </div>
    </div>
  `;

  // Card slider dots
  const slider = $<HTMLElement>('#cards-slider', el);
  if (slider && accounts.length > 1) {
    slider.addEventListener('scroll', () => {
      const idx = Math.round(slider.scrollLeft / slider.clientWidth);
      $$('.card-dot', el).forEach((d, i) => d.classList.toggle('active', i === idx));
    }, { passive: true });
  }

  // Navigation
  $('#notif-btn', el)!.addEventListener('click', () => openWebapp('/notifications'));
  $('#view-all-txns', el)!.addEventListener('click', () => navigate('transactions'));
  $('#qa-transfer', el)!.addEventListener('click', () => openWebapp('/transfer'));
  $('#qa-momo', el)!.addEventListener('click', () => openWebapp('/transfer'));
  $('#qa-loans', el)!.addEventListener('click', () => openWebapp('/loans'));
  $('#qa-more', el)!.addEventListener('click', () => openWebapp('/dashboard'));
  $<HTMLElement>('#kyc-upgrade-btn', el)?.addEventListener('click', () => openWebapp('/kyc'));

  // Load recent transactions (last 3 days, max 5 items)
  try {
    const res = await api.getTransactions({
      start_date: daysAgo(3),
      end_date: new Date().toISOString().split('T')[0],
      per_page: 5,
    });

    const txnsEl = $('#recent-txns', el)!;
    if (!res.transactions.length) {
      txnsEl.innerHTML = `
        <div class="empty-state" style="padding:32px 16px">
          <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg></div>
          <div class="empty-state-title">No recent transactions</div>
          <div class="empty-state-sub">Your recent activity will appear here</div>
        </div>`;
    } else {
      txnsEl.innerHTML = res.transactions.map(t => txItemHtml(t)).join('');
    }
  } catch {
    const txnsEl = $('#recent-txns', el);
    if (txnsEl) txnsEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:14px">Could not load transactions</div>`;
  }

  // Load unread notification count
  try {
    const countRes = await api.getUnreadCount();
    const badge = $('#notif-badge', el);
    if (badge && countRes.count > 0) {
      badge.textContent = countRes.count > 99 ? '99+' : String(countRes.count);
      badge.classList.remove('hidden');
    }
  } catch { /* non-critical */ }

  // Bottom nav handler
  setupBottomNav();
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
async function renderTransactions(el: HTMLElement) {
  setNavVisible(true, 'transactions');

  el.innerHTML = `
    <div class="txns-screen">
      <div class="screen-header">
        <div class="header-title">Transactions</div>
        <div style="font-size:12px;color:var(--text-muted);font-weight:500">Last 5 days</div>
      </div>

      <div class="txns-body scroll-content with-nav">
        <div class="txns-summary" id="txns-summary">
          <div class="summary-card">
            <div class="summary-label">Total In</div>
            <div class="summary-amount credit" id="total-in">—</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Out</div>
            <div class="summary-amount debit" id="total-out">—</div>
          </div>
        </div>

        <div id="txns-list">
          ${skeletonTransactions(6)}
        </div>
      </div>
    </div>
  `;

  setupBottomNav();

  try {
    const res = await api.getTransactions({
      start_date: daysAgo(5),
      end_date: new Date().toISOString().split('T')[0],
      per_page: 100,
    });

    const txns = res.transactions;
    const listEl = $('#txns-list', el)!;

    if (!txns.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="empty-state-title">No transactions in last 5 days</div>
          <div class="empty-state-sub">Tap "Full App" to view your complete transaction history</div>
        </div>`;
      return;
    }

    // Totals
    let totalIn = 0, totalOut = 0;
    for (const t of txns) {
      if (isCredit(t.transaction_type)) totalIn += t.amount;
      else totalOut += t.amount;
    }
    $('#total-in', el)!.textContent = `GHS ${totalIn.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
    $('#total-out', el)!.textContent = `GHS ${totalOut.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

    // Group and render
    const grouped = groupByDate(txns);
    const html: string[] = [];
    for (const [date, items] of grouped) {
      html.push(`<div class="tx-group-date">${dateLabel(date)}</div>`);
      html.push(...items.map(t => txItemHtml(t)));
    }
    listEl.innerHTML = html.join('');

    // Full history link at bottom
    listEl.insertAdjacentHTML('beforeend', `
      <div style="text-align:center;padding:20px 0">
        <button id="full-history-btn" class="btn btn-outline btn-sm" style="width:auto;padding:10px 24px">
          View Full History
        </button>
      </div>`);
    $('#full-history-btn', el)?.addEventListener('click', () => openWebapp('/transactions'));

  } catch {
    $('#txns-list', el)!.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="empty-state-title">Could not load transactions</div>
        <div class="empty-state-sub">Check your connection and try again</div>
      </div>`;
  }
}

// ─── Helper HTML builders ─────────────────────────────────────────────────────

function accountCardHtml(acc: Account): string {
  return `
    <div class="account-card-slide">
      <div class="account-card">
        <div class="flex items-center justify-between" style="position:relative;z-index:1">
          <div>
            <div class="account-card-type">${acc.account_type.replace('_', ' ')}</div>
          </div>
          <div class="account-card-chip"></div>
        </div>
        <div style="position:relative;z-index:1">
          <div class="account-card-balance-label">Available Balance</div>
          <div class="account-card-balance">${formatCurrency(acc.available_balance, 'GHS')}</div>
        </div>
        <div class="flex items-center justify-between" style="position:relative;z-index:1">
          <div class="account-card-number">${maskAccountNumber(acc.account_number)}</div>
          <div class="account-card-name">${acc.account_name}</div>
        </div>
      </div>
    </div>`;
}

function kycBannerHtml(status: string, completion: number): string {
  const isBasic = status === 'basic';
  return `
    <div style="background:${isBasic ? 'var(--warning-bg)' : 'var(--info-bg)'};border:1.5px solid ${isBasic ? 'rgba(221,107,32,0.3)' : 'rgba(49,130,206,0.3)'};border-radius:var(--radius-sm);padding:14px 16px;display:flex;align-items:center;gap:12px">
      <svg viewBox="0 0 24 24" fill="none" stroke="${isBasic ? 'var(--warning)' : 'var(--info)'}" stroke-width="2" width="20" height="20" flex-shrink="0">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary)">
          ${status === 'pending' ? 'KYC Under Review' : 'Complete Identity Verification'}
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">
          ${status === 'pending' ? 'Your documents are being reviewed (1-2 days)' : `${completion}% complete — unlock higher limits`}
        </div>
      </div>
      ${status !== 'pending' ? `<button id="kyc-upgrade-btn" style="font-size:12px;font-weight:700;color:${isBasic ? 'var(--warning)' : 'var(--info)'};white-space:nowrap;cursor:pointer">Verify →</button>` : ''}
    </div>`;
}

function txItemHtml(t: Transaction): string {
  const credit = isCredit(t.transaction_type);
  const iconClass = credit ? 'credit' : t.transaction_type === 'withdrawal' ? 'debit' : 'debit';
  return `
    <div class="tx-item" data-txid="${t.id}">
      <div class="tx-icon ${iconClass}">${txIconSvg(t.transaction_type)}</div>
      <div class="tx-info">
        <div class="tx-desc">${txTypeLabel(t.transaction_type)}</div>
        <div class="tx-sub">${t.description || t.reference}</div>
      </div>
      <div class="tx-amount">
        <div class="amount ${credit ? 'credit' : 'debit'}">
          ${credit ? '+' : '-'}GHS ${t.amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
        </div>
        <div class="time">${formatTime(t.created_at)}</div>
      </div>
    </div>`;
}

function skeletonTransactions(count: number): string {
  return Array.from({ length: count }, () => `
    <div class="tx-item">
      <div class="skeleton" style="width:44px;height:44px;border-radius:10px;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skeleton skeleton-line wide"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
      <div style="text-align:right">
        <div class="skeleton skeleton-line" style="width:80px"></div>
        <div class="skeleton skeleton-line" style="width:40px;margin-left:auto"></div>
      </div>
    </div>
  `).join('');
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function setupBottomNav() {
  const nav = document.getElementById('bottom-nav')!;
  $$('.nav-item', nav).forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route!;
      if (route === 'webapp') {
        openWebapp('/dashboard');
      } else {
        navigate(route as ScreenName);
      }
    });
  });
}

// ─── Webapp handoff ───────────────────────────────────────────────────────────

export async function openWebapp(path = '/') {
  if (!WEBAPP_URL) {
    toast('Full app URL not configured', 'warning');
    return;
  }
  const token = await api.getToken();
  const refresh = await api.getRefreshToken();

  const hash = token
    ? `#gb_token=${encodeURIComponent(token)}${refresh ? `&gb_refresh_token=${encodeURIComponent(refresh)}` : ''}`
    : '';

  const url = `${WEBAPP_URL}${path}${hash}`;

  await Browser.open({ url, presentationStyle: 'fullscreen' });
}

export type { ScreenName };
