import React from 'react';
import { 
  Atom, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  GraduationCap, 
  BookOpen, 
  FileSpreadsheet,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../data/curriculum';
import { UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onOpenAuthModal }) => {
  const { user, logout, isAdmin, isTeacher, isStudent } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div 
          onClick={() => onTabChange(isStudent ? 'student_home' : 'dashboard')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200 transition-transform group-hover:scale-105">
            <Atom className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">CHEM10 <span className="text-blue-600 font-black">PRO</span></span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">GDPT 2018</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Nền tảng ôn tập Hóa học 10</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              {isTeacher && (
                <>
                  <button
                    onClick={() => onTabChange('dashboard')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentTab === 'dashboard'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => onTabChange('question_bank')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentTab === 'question_bank'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Ngân hàng câu hỏi
                  </button>
                  <button
                    onClick={() => onTabChange('exam_manager')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentTab === 'exam_manager'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Kho Đề thi
                  </button>
                  <button
                    onClick={() => onTabChange('create_set')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentTab === 'create_set'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Soạn đề
                  </button>
                  <button
                    onClick={() => onTabChange('assignments_manager')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden lg:block ${
                      currentTab === 'assignments_manager'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Quản lý bài giao
                  </button>
                  <button
                    onClick={() => onTabChange('classes_manager')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden lg:block ${
                      currentTab === 'classes_manager'
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Lớp học
                  </button>
                </>
              )}

              {/* Student Nav */}
              <button
                onClick={() => onTabChange('student_home')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  currentTab === 'student_home' || currentTab === 'practice_view'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Góc học sinh</span>
              </button>

              <button
                onClick={() => onTabChange('student_history')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden sm:block ${
                  currentTab === 'student_history'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Lịch sử & Tiến bộ
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">Trang ôn tập Hóa học 10 GDPT 2018</span>
            </div>
          )}
        </nav>

        {/* Action & User Zone */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Login Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Đã đăng nhập</span>
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium">
                {isAdmin ? (
                  <Shield className="w-3.5 h-3.5 text-red-600" />
                ) : isTeacher ? (
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className="capitalize font-semibold text-slate-700">
                  {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                </span>
              </div>

              {/* User email & logout */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{user.displayName}</span>
                <span className="text-[10px] text-slate-500 truncate max-w-[140px]">{user.email}</span>
              </div>

              <button
                onClick={() => logout()}
                title="Đăng xuất"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Chưa đăng nhập</span>
              </div>
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>Đăng nhập</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
