'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  User, Phone, Calendar, MapPin, Mail, CreditCard, Shield, Building2,
  CheckCircle, AlertTriangle, Copy, Eye, EyeOff, Loader2, ArrowRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function RegisterForm() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  const [step, setStep] = useState<'loading' | 'invalid' | 'form' | 'success'>('loading');
  const [codeInfo, setCodeInfo] = useState<{ referral_code: string; created_by: string } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [credentials, setCredentials] = useState<{ member_id: string; username: string; password: string } | null>(null);

  const [form, setForm] = useState({
    first_name: '', last_name: '', mobile: '', gender: 'male',
    dob: '', address: '', email: '', pan_card_id: '', aadhaar_card: '',
    bank_account: '', bank_ifsc: '', bank_branch: '',
  });

  useEffect(() => {
    if (!ref) { setStep('invalid'); return; }
    fetch(`${API_BASE}/referral-link/${ref}/validate`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) { setCodeInfo(data); setStep('form'); }
        else { setStep('invalid'); }
      })
      .catch(() => setStep('invalid'));
  }, [ref]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/referral-link/${ref}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCredentials({ member_id: data.member_id, username: data.username, password: data.password });
        setStep('success');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const copyField = (val: string) => {
    navigator.clipboard.writeText(val);
  };

  const inputClass = "input h-12 sm:h-auto";
  const labelClass = "block text-sm font-medium text-text-secondary mb-1.5";

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-text-muted text-sm">Validating referral code...</p>
        </div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="stat-card max-w-md w-full text-center animate-scale-in">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Invalid Referral Link</h1>
          <p className="text-sm text-text-muted">This referral code is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (step === 'success' && credentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4 py-8">
        <div className="stat-card max-w-lg w-full animate-scale-in">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Registration Successful!</h1>
            <p className="text-sm text-text-muted mt-1">Save your credentials below. You'll need them to log in.</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs text-primary font-semibold mb-2 uppercase tracking-wider">Your Login Credentials</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Member ID</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-border font-mono text-sm font-bold text-text-primary">{credentials.member_id}</code>
                    <button onClick={() => copyField(credentials.member_id)} className="btn-icon border border-border"><Copy size={14} /></button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Username</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-border font-mono text-sm text-text-primary">{credentials.username}</code>
                    <button onClick={() => copyField(credentials.username)} className="btn-icon border border-border"><Copy size={14} /></button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Password</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-border font-mono text-sm text-text-primary">
                      {showPass ? credentials.password : '•'.repeat(credentials.password.length)}
                    </code>
                    <button onClick={() => setShowPass(!showPass)} className="btn-icon border border-border">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => copyField(credentials.password)} className="btn-icon border border-border"><Copy size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <a
            href={`/member/login?login_id=${encodeURIComponent(credentials.member_id)}&password=${encodeURIComponent(credentials.password)}`}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Go to Login <ArrowRight size={16} />
          </a>

          <p className="text-xs text-text-muted text-center mt-4">
            Please save these credentials. They won't be shown again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-6 sm:py-10 px-4">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="stat-card">
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Complete Registration</h1>
            <p className="text-sm text-text-muted mt-1">
              Referral by <span className="font-semibold text-primary">{codeInfo?.created_by}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <User size={16} /> Personal Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange} required
                    placeholder="John" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange} required
                    placeholder="Doe" className={inputClass} />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Mobile Number *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input name="mobile" value={form.mobile} onChange={handleChange} required type="tel"
                    placeholder="+91 9876543210" className={`${inputClass} pl-10`} />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Gender *</label>
                <div className="flex gap-3">
                  {['male', 'female'].map(g => (
                    <label key={g}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium ${
                        form.gender === g
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-text-secondary hover:border-gray-300'
                      }`}>
                      <input type="radio" name="gender" value={g} checked={form.gender === g}
                        onChange={handleChange} className="sr-only" />
                      {g === 'male' ? '♂ Male' : '♀ Female'}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Date of Birth *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input name="dob" value={form.dob} onChange={handleChange} required type="date"
                    className={`${inputClass} pl-10`} />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Address *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3 text-text-muted pointer-events-none" />
                  <textarea name="address" value={form.address} onChange={handleChange} required rows={3}
                    placeholder="Full address..."
                    className={`${inputClass} pl-10 pt-2.5 resize-none`} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelClass}>Email <span className="text-text-muted">(optional)</span></label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input name="email" value={form.email} onChange={handleChange} type="email"
                      placeholder="john@example.com" className={`${inputClass} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>PAN Card <span className="text-text-muted">(optional)</span></label>
                  <div className="relative">
                    <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input name="pan_card_id" value={form.pan_card_id} onChange={handleChange}
                      placeholder="ABCDE1234F" className={`${inputClass} pl-10 uppercase`} maxLength={10} />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Aadhaar Card <span className="text-text-muted">(optional)</span></label>
                <div className="relative">
                  <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input name="aadhaar_card" value={form.aadhaar_card} onChange={handleChange}
                    placeholder="1234 5678 9012" className={`${inputClass} pl-10`} maxLength={12} />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="border-t border-border pt-6">
              <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Building2 size={16} /> Bank Details <span className="text-xs text-text-muted font-normal">(optional)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input name="bank_account" value={form.bank_account} onChange={handleChange}
                    placeholder="Enter account number" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>IFSC Code</label>
                  <input name="bank_ifsc" value={form.bank_ifsc} onChange={handleChange}
                    placeholder="SBIN0001234" className={`${inputClass} uppercase`} />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Branch Name</label>
                <input name="bank_branch" value={form.bank_branch} onChange={handleChange}
                  placeholder="Enter branch name" className={inputClass} />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="btn-primary w-full py-3 text-base">
              {submitting ? (
                <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" />Submitting...</span>
              ) : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
