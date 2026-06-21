import { useState, useEffect, useRef } from 'react';
import { Upload, Download, CheckCircle2, AlertCircle, Clock, FileText, Users, CreditCard, ArrowLeftRight, Banknote, ChevronDown, ChevronUp, X } from 'lucide-react';
import { migrationAPI } from '../../services/api';
import toast from 'react-hot-toast';

type MigrationType = 'customers' | 'accounts' | 'transactions' | 'loans';

interface MigrationResult {
  total: number;
  success_count: number;
  error_count: number;
  status: string;
  errors: Array<{ row: number; error: string }>;
  record_id: string;
}

interface HistoryRecord {
  id: string;
  migration_type: string;
  filename: string;
  total_records: number;
  success_count: number;
  error_count: number;
  status: string;
  errors: Array<{ row: number; error: string }>;
  migrated_by: string;
  created_at: string;
}

const MIGRATION_TYPES: Array<{
  key: MigrationType;
  label: string;
  icon: React.ElementType;
  color: string;
  columns: string[];
  example: string[];
  notes: string;
}> = [
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    color: 'text-blue-600 bg-blue-50',
    columns: [
      'first_name', 'last_name', 'other_names', 'email', 'phone',
      'ghana_card_number', 'date_of_birth', 'gender', 'kyc_status',
      'account_status', 'account_type', 'initial_balance', 'opened_date',
    ],
    example: [
      'Kwame', 'Mensah', '', 'kwame@email.com', '0241234567',
      'GHA-123456789-0', '1990-05-15', 'male', 'basic', 'active',
      'savings', '500.00', '2023-01-15',
    ],
    notes:
      'account_type: savings | current | fixed_deposit | susu | student | business. ' +
      'kyc_status: basic | pending | verified. ' +
      'Dates: YYYY-MM-DD. ' +
      'A default account is created with initial_balance for each customer. ' +
      'Default password Crestline@Migrate2024 — customers must reset on first login.',
  },
  {
    key: 'accounts',
    label: 'Accounts',
    icon: CreditCard,
    color: 'text-emerald-600 bg-emerald-50',
    columns: [
      'customer_email', 'account_number', 'account_name', 'account_type',
      'balance', 'currency', 'status', 'interest_rate', 'opened_date',
    ],
    example: [
      'kwame@email.com', '1012345678', 'Kwame Mensah', 'savings',
      '2500.00', 'GHS', 'active', '3.5', '2023-01-15',
    ],
    notes:
      'customer_email must belong to an existing customer. ' +
      'account_number: leave blank to auto-generate. ' +
      'balance: sets the account opening balance for migration.',
  },
  {
    key: 'transactions',
    label: 'Transactions',
    icon: ArrowLeftRight,
    color: 'text-purple-600 bg-purple-50',
    columns: [
      'account_number', 'transaction_type', 'amount', 'description',
      'reference', 'transaction_date', 'balance_after', 'channel', 'status',
    ],
    example: [
      '1012345678', 'deposit', '500.00', 'Opening balance deposit',
      '', '2023-01-15', '500.00', 'branch', 'completed',
    ],
    notes:
      'transaction_type: deposit | withdrawal | transfer_in | transfer_out | ' +
      'mobile_money_in | mobile_money_out | loan_disbursement | loan_repayment | interest_credit. ' +
      'transaction_date: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS — historical dates allowed. ' +
      'reference: auto-generated if blank. ' +
      'balance_after: the account balance after this transaction (used for history accuracy).',
  },
  {
    key: 'loans',
    label: 'Loans',
    icon: Banknote,
    color: 'text-amber-600 bg-amber-50',
    columns: [
      'customer_email', 'loan_type', 'amount_approved', 'purpose',
      'interest_rate', 'tenure_months', 'outstanding_balance',
      'monthly_installment', 'status', 'disbursed_date', 'next_payment_date',
    ],
    example: [
      'kwame@email.com', 'personal', '5000.00', 'Home renovation',
      '24.0', '12', '3500.00', '490.00', 'active', '2023-06-01', '2024-07-01',
    ],
    notes:
      'loan_type: personal | business | mortgage | auto | salary_advance | sme | education | agricultural. ' +
      'status: active | completed | defaulted | rejected. ' +
      'Dates: YYYY-MM-DD.',
  },
];

