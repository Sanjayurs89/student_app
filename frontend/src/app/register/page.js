// app/register/page.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import API from '@/utils/api';
import { GraduationCap, User, Mail, Lock, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT', // Default selection
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Set role from query parameter if available
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && (roleParam.toUpperCase() === 'STUDENT' || roleParam.toUpperCase() === 'PROFESSOR')) {
      setFormData((prev) => ({ ...prev, role: roleParam.toUpperCase() }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleRoleSelect = (selectedRole) => {
    setFormData((prev) => ({ ...prev, role: selectedRole }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await API.post('/auth/register', formData);
      const { token } = res.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Always redirect to onboarding right after signup
      router.push('/onboarding');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md shadow-2xl relative z-10 flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <GraduationCap className="h-10 w-10 text-violet-500" />
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            CampusConnect
          </span>
        </Link>
        <h2 className="text-xl font-bold text-slate-100 mt-4">Create Your Account</h2>
        <p className="text-sm text-slate-400">Register with your college email domain</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 border border-slate-900 rounded-xl">
        <button
          type="button"
          onClick={() => handleRoleSelect('STUDENT')}
          className={`py-2 text-sm font-semibold rounded-lg transition-all ${
            formData.role === 'STUDENT'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Student
        </button>
        <button
          type="button"
          onClick={() => handleRoleSelect('PROFESSOR')}
          className={`py-2 text-sm font-semibold rounded-lg transition-all ${
            formData.role === 'PROFESSOR'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Professor
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              College Email
            </label>
            <span className="text-[10px] text-slate-500 italic">Domain restricted</span>
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="email"
              name="email"
              placeholder="student@college.edu"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-2 font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Sign Up <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background blur blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[80px] pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-md p-8 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
