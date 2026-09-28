import React, { useState, useEffect } from 'react';
import { 
  Atom, 
  LayoutDashboard, 
  BookOpen, 
  Sparkles, 
  GraduationCap, 
  Users, 
  FileSpreadsheet, 
  PlusCircle, 
  History, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Menu, 
  X, 
  Bell,
  ChevronRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { QuestionBankView } from './components/QuestionBankView';
import { AddQuestionView } from './components/AddQuestionView';
import { AIGeneratorView } from './components/AIGeneratorView';
import { BulkImportView } from './components/BulkImportView';
import { WordImportView } from './components/WordImportView';
import { CreateSetView } from './components/CreateSetView';
import { AssignmentsManager } from './components/AssignmentsManager';
import { ClassesManager } from './components/ClassesManager';
import { StudentHomeView } from './components/StudentHomeView';
import { PracticeView } from './components/PracticeView';
import { StudentHistoryView } from './components/StudentHistoryView';
import { Question, UserRole } from './types';

const MainLayout: React.FC = () => {
  const { user, loading, isStudent, isTeacher, isAdmin, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Parameter passing between screens
  const [activeSetId, setActiveSetId] = useState<string>('set-chuong1-basic');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | undefined>(undefined);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [preselectedQuestionIds, setPreselectedQuestionIds] = useState<string[]>([]);
  const [preselectedClassId, setPreselectedClassId] = useState<string | undefined>(undefined);
  const [bankChapterId, setBankChapterId] = useState<string | undefined>(undefined);
  const [preselectedChapterId, setPreselectedChapterId] = useState<string | undefined>(undefined);

  // Automatically redirect based on role when user authenticates
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'teacher') {
        if (['student_home', 'practice_view', 'student_history'].includes(currentTab) && currentTab !== 'practice_view') {
          // Keep current if intentional, or set to dashboard
        }
      } else {
        // Strict guard: student must only access student tabs
        if (!['student_home', 'practice_view', 'student_history'].includes(currentTab)) {
          setCurrentTab('student_home');
        }
      }
    }
  }, [user?.uid, user?.role, currentTab]);

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Atom className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-2">
              CHEM10 <span className="text-cyan-400">AI</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 justify-center">
              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
              <span>Đang xác thực phiên đăng nhập...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, display dedicated full-page LoginView
  if (!user) {
    return <LoginView />;
  }

  const handleNavigate = (tab: string, param?: any) => {
    // Strict RBAC Navigation Guard
    if (!isTeacher && !['student_home', 'practice_view', 'student_history'].includes(tab)) {
      setCurrentTab('student_home');
      setIsMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (tab === 'question_bank') {
      setBankChapterId(param?.initialChapterId || undefined);
    }
    if (tab === 'add_question') {
      setEditingQuestion(param?.editQuestion || null);
      setPreselectedChapterId(param?.preselectedChapterId || undefined);
    }
    if (tab === 'ai_generator') {
      setPreselectedChapterId(param?.preselectedChapterId || undefined);
    }
    if (tab === 'create_set') {
      setPreselectedQuestionIds(param?.preselectedIds || []);
    }
    if (tab === 'assignments_manager') {
      setPreselectedClassId(param?.classId || undefined);
    }
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPractice = (setId: string, assignmentId?: string) => {
    setActiveSetId(setId);
    setActiveAssignmentId(assignmentId);
    setCurrentTab('practice_view');
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard': return isAdmin ? 'Admin Dashboard - Tổng quan Hệ thống' : 'Bảng điều khiển Giảng dạy';
      case 'question_bank': return 'Ngân hàng câu hỏi';
      case 'add_question': return editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới';
      case 'ai_generator': return 'AI Trợ lý Tạo Đề & Câu Hỏi';
      case 'word_import': return 'Nhập câu hỏi từ File Word (.docx)';
      case 'bulk_import': return 'Nhập câu hỏi hàng loạt (Excel)';
      case 'create_set': return 'Tạo bộ đề ôn tập';
      case 'assignments_manager': return 'Quản lý Bộ đề & Giao bài';
      case 'classes_manager': return 'Quản lý Lớp học';
      case 'student_home': return 'Góc Học Sinh Luyện Tập';
      case 'practice_view': return 'Phòng Làm Bài Thi';
      case 'student_history': return 'Lịch Sử & Tiến Độ Học Tập';
      default: return 'Trang chủ';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sleek Dark Aside Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col text-slate-300 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
          <div 
            onClick={() => handleNavigate(isStudent ? 'student_home' : 'dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-white text-xl italic shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              C
            </div>
            <div>
              <h1 className="text-white font-bold leading-tight tracking-tight flex items-center gap-1.5 text-base">
                CHEM10 <span className="text-cyan-400">AI</span>
              </h1>
              <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">Educational Portal</p>
            </div>
          </div>

          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {/* Teacher & Admin Navigation */}
          {isTeacher && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {isAdmin ? 'Quản trị hệ thống (Admin)' : 'Giảng dạy & Quản lý'}
              </div>

              <button
                onClick={() => handleNavigate('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'dashboard'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'dashboard' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span>{isAdmin ? 'Admin Dashboard' : 'Bảng điều khiển'}</span>
              </button>

              <button
                onClick={() => handleNavigate('question_bank')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'question_bank'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'question_bank' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span>Ngân hàng câu hỏi</span>
              </button>

              <button
                onClick={() => handleNavigate('ai_generator')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'ai_generator'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'ai_generator' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span className="flex items-center gap-1.5">
                  <span>AI Trợ lý tạo đề</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded font-bold">GEN</span>
                </span>
              </button>

              <button
                onClick={() => handleNavigate('assignments_manager')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'assignments_manager' || currentTab === 'create_set'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'assignments_manager' || currentTab === 'create_set' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span>Quản lý giao bài</span>
              </button>

              <button
                onClick={() => handleNavigate('classes_manager')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'classes_manager'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'classes_manager' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span>Quản lý lớp học</span>
              </button>

              <button
                onClick={() => handleNavigate('word_import')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'word_import'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'word_import' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span className="flex items-center gap-1.5">
                  <span>Nhập từ Word (.docx)</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded font-bold">MỚI</span>
                </span>
              </button>

              <button
                onClick={() => handleNavigate('bulk_import')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'bulk_import'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'bulk_import' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span>Nhập Excel</span>
              </button>
            </>
          )}

          {/* Student Portal Navigation */}
          <div className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Học tập & Tự luyện
          </div>

          <button
            onClick={() => handleNavigate('student_home')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'student_home' || currentTab === 'practice_view'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'student_home' || currentTab === 'practice_view' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
            <span>Góc học sinh</span>
          </button>

          <button
            onClick={() => handleNavigate('student_history')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'student_history'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'student_history' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
            <span>Lịch sử & Tiến bộ</span>
          </button>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/70">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.email || 'muoint@fpt.edu.vn'}</p>
                <p className="text-[10px] text-cyan-400 font-medium">
                  {user.role === 'admin' ? 'Quản trị viên (Admin)' : user.role === 'teacher' ? 'Giáo viên bộ môn' : 'Học sinh Hóa 10'}
                </p>
              </div>
              <button
                onClick={() => logout()}
                title="Đăng xuất"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50">
        {/* Sleek Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 lg:hidden rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-400">Trang chủ</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold tracking-tight">{getPageTitle()}</span>
            </div>
          </div>

          {/* Header Action Zone */}
          <div className="flex items-center gap-3">
            {isTeacher ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate('add_question')}
                  className="px-4 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-full shadow-lg shadow-cyan-600/20 hover:bg-cyan-700 transition-all uppercase tracking-wide flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm câu hỏi</span>
                </button>
                <button
                  onClick={() => handleNavigate('ai_generator')}
                  className="hidden sm:flex px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-sm transition-all uppercase tracking-wide items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Tạo đề</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavigate('student_home')}
                className="px-4 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-full shadow-lg shadow-cyan-600/20 hover:bg-cyan-700 transition-all uppercase tracking-wide"
              >
                Vào làm bài ôn tập
              </button>
            )}

            <button
              onClick={() => logout()}
              title="Đăng xuất"
              className="px-3.5 py-1.5 border border-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-slate-700 text-xs font-bold rounded-full transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Content Canvas wrapped in ErrorBoundary with strict view authorization */}
        <div className="flex-1 p-6 sm:p-8 space-y-6">
          <ErrorBoundary>
            {/* Admin and Teacher restricted views */}
            {isTeacher && currentTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
            {isTeacher && currentTab === 'question_bank' && (
              <QuestionBankView onNavigate={handleNavigate} initialChapterId={bankChapterId} />
            )}
            {isTeacher && currentTab === 'add_question' && (
              <AddQuestionView 
                onNavigate={handleNavigate} 
                editQuestion={editingQuestion} 
                preselectedChapterId={preselectedChapterId} 
              />
            )}
            {isTeacher && currentTab === 'ai_generator' && (
              <AIGeneratorView 
                onNavigate={handleNavigate} 
                preselectedChapterId={preselectedChapterId} 
              />
            )}
            {isTeacher && currentTab === 'word_import' && <WordImportView onNavigate={handleNavigate} />}
            {isTeacher && currentTab === 'bulk_import' && <BulkImportView onNavigate={handleNavigate} />}
            {isTeacher && currentTab === 'create_set' && (
              <CreateSetView onNavigate={handleNavigate} preselectedIds={preselectedQuestionIds} />
            )}
            {isTeacher && currentTab === 'assignments_manager' && (
              <AssignmentsManager onNavigate={handleNavigate} initialClassId={preselectedClassId} />
            )}
            {isTeacher && currentTab === 'classes_manager' && <ClassesManager onNavigate={handleNavigate} />}
            
            {/* Student accessible views */}
            {currentTab === 'student_home' && (
              <StudentHomeView onStartPractice={handleStartPractice} onNavigate={handleNavigate} />
            )}
            {currentTab === 'practice_view' && (
              <PracticeView
                setId={activeSetId}
                assignmentId={activeAssignmentId}
                onFinish={() => setCurrentTab('student_history')}
                onExit={() => setCurrentTab('student_home')}
              />
            )}
            {currentTab === 'student_history' && <StudentHistoryView onNavigate={handleNavigate} />}

            {/* Fallback guard if non-teacher somehow lands on an admin tab */}
            {!isTeacher && !['student_home', 'practice_view', 'student_history'].includes(currentTab) && (
              <StudentHomeView onStartPractice={handleStartPractice} onNavigate={handleNavigate} />
            )}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ErrorBoundary>
  );
}