function downloadCsv(columns: string[], example: string[], filename: string) {
  const rows = [columns.join(','), example.join(',')];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function AdminMigration() {
  const [activeTab, setActiveTab] = useState<MigrationType>('customers');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const type = MIGRATION_TYPES.find(t => t.key === activeTab)!;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await migrationAPI.getHistory({ per_page: 50 });
      setHistory(res.data.records || []);
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (tab: MigrationType) => {
    setActiveTab(tab);
    setSelectedFile(null);
    setResult(null);
    setShowErrors(false);
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    setSelectedFile(file);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    if (!selectedFile) { toast.error('Please select a CSV file first'); return; }
    setIsImporting(true);
    setResult(null);
    try {
      const res = await migrationAPI.importData(activeTab, selectedFile);
      setResult(res.data);
      if (res.data.status === 'completed') {
        toast.success(`${res.data.success_count} records imported successfully!`);
      } else if (res.data.status === 'partial') {
        toast.success(`${res.data.success_count} imported, ${res.data.error_count} errors.`);
      } else {
        toast.error('Import failed. Check the errors below.');
      }
      fetchHistory();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Migration</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Import historical data from your existing banking system using CSV templates.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <FileText size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Migration Guide</p>
          <p className="mt-1">
            1. Select the data type to migrate. &nbsp;2. Download the template and fill in your data. &nbsp;
            3. Upload the completed CSV. &nbsp;4. Review results and fix any errors.
            Historical dates are preserved — transactions can be imported with their original dates.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {MIGRATION_TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                activeTab === t.key
                  ? 'bg-primary-900 text-white border-primary-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-700'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Column Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold mb-3 ${type.color}`}>
              <type.icon size={16} />
              {type.label} Template
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Required Columns</p>
              <div className="flex flex-wrap gap-1.5">
                {type.columns.map(col => (
                  <span key={col} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
              <p className="font-semibold mb-1">Notes</p>
              <p className="leading-relaxed">{type.notes}</p>
            </div>

            <button
              onClick={() => downloadCsv(type.columns, type.example, `migration_template_${type.key}.csv`)}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              <Download size={16} /> Download Template
            </button>
          </div>

          {/* Preview of example row */}
          <div className="card overflow-x-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Example Row</p>
            <table className="text-xs w-full">
              <thead>
                <tr>
                  {type.columns.map(c => (
                    <th key={c} className="text-left text-gray-500 font-medium pb-1 pr-3 whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {type.example.map((v, i) => (
                    <td key={i} className="text-gray-800 pr-3 py-0.5 whitespace-nowrap font-mono">{v || '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upload + Result */}
        <div className="lg:col-span-3 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 size={36} className="text-emerald-500" />
                <p className="font-semibold text-emerald-800">{selectedFile.name}</p>
                <p className="text-sm text-emerald-600">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedFile(null); setResult(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 mt-1"
                >
                  <X size={12} /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <Upload size={36} className="text-gray-400" />
                <p className="font-semibold text-gray-700">Drag & drop your CSV here</p>
                <p className="text-sm">or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Only .csv files accepted</p>
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing...
              </>
            ) : (
              <>
                <Upload size={18} /> Import {type.label}
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className={`rounded-xl border p-5 ${
              result.status === 'completed'
                ? 'bg-emerald-50 border-emerald-200'
                : result.status === 'partial'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {result.status === 'completed'
                  ? <CheckCircle2 size={24} className="text-emerald-600" />
                  : result.status === 'partial'
                  ? <AlertCircle size={24} className="text-amber-600" />
                  : <AlertCircle size={24} className="text-red-600" />}
                <div>
                  <p className="font-bold text-gray-900">
                    {result.status === 'completed' ? 'Import Successful' : result.status === 'partial' ? 'Partial Import' : 'Import Failed'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {result.success_count} of {result.total} records imported
                    {result.error_count > 0 && ` · ${result.error_count} errors`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total', value: result.total, color: 'text-gray-900' },
                  { label: 'Imported', value: result.success_count, color: 'text-emerald-700' },
                  { label: 'Errors', value: result.error_count, color: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {result.errors.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-1 text-sm font-semibold text-red-700 mb-2"
                  >
                    {showErrors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showErrors ? 'Hide' : 'Show'} errors ({result.errors.length})
                  </button>
                  {showErrors && (
                    <div className="bg-white rounded-lg border border-red-200 overflow-hidden max-h-48 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <div key={i} className="flex gap-3 px-3 py-2 border-b border-red-50 last:border-0 text-sm">
                          <span className="font-mono text-gray-400 flex-shrink-0 w-12">Row {err.row}</span>
                          <span className="text-red-700">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Migration History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Migration History</h3>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">{history.length} migrations</span>
          </div>
        </div>

        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No migrations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Type', 'File', 'Total', 'Imported', 'Errors', 'Status', 'By', 'Date', ''].map(h => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(rec => (
                  <>
                    <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 pr-4">
                        <span className="capitalize font-medium text-gray-800">{rec.migration_type}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 max-w-[120px] truncate">{rec.filename}</td>
                      <td className="py-2.5 pr-4 font-mono text-gray-700">{rec.total_records}</td>
                      <td className="py-2.5 pr-4 font-mono text-emerald-700">{rec.success_count}</td>
                      <td className="py-2.5 pr-4 font-mono text-red-600">{rec.error_count}</td>
                      <td className="py-2.5 pr-4"><StatusBadge status={rec.status} /></td>
                      <td className="py-2.5 pr-4 text-gray-600">{rec.migrated_by || '—'}</td>
                      <td className="py-2.5 pr-4 text-gray-400 whitespace-nowrap">
                        {new Date(rec.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' '}
                        {new Date(rec.created_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5">
                        {rec.error_count > 0 && (
                          <button
                            onClick={() => setExpandedHistory(expandedHistory === rec.id ? null : rec.id)}
                            className="text-xs text-primary-700 font-medium"
                          >
                            {expandedHistory === rec.id ? 'Hide' : 'Errors'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedHistory === rec.id && rec.errors.length > 0 && (
                      <tr key={`${rec.id}-errors`}>
                        <td colSpan={9} className="pb-3 px-2">
                          <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                            {rec.errors.map((err, i) => (
                              <div key={i} className="flex gap-3 px-3 py-1.5 border-b border-red-100 last:border-0 text-xs">
                                <span className="font-mono text-gray-400 flex-shrink-0 w-12">Row {err.row}</span>
                                <span className="text-red-700">{err.error}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
