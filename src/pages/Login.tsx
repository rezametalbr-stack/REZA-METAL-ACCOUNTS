import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LogIn, User, Lock, AlertCircle, Building2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const { user, login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Invalid credentials. Access denied.');
      }
    } catch (err) {
      setError('System authentication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D11] px-4 overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full -ml-40 -mb-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-[#161B22]/80 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Header Section */}
          <div className="p-10 pb-6 text-center">
            <motion.div 
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="mx-auto h-24 w-24 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center text-amber-500 mb-8 shadow-[inset_0_0_30px_rgba(245,158,11,0.15)] relative group"
            >
              <div className="absolute inset-0 bg-amber-500/5 rounded-3xl animate-pulse group-hover:scale-110 transition-transform" />
              <Building2 size={48} strokeWidth={1.5} className="relative z-10" />
            </motion.div>
            
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">REZA METAL</h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-500/40"></span>
              <p className="text-amber-500 font-black uppercase tracking-[0.3em] text-[10px]">Industries</p>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-500/40"></span>
            </div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">
              Proprietary Management System
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-12 pr-5 py-4 bg-[#0B0D11] border border-slate-800 rounded-2xl text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                  placeholder="Username"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-5 py-4 bg-[#0B0D11] border border-slate-800 rounded-2xl text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                  placeholder="Access Key"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-black uppercase tracking-tight"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full relative overflow-hidden group py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 rounded-2xl font-black text-[#0B0D11] uppercase tracking-widest text-sm transition-all shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)] active:scale-[0.98]"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-[#0B0D11] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={20} strokeWidth={2.5} />
                    Authenticate Access
                  </>
                )}
              </div>
            </button>

            <div className="pt-4 flex flex-col items-center gap-6">
              <div className="h-px w-full bg-slate-800/50" />
              <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/50 rounded-full border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  End-to-End Encrypted Node
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]"
        >
          © 2026 REZA METAL INDUSTRY • SECURE OPERATIONS
        </motion.p>
      </motion.div>
    </div>
  );
}
