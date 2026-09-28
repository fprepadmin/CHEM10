import React, { useState } from 'react';
import { 
  Atom, 
  ShieldCheck, 
  User, 
  Sparkles, 
  Lock, 
  Mail, 
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../data/curriculum';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await registerWithEmail(email, password, displayName || email.split('@')[0]);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Phương thức xác thực Email/Password đang được cấu hình. Vui lòng sử dụng Đăng nhập bằng tài khoản Google.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không chính xác. Nếu chưa có tài khoản, vui lòng chọn Đăng ký.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được đăng ký. Vui lòng chuyển sang Đăng nhập.');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu quá ngắn. Vui lòng nhập tối thiểu 6 ký tự.');
      } else {
        setError(err.message || 'Có lỗi xảy ra khi xác thực tài khoản');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.');
      } else {
        setError(err.message || 'Đăng nhập bằng tài khoản Google không thành công');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top bar header */}
      <header className="h-16 border-b border-slate-800/80 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-white text-xl italic shadow-md shadow-cyan-500/20">
            C
          </div>
          <div>
            <span className="font-black text-white text-base tracking-tight">CHEM10 <span className="text-cyan-400">AI</span></span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold text-cyan-400/80 tracking-widest">
              • Nền tảng ôn tập Hóa học 10
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>GDPT 2018 THPT</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Intro & Features */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chương trình GDPT 2018</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Học Hóa thông minh – Luyện tập chủ động
              </h1>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Hệ thống ngân hàng câu hỏi 8 dạng chuẩn cấu trúc mới, tích hợp AI Trợ lý tạo đề và kiểm duyệt chất lượng dành cho Giáo viên & Học sinh THPT.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Quản trị & Giảng dạy</h4>
                  <p className="text-[11px] text-slate-400">Quản lý câu hỏi, tạo đề thi tự động, giao bài tập cho lớp và theo dõi tiến độ.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Học sinh tự luyện tập</h4>
                  <p className="text-[11px] text-slate-400">Làm bài theo 7 chương, thi thử 15 phút, 45 phút có chấm điểm & giải thích tức thì.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Box */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white">
                  {isRegister ? 'Đăng ký tài khoản học sinh' : 'Đăng nhập hệ thống'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRegister ? 'Tạo tài khoản để lưu lại tiến độ và kết quả làm bài' : 'Đăng nhập bằng tài khoản Google hoặc Email của bạn'}
                </p>
              </div>

              {/* Google Sign-in Action */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={submitting}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Đăng nhập nhanh bằng Google</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500">hoặc dùng Email & Mật khẩu</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {isRegister && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Họ và tên học sinh</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Nguyễn Văn An"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Địa chỉ Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="tenban@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Tối thiểu 6 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all disabled:opacity-50 mt-2"
                >
                  {submitting ? 'Đang xác thực...' : isRegister ? 'Hoàn tất Đăng ký' : 'Đăng nhập'}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-800 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  {isRegister ? 'Đã có tài khoản? Nhấn để Đăng nhập' : 'Chưa có tài khoản? Nhấn để Đăng ký'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-600 border-t border-slate-900">
        CHEM10 AI • Nền tảng ôn tập Hóa học 10 THPT
      </footer>
    </div>
  );
};
