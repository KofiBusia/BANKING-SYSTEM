import { useState, useEffect, useCallback, memo } from 'react';
import { CheckCircle2, Upload, AlertCircle, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { kycAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { KYCInfo, KYCDocument } from '../../types';
import toast from 'react-hot-toast';

const GHANA_REGIONS = ['Greater Accra','Ashanti','Western','Central','Eastern','Northern','Upper East','Upper West','Volta','Bono','Bono East','Ahafo','Western North','Oti','North East','Savannah'];
const DOCUMENT_TYPES = [
  { id: 'ghana_card_front', label: 'Ghana Card (Front)' },
  { id: 'ghana_card_back', label: 'Ghana Card (Back)' },
  { id: 'passport', label: 'Passport' },
  { id: 'voter_id', label: "Voter's ID" },
  { id: 'selfie', label: 'Selfie / Photo' },
  { id: 'utility_bill', label: 'Utility Bill' },
  { id: 'bank_statement', label: 'Bank Statement' },
  { id: 'business_registration', label: 'Business Registration' },
];

interface KYCStatus {
  kyc_status: string;
  kyc_completion: number;
  kyc_info: KYCInfo | null;
  documents: KYCDocument[];
  missing_items: string[];
}

const Section = memo(({ id, title, children, activeSection, setActiveSection }: {
  id: string; title: string; children: React.ReactNode;
  activeSection: string | null; setActiveSection: (s: string | null) => void;
}) => (
  <div className="card overflow-hidden">
    <button className="w-full flex items-center justify-between p-0 text-left" onClick={() => setActiveSection(activeSection === id ? null : id)}>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {activeSection === id ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
    </button>
    {activeSection === id && <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">{children}</div>}
  </div>
));

export default function KYC() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>('personal');
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const fetchStatus = useCallback(async () => {
    try {
      const res = await kycAPI.getStatus();
      setStatus(res.data);
      setFormData(res.data.kyc_info || {});
    } catch { } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSave = async (section: string) => {
    setSaving(section);
    try {
      const apiMap: Record<string, Function> = {
        personal: kycAPI.updatePersonal,
        address: kycAPI.updateAddress,
        employment: kycAPI.updateEmployment,
        nok: kycAPI.updateNextOfKin,
      };
      await apiMap[section](formData);
      toast.success('Saved successfully!');
      fetchStatus();
      refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(null); }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    setUploading(docType);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', docType);
    try {
      await kycAPI.uploadDocument(fd);
      toast.success('Document uploaded!');
      fetchStatus();
      refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(null); }
  };

  const handleSubmit = async () => {
    try {
      await kycAPI.submit();
      toast.success('KYC submitted for review!');
      fetchStatus();
      refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  const set = (key: string, val: any) => setFormData((prev: any) => ({ ...prev, [key]: val }));

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const completion = status?.kyc_completion || user?.kyc_completion || 20;
  const kycStatus = status?.kyc_status || user?.kyc_status || 'basic';

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
        <p className="text-gray-500 text-sm mt-0.5">Complete your identity verification to unlock all banking features</p>
      </div>

      {/* Status card */}
      <div className={`rounded-xl p-5 border ${kycStatus === 'verified' ? 'bg-emerald-50 border-emerald-200' : kycStatus === 'pending' ? 'bg-blue-50 border-blue-200' : kycStatus === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <Shield size={24} className={kycStatus === 'verified' ? 'text-emerald-500' : kycStatus === 'pending' ? 'text-blue-500' : kycStatus === 'rejected' ? 'text-red-500' : 'text-amber-500'} />
          <div>
            <p className="font-bold text-gray-900">
              {kycStatus === 'verified' ? 'KYC Verified' : kycStatus === 'pending' ? 'Under Review' : kycStatus === 'rejected' ? 'KYC Rejected' : 'KYC Incomplete'}
            </p>
            <p className="text-sm text-gray-600">
              {kycStatus === 'verified' ? 'Full access to all banking services' : kycStatus === 'pending' ? 'Review takes 1-3 business days' : kycStatus === 'rejected' ? status?.kyc_info?.rejection_reason || 'Please update and resubmit' : `${completion}% complete`}
            </p>
          </div>
        </div>
        <div className="w-full bg-white rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${kycStatus === 'verified' ? 'bg-emerald-500' : kycStatus === 'pending' ? 'bg-blue-500' : kycStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${completion}%` }} />
        </div>
        <p className="text-right text-xs text-gray-500 mt-1">{completion}%</p>
        {status?.missing_items && status.missing_items.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {status.missing_items.map(item => (
              <span key={item} className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">{item}</span>
            ))}
          </div>
        )}
      </div>

      {kycStatus !== 'verified' && (
        <>
          {/* Personal Info */}
          <Section id="personal" title="Personal Information" activeSection={activeSection} setActiveSection={setActiveSection}>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label><input value={formData.first_name || user?.first_name || ''} onChange={e => set('first_name', e.target.value)} className="input-field text-sm" placeholder="First name" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label><input value={formData.last_name || user?.last_name || ''} onChange={e => set('last_name', e.target.value)} className="input-field text-sm" placeholder="Last name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Date of Birth</label><input type="date" value={formData.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} className="input-field text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Gender</label><select value={formData.gender || ''} onChange={e => set('gender', e.target.value)} className="input-field text-sm"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Marital Status</label><select value={formData.marital_status || ''} onChange={e => set('marital_status', e.target.value)} className="input-field text-sm"><option value="">Select</option><option>single</option><option>married</option><option>divorced</option><option>widowed</option></select></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Nationality</label><input value={formData.nationality || 'Ghanaian'} onChange={e => set('nationality', e.target.value)} className="input-field text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">TIN Number</label><input value={formData.tin_number || ''} onChange={e => set('tin_number', e.target.value)} className="input-field text-sm" placeholder="Tax ID" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">SSNIT Number</label><input value={formData.ssnit_number || ''} onChange={e => set('ssnit_number', e.target.value)} className="input-field text-sm" placeholder="Social Security" /></div>
            </div>
            <button onClick={() => handleSave('personal')} disabled={saving === 'personal'} className="btn-primary py-2 px-6 text-sm">{saving === 'personal' ? 'Saving...' : 'Save Personal Info'}</button>
          </Section>

          {/* Address */}
          <Section id="address" title="Address Information" activeSection={activeSection} setActiveSection={setActiveSection}>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Residential Address</label><textarea value={formData.residential_address || ''} onChange={e => set('residential_address', e.target.value)} className="input-field text-sm" rows={2} placeholder="House No., Street, Area" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Ghana Post GPS</label><input value={formData.digital_address || ''} onChange={e => set('digital_address', e.target.value)} className="input-field text-sm" placeholder="GA-123-4567" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">City / Town</label><input value={formData.city || ''} onChange={e => set('city', e.target.value)} className="input-field text-sm" placeholder="e.g. Accra" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Region</label><select value={formData.region || ''} onChange={e => set('region', e.target.value)} className="input-field text-sm"><option value="">Select Region</option>{GHANA_REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Years at Address</label><input type="number" min="0" value={formData.years_at_address || ''} onChange={e => set('years_at_address', e.target.value)} className="input-field text-sm" /></div>
            </div>
            <button onClick={() => handleSave('address')} disabled={saving === 'address'} className="btn-primary py-2 px-6 text-sm">{saving === 'address' ? 'Saving...' : 'Save Address'}</button>
          </Section>

          {/* Employment */}
          <Section id="employment" title="Employment & Income" activeSection={activeSection} setActiveSection={setActiveSection}>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Employment Status</label><select value={formData.employment_status || ''} onChange={e => set('employment_status', e.target.value)} className="input-field text-sm"><option value="">Select</option><option value="employed">Employed</option><option value="self_employed">Self-Employed</option><option value="unemployed">Unemployed</option><option value="student">Student</option><option value="retired">Retired</option></select></div>
            {['employed','self_employed'].includes(formData.employment_status) && (
              <>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Employer / Business Name</label><input value={formData.employer_name || ''} onChange={e => set('employer_name', e.target.value)} className="input-field text-sm" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Job Title / Position</label><input value={formData.job_title || ''} onChange={e => set('job_title', e.target.value)} className="input-field text-sm" /></div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Monthly Income (GHS)</label><input type="number" min="0" value={formData.monthly_income || ''} onChange={e => set('monthly_income', e.target.value)} className="input-field text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Source of Funds</label><select value={formData.source_of_funds || ''} onChange={e => set('source_of_funds', e.target.value)} className="input-field text-sm"><option value="">Select</option><option value="salary">Salary</option><option value="business">Business Income</option><option value="investment">Investment</option><option value="inheritance">Inheritance</option><option value="rental">Rental Income</option><option value="other">Other</option></select></div>
            </div>
            <button onClick={() => handleSave('employment')} disabled={saving === 'employment'} className="btn-primary py-2 px-6 text-sm">{saving === 'employment' ? 'Saving...' : 'Save Employment Info'}</button>
          </Section>

          {/* Next of Kin */}
          <Section id="nok" title="Next of Kin" activeSection={activeSection} setActiveSection={setActiveSection}>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label><input value={formData.nok_first_name || ''} onChange={e => set('nok_first_name', e.target.value)} className="input-field text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label><input value={formData.nok_last_name || ''} onChange={e => set('nok_last_name', e.target.value)} className="input-field text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Relationship</label><select value={formData.nok_relationship || ''} onChange={e => set('nok_relationship', e.target.value)} className="input-field text-sm"><option value="">Select</option><option>spouse</option><option>parent</option><option>child</option><option>sibling</option><option>friend</option><option>other</option></select></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label><input value={formData.nok_phone || ''} onChange={e => set('nok_phone', e.target.value)} className="input-field text-sm" placeholder="0241234567" /></div>
            </div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Email (Optional)</label><input type="email" value={formData.nok_email || ''} onChange={e => set('nok_email', e.target.value)} className="input-field text-sm" /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Address</label><textarea value={formData.nok_address || ''} onChange={e => set('nok_address', e.target.value)} className="input-field text-sm" rows={2} /></div>
            <button onClick={() => handleSave('nok')} disabled={saving === 'nok'} className="btn-primary py-2 px-6 text-sm">{saving === 'nok' ? 'Saving...' : 'Save Next of Kin'}</button>
          </Section>

          {/* Documents */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-800">Identity Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOCUMENT_TYPES.map(doc => {
                const existing = status?.documents.find(d => d.document_type === doc.id);
                return (
                  <div key={doc.id} className={`border-2 border-dashed rounded-xl p-4 transition-colors ${existing ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-primary-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{doc.label}</span>
                      {existing && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                    {existing ? (
                      <div>
                        <p className="text-xs text-emerald-600">{existing.original_name}</p>
                        <span className={`text-xs font-medium ${existing.status === 'approved' ? 'text-emerald-600' : existing.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{existing.status}</span>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploading === doc.id} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(doc.id, f); }} />
                        <div className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-700">
                          <Upload size={14} />
                          {uploading === doc.id ? 'Uploading...' : 'Click to upload'}
                        </div>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          {kycStatus !== 'pending' && completion >= 60 && (
            <button onClick={handleSubmit} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2">
              <Shield size={18} /> Submit KYC for Review
            </button>
          )}
          {completion < 60 && (
            <div className="card bg-amber-50 border-amber-200 text-center">
              <AlertCircle size={24} className="text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-amber-800 font-medium">Complete at least 60% to submit</p>
              <p className="text-xs text-amber-600 mt-1">You're at {completion}%. Fill in more sections to proceed.</p>
            </div>
          )}
        </>
      )}

      {kycStatus === 'verified' && (
        <div className="card text-center py-8">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">KYC Fully Verified!</h2>
          <p className="text-gray-500 mt-2">You have full access to all Crestline services.</p>
        </div>
      )}
    </div>
  );
}
