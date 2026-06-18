export interface User {
  id: string;
  first_name: string;
  last_name: string;
  other_names?: string;
  full_name: string;
  email: string;
  phone: string;
  ghana_card_number?: string;
  date_of_birth?: string;
  gender?: string;
  profile_photo?: string;
  role: 'customer' | 'teller' | 'manager' | 'admin' | 'super_admin';
  kyc_status: 'basic' | 'pending' | 'verified' | 'rejected';
  kyc_completion: number;
  account_status: 'active' | 'suspended' | 'closed';
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  pin_set: boolean;
  last_login?: string;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_number: string;
  account_name: string;
  account_type: 'savings' | 'current' | 'fixed_deposit' | 'susu' | 'student' | 'business';
  currency: string;
  balance: number;
  available_balance: number;
  ledger_balance: number;
  interest_rate: number;
  minimum_balance: number;
  overdraft_limit: number;
  overdraft_enabled: boolean;
  status: 'active' | 'dormant' | 'frozen' | 'closed';
  maturity_date?: string;
  fixed_term_months?: number;
  last_transaction_date?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  reference: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  fee: number;
  balance_before: number;
  balance_after: number;
  currency: string;
  description?: string;
  narration?: string;
  channel?: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  counterparty_account?: string;
  counterparty_name?: string;
  counterparty_bank?: string;
  counterparty_phone?: string;
  value_date?: string;
  created_at: string;
}

export interface Loan {
  id: string;
  loan_number: string;
  user_id: string;
  account_id: string;
  loan_type: string;
  amount_requested: number;
  amount_approved?: number;
  outstanding_balance?: number;
  total_paid: number;
  interest_rate: number;
  interest_type: string;
  processing_fee: number;
  tenure_months: number;
  monthly_payment?: number;
  total_repayment?: number;
  total_interest?: number;
  purpose: string;
  status: 'pending' | 'under_review' | 'approved' | 'disbursed' | 'active' | 'completed' | 'rejected' | 'defaulted';
  application_date: string;
  approval_date?: string;
  disbursement_date?: string;
  expected_completion_date?: string;
  next_payment_date?: string;
  collateral_type?: string;
  collateral_value?: number;
  guarantor_name?: string;
  guarantor_phone?: string;
  rejection_reason?: string;
  missed_payments: number;
  days_past_due: number;
  created_at: string;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  penalty_amount: number;
  paid_amount: number;
  payment_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'waived';
}

export interface KYCInfo {
  id: string;
  user_id: string;
  date_of_birth?: string;
  place_of_birth?: string;
  nationality?: string;
  marital_status?: string;
  mother_maiden_name?: string;
  residential_address?: string;
  digital_address?: string;
  city?: string;
  region?: string;
  country?: string;
  years_at_address?: number;
  postal_address?: string;
  employment_status?: string;
  employer_name?: string;
  employer_address?: string;
  employer_phone?: string;
  job_title?: string;
  industry?: string;
  monthly_income?: number;
  annual_income?: number;
  source_of_funds?: string;
  source_of_funds_details?: string;
  nok_first_name?: string;
  nok_last_name?: string;
  nok_relationship?: string;
  nok_phone?: string;
  nok_email?: string;
  nok_address?: string;
  tin_number?: string;
  ssnit_number?: string;
  nhis_number?: string;
  is_pep?: boolean;
  pep_details?: string;
  business_name?: string;
  business_registration_number?: string;
  identity_verified?: boolean;
  address_verified?: boolean;
  biometric_verified?: boolean;
  selfie_verified?: boolean;
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

export interface AuthContextType {
  user: User | null;
  accounts: Account[];
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  other_names?: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  ghana_card_number?: string;
  branch_id?: string;
  product_id?: string;
}
