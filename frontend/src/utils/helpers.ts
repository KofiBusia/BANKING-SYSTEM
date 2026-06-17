import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(amount: number, currency = 'GHS'): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}

export function getTransactionColor(type: string): string {
  const credits = ['deposit', 'transfer_in', 'loan_disbursement', 'interest_credit', 'mobile_money_in'];
  return credits.includes(type) ? 'text-emerald-600' : 'text-red-600';
}

export function getTransactionSign(type: string): string {
  const credits = ['deposit', 'transfer_in', 'loan_disbursement', 'interest_credit', 'mobile_money_in'];
  return credits.includes(type) ? '+' : '-';
}

export function getKYCStatusColor(status: string): string {
  const colors: Record<string, string> = {
    basic: 'badge-warning',
    pending: 'badge-info',
    verified: 'badge-success',
    rejected: 'badge-danger',
  };
  return colors[status] || 'badge-gray';
}

export function getLoanStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'badge-warning',
    under_review: 'badge-info',
    approved: 'badge-success',
    disbursed: 'badge-success',
    active: 'badge-success',
    completed: 'badge-gray',
    rejected: 'badge-danger',
    defaulted: 'badge-danger',
  };
  return colors[status] || 'badge-gray';
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    savings: 'Savings Account',
    current: 'Current Account',
    fixed_deposit: 'Fixed Deposit',
    susu: 'Susu Account',
    student: 'Student Account',
    business: 'Business Account',
  };
  return labels[type] || type;
}

export function getLoanTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    personal: 'Personal Loan',
    business: 'Business Loan',
    mortgage: 'Mortgage',
    auto: 'Auto Loan',
    salary_advance: 'Salary Advance',
    sme: 'SME Loan',
    education: 'Education Loan',
    agricultural: 'Agricultural Loan',
  };
  return labels[type] || type;
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    transfer_in: 'Transfer Received',
    transfer_out: 'Transfer Sent',
    loan_disbursement: 'Loan Disbursement',
    loan_repayment: 'Loan Repayment',
    interest_credit: 'Interest Credit',
    fee: 'Bank Fee',
    charge: 'Charge',
    reversal: 'Reversal',
    mobile_money_in: 'Mobile Money In',
    mobile_money_out: 'Mobile Money Out',
    pos: 'POS Transaction',
    atm_withdrawal: 'ATM Withdrawal',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
