import React, { useState } from 'react';
import { 
  Atom, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  School,
  Lock,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.');
      } else {
        setError(err.message || 'Đăng nhập bằng tài khoản Google không thành công.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] ambient-glow text-slate-800 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white relative overflow-hidden">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-float-slow" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top bar header */}
      <header className="h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-12 flex items-center justify-between shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-md shadow-cyan-500/25">
            <Atom className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 text-base tracking-tight">CHEM10</span>
              <span className="font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent text-base tracking-tight">AI</span>
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Nền tảng ôn tập Hóa học 10 THPT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Chưa đăng nhập</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chương trình GDPT 2018</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Intro & Features */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200/80 rounded-full text-cyan-800 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Hóa học 10 Thông Minh</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Học Hóa chủ động, <br />
                <span className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 bg-clip-text text-transparent">luyện thi bứt phá</span> cùng AI
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Hệ thống ôn luyện Hóa học 10 THPT theo chuẩn chương trình GDPT 2018. Tự động nhận diện lớp học và phân quyền giáo viên / học sinh qua tài khoản Google.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3.5 p-4 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-xs hover:border-cyan-300 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Quản trị viên & Giáo viên</h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">Đăng nhập tài khoản admin để quản lý ngân hàng câu hỏi, tạo đề thi AI và phân lớp học sinh.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-xs hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Học sinh theo Lớp</h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">Đăng nhập bằng Google, hệ thống tự động đưa bạn vào đúng lớp học và danh sách bài tập do giáo viên giao.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Single Google Login Box */}
          <div className="lg:col-span-6">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-slate-300/40 space-y-6 card-shine">
              
              <div className="text-center space-y-2 pb-2">
                <div className="w-14 h-14 bg-gradient-to-tr from-cyan-50 to-sky-100 border border-cyan-200/80 rounded-2xl flex items-center justify-center mx-auto text-cyan-600 shadow-sm">
                  <School className="w-7 h-7 text-cyan-600" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Trạng thái: Chưa đăng nhập</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Đăng nhập CHEM10 AI
                </h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  Sử dụng tài khoản Google duy nhất để đăng nhập. Hệ thống sẽ tự động điều hướng theo phân quyền giáo viên hoặc xếp lớp học sinh tương ứng.
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Single Google Sign-in Button */}
              <div className="space-y-4 pt-1">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={submitting}
                  className="w-full py-4 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-cyan-500 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{submitting ? 'Đang xác thực Google...' : 'Đăng nhập bằng tài khoản Google'}</span>
                </button>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-center">
                  <p className="text-[11px] text-slate-500 font-medium">
                    <span className="font-bold text-slate-700">Tự động hóa 100%:</span> Học sinh được xếp lớp tự động theo danh sách lớp của giáo viên phụ trách.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Góc nhỏ ghi dấu ấn */}
      <div className="fixed bottom-4 right-4 z-20 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-2xl px-3.5 py-2 shadow-md shadow-slate-200/50 text-right space-y-0.5 hover:border-cyan-300 transition-colors">
          <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-slate-800">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
            <span>Sản phẩm yêu thương của Cô Mụi Có Ô</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Phát triển bởi <span className="font-semibold text-cyan-700">Trần Ngọc Minh Thông</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 bg-white border-t border-slate-200">
        CHEM10 PRO • Hệ thống Ngân hàng Đề & Ôn tập Hóa học 10 GDPT 2018
      </footer>
    </div>
  );
};
