import React from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200 w-full max-w-md text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl mb-8">
          <LayoutDashboard size={48} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">SalesMaster</h1>
        <p className="text-slate-500 mb-10">Hệ thống quản lý bán hàng thông minh</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-xl font-medium hover:bg-slate-800 transition-all active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Đăng nhập với Google
        </button>
        
        <p className="mt-8 text-xs text-slate-400">
          Bằng cách đăng nhập, bạn đồng ý với các điều khoản dịch vụ của chúng tôi.
        </p>
      </motion.div>
    </div>
  );
}
