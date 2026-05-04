import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { user, signIn, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D11] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#161B22] border border-slate-800 rounded-3xl shadow-2xl p-10 space-y-10"
      >
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mb-6 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <LogIn size={40} />
          </div>
          <h2 className="text-3xl font-black text-white font-sans tracking-tight">REZA METAL</h2>
          <div className="mt-1 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-amber-500/30"></div>
            <p className="text-amber-500 font-bold uppercase tracking-widest text-[10px]">Industries</p>
            <div className="h-px w-8 bg-amber-500/30"></div>
          </div>
          <p className="mt-6 text-slate-500 font-medium text-sm">Business Management System</p>
        </div>
        
        <div className="space-y-6">
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#0B0D11] border border-slate-700 rounded-2xl font-bold text-white hover:bg-slate-800 hover:border-amber-500/50 transition-all shadow-lg active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
            Sign in with Google
          </button>
          
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-center text-slate-600 uppercase font-black tracking-widest">
              Secure Authentication
            </p>
            <p className="text-xs text-center text-slate-500 max-w-[280px] leading-relaxed">
              Access your business dashboard using your authorized corporate Google account.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
