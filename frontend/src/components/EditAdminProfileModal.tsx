'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { X, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface EditAdminProfileModalProps {
  onClose: () => void;
}

export default function EditAdminProfileModal({ onClose }: EditAdminProfileModalProps) {
  const { admin, fetchProfile } = useAuthStore();
  const [form, setForm] = useState({
    full_name: admin?.full_name || '',
    email: admin?.email || '',
    phone: admin?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const body: Record<string, string> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach(k => {
      const v = form[k].trim();
      if (v !== '') body[k] = v;
    });

    const res = await api.put('/auth/me', body);
    setSaving(false);
    if (res.success) {
      await fetchProfile();
      onClose();
    } else {
      setError(res.message || res.error || 'Failed to update profile');
    }
  };

  const labelCls = "block text-sm font-medium text-text-secondary mb-1.5";

  return (
    <div className="modal-overlay">
      <div className="modal-content p-5 sm:p-6 mx-auto w-full max-w-md">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary">Edit My Profile</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-text-muted mb-5">Update your admin account details. Empty fields are left unchanged.</p>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Full Name</label>
            <input className="input" value={form.full_name} onChange={set('full_name')} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="Email address" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="Phone number" />
          </div>
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