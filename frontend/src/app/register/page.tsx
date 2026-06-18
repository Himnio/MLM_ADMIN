'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

function RegisterForm() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  const [step, setStep] = useState<'loading' | 'invalid' | 'form' | 'success'>('loading');
  const [codeInfo, setCodeInfo] = useState<{ referral_code: string; created_by: string } | null>(null);
  const [form, setForm] = useState({ name: '', username: '', email: '', pan_card_id: '', full_name: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ref) {
      setStep('invalid');
      return;
    }
    fetch(`${API_BASE}/referral-link/${ref}/validate`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setCodeInfo(data);
          setStep('form');
        } else {
          setStep('invalid');
        }
      })
      .catch(() => setStep('invalid'));
  }, [ref]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setStep('success');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-lg">Validating referral code...</div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">&#10060;</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Referral Link</h1>
          <p className="text-gray-600">This referral code is invalid or has expired. Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-green-500 text-6xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h1>
          <p className="text-gray-600">Your registration has been submitted successfully. We will get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Register</h1>
          <p className="text-gray-500 text-sm mt-1">
            Referral by <span className="font-semibold text-primary">{codeInfo?.created_by}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input name="username" value={form.username} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card ID</label>
            <input name="pan_card_id" value={form.pan_card_id} onChange={handleChange} required placeholder="e.g. ABCDE1234F"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-2.5 bg-primary hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
