'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { X, Save, Loader2 } from 'lucide-react';

export interface DistributorEditableProfile {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string;
  gender: string;
  dob: string;
  address: string;
  email: string;
  pan_card_id: string;
  aadhaar_card: string;
  bank_account: string;
  bank_ifsc: string;
  bank_branch: string;
}

interface EditDistributorProfileModalProps {
  distributor: DistributorEditableProfile;
  endpoint: string;
  title: string;
  onClose: () => void;
  onSuccess?: () => void;
  token?: string;
  hideSensitive?: boolean;
}

export default function EditDistributorProfileModal({
  distributor,
  endpoint,
  title,
  onClose,
  onSuccess,
  token,
  hideSensitive = false,
}: EditDistributorProfileModalProps) {
  const [form, setForm] = useState({
    first_name: distributor.first_name || '',
    last_name: distributor.last_name || '',
    mobile: distributor.mobile || '',
    gender: distributor.gender || '',
    dob: distributor.dob || '',
    address: distributor.address || '',
    email: distributor.email || '',
    pan_card_id: distributor.pan_card_id || '',
    aadhaar_card: distributor.aadhaar_card || '',
    bank_account: distributor.bank_account || '',
    bank_ifsc: distributor.bank_ifsc || '',
    bank_branch: distributor.bank_branch || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const sensitiveFields = ['pan_card_id', 'aadhaar_card', 'bank_account', 'bank_ifsc', 'bank_branch'] as const;

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const body: Record<string, string> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach(k => {
      if (hideSensitive && (sensitiveFields as readonly string[]).includes(k)) return;
      const v = form[k].trim();
      if (v !== '') body[k] = v;
    });

    let res: { success: boolean; message?: string; error?: string };
    if (token) {
      // Member context uses the member token stored separately from the admin token.
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }).then(r => r.json()).catch(() => ({ success: false, message: 'Network error' }));
    } else {
      res = await api.put(endpoint, body);
    }
    setSaving(false);
    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(res.message || res.error || 'Failed to update profile');
    }
  };

  const inputCls = "input";
  const labelCls = "block text-sm font-medium text-text-secondary mb-1.5";

  return (
    <div className="modal-overlay">
      <div className="modal-content p-5 sm:p-6 mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-text-muted mb-5">
          {hideSensitive
            ? 'Update the distributor profile. Sensitive details (PAN, Aadhaar, bank info) are managed by the admin.'
            : 'Update the distributor profile. Empty fields are left unchanged.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label className={labelCls}>First Name</label>
            <input className={inputCls} value={form.first_name} onChange={set('first_name')} placeholder="First name" />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input className={inputCls} value={form.last_name} onChange={set('last_name')} placeholder="Last name" />
          </div>
          <div>
            <label className={labelCls}>Mobile</label>
            <input className={inputCls} value={form.mobile} onChange={set('mobile')} placeholder="Mobile number" />
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select className={inputCls} value={form.gender} onChange={set('gender')}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Date of Birth</label>
            <input type="date" className={inputCls} value={form.dob} onChange={set('dob')} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="Email address" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Address</label>
            <textarea className={inputCls} rows={2} value={form.address} onChange={set('address')} placeholder="Full address" />
          </div>
          {!hideSensitive && (
            <>
              <div>
                <label className={labelCls}>PAN Card</label>
                <input className={inputCls} value={form.pan_card_id} onChange={set('pan_card_id')} placeholder="PAN number" />
              </div>
              <div>
                <label className={labelCls}>Aadhaar Card</label>
                <input className={inputCls} value={form.aadhaar_card} onChange={set('aadhaar_card')} placeholder="Aadhaar number" />
              </div>
              <div>
                <label className={labelCls}>Bank Account</label>
                <input className={inputCls} value={form.bank_account} onChange={set('bank_account')} placeholder="Account number" />
              </div>
              <div>
                <label className={labelCls}>Bank IFSC</label>
                <input className={inputCls} value={form.bank_ifsc} onChange={set('bank_ifsc')} placeholder="IFSC code" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Bank Branch</label>
                <input className={inputCls} value={form.bank_branch} onChange={set('bank_branch')} placeholder="Branch name" />
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-danger-light/20 border border-danger/30 text-danger text-sm">{error}</div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <button onClick={onClose} disabled={saving} className="flex-1 btn-ghost py-2.5 order-2 sm:order-1">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 btn-primary py-2.5 order-1 sm:order-2 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
