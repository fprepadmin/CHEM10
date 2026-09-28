import React, { useState, useEffect, useRef } from 'react';
import { 
  Atom, 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Users, 
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
  RefreshCw,
  FolderPlus,
  FileText,
  FileCode
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { QuestionBankView } from './components/QuestionBankView';
import { AddQuestionView } from './components/AddQuestionView';
import { WordImportView } from './components/WordImportView';
import { JsonImportView } from './components/JsonImportView';
import { CreateSetView } from './components/CreateSetView';
import { ExamManagerView } from './components/ExamManagerView';
import { AssignmentsManager } from './components/AssignmentsManager';
import { ClassesManager } from './components/ClassesManager';
import { StudentHomeView } from './components/StudentHomeView';
import { StudentClassView } from './components/StudentClassView';
import { PracticeView } from './components/PracticeView';
import { StudentHistoryView } from './components/StudentHistoryView';
import { Question, UserRole } from './types';

const MainLayout: React.FC = () => {
  const { user, loading, isStudent, isTeacher, isAdmin, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const mainContainerRef = useRef<HTMLElement>(null);
  
  // Parameter passing between screens
  const [activeSetId, setActiveSetId] = useState<string>('set-chuong1-basic');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | undefined>(undefined);
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>(undefined);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [preselectedQuestionIds, setPreselectedQuestionIds] = useState<string[]>([]);
  const [preselectedClassId, setPreselectedClassId] = useState<string | undefined>(undefined);
  const [bankChapterId, setBankChapterId] = useState<string | undefined>(undefined);
  const [preselectedChapterId, setPreselectedChapterId] = useState<string | undefined>(undefined);
  const [selectedOpenSetId, setSelectedOpenSetId] = useState<string | undefined>(undefined);
  const [jsonImportMode, setJsonImportMode] = useState<'bank' | 'exam'>('bank');

  // Automatically scroll main container to top whenever tab changes
  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [currentTab]);

  // Automatically redirect based on role when user authenticates
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'teacher') {
        if (['student_home', 'student_class', 'practice_view', 'student_history'].includes(currentTab) && currentTab !== 'practice_view') {
          // Keep current if intentional, or set to dashboard
        }
      } else {
        // Strict guard: student must only access student tabs
        if (!['student_home', 'student_class', 'practice_view', 'student_history'].includes(currentTab)) {
          setCurrentTab('student_home');
        }
      }
    }
  }, [user?.uid, user?.role, currentTab]);

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] ambient-glow text-slate-800 font-sans">
        <div className="flex flex-col items-center gap-5 p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xl shadow-cyan-500/5 max-w-xs w-full text-center">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 animate-pulse-subtle">
              <Atom className="w-9 h-9 animate-spin text-white" style={{ animationDuration: '4s' }} />
            </div>
            <div className="absolute -inset-1 bg-cyan-400/20 rounded-2xl blur-md -z-10 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
              <span>CHEM10</span>
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">AI PRO</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-2 justify-center">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
              <span>Đang đồng bộ dữ liệu...</span>
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
    if (!isTeacher && !['student_home', 'student_class', 'practice_view', 'student_history'].includes(tab)) {
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
    if (tab === 'create_set') {
      setPreselectedQuestionIds(param?.preselectedIds || []);
    }
    if (tab === 'assignments_manager') {
      setPreselectedClassId(param?.classId || undefined);
      setSelectedOpenSetId(param?.openSetId || undefined);
    }
    if (tab === 'json_import') {
      setJsonImportMode(param?.mode || 'bank');
      if (param?.initialChapterId) setBankChapterId(param.initialChapterId);
    }
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPractice = (setId: string, assignmentId?: string, chapterId?: string) => {
    setActiveSetId(setId);
    setActiveAssignmentId(assignmentId);
    setActiveChapterId(chapterId);
    setCurrentTab('practice_view');
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // DISTRACTION-FREE FOCUS MODE FOR EXAMS / PRACTICE
  if (currentTab === 'practice_view') {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col">
        <ErrorBoundary>
          <PracticeView
            setId={activeSetId}
            assignmentId={activeAssignmentId}
            chapterId={activeChapterId}
            onFinish={() => {
              setCurrentTab('student_history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExit={() => {
              setCurrentTab(isTeacher ? 'exam_manager' : 'student_home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </ErrorBoundary>
      </div>
    );
  }

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard': return isAdmin ? 'Admin Dashboard - Tổng quan Hệ thống' : 'Bảng điều khiển Giảng dạy';
      case 'question_bank': return 'Ngân hàng câu hỏi';
      case 'exam_manager': return 'Kho Đề thi & Khảo thí';
      case 'add_question': return editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới';
      case 'word_import': return 'Nạp câu hỏi vào Ngân hàng từ File Word (.docx)';
      case 'json_import': return 'Nạp Dữ liệu qua File JSON (Ngân hàng / Đề thi)';
      case 'create_set': return 'Soạn & Tạo Đề thi mới';
      case 'assignments_manager': return 'Quản lý Giao bài & Giám sát Kiểm tra';
      case 'classes_manager': return 'Quản lý Lớp học';
      case 'student_home': return 'Góc Học Sinh Luyện Tập';
      case 'student_class': return 'Lớp học của tôi';
      case 'practice_view': return 'Phòng Làm Bài Thi';
      case 'student_history': return 'Lịch Sử & Tiến Độ Học Tập';
      default: return 'Trang chủ';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] ambient-glow font-sans text-slate-800">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Clean Light Aside Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-md flex flex-col text-slate-700 border-r border-slate-200/80 shadow-sm transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div 
            onClick={() => handleNavigate(isStudent ? 'student_home' : 'dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-md shadow-cyan-500/25 group-hover:scale-105 group-hover:shadow-cyan-500/40 transition-all">
              <Atom className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 font-black leading-tight tracking-tight flex items-center gap-1 text-base">
                <span>CHEM10</span>
                <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Hóa học 10 THPT</p>
            </div>
          </div>

          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* Teacher & Admin Navigation */}
          {isTeacher && (
            <>
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-cyan-600" />
                <span>{isAdmin ? 'Quản trị hệ thống' : 'Giảng dạy & Quản lý'}</span>
              </div>

              <button
                onClick={() => handleNavigate('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'dashboard' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </div>
                <span>{isAdmin ? 'Admin Dashboard' : 'Bảng điều khiển'}</span>
              </button>

              <button
                onClick={() => handleNavigate('question_bank')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'question_bank'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'question_bank' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span>Ngân hàng câu hỏi</span>
              </button>

              <button
                onClick={() => handleNavigate('exam_manager')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'exam_manager'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'exam_manager' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-left">Kho Đề thi & Khảo thí</span>
              </button>

              <button
                onClick={() => handleNavigate('create_set')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'create_set'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'create_set' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <FolderPlus className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-left">Soạn bộ đề</span>
              </button>

              <button
                onClick={() => handleNavigate('assignments_manager')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'assignments_manager'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'assignments_manager' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <span>Quản lý giao bài</span>
              </button>

              <button
                onClick={() => handleNavigate('classes_manager')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'classes_manager'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'classes_manager' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>Quản lý lớp học</span>
              </button>

              <button
                onClick={() => handleNavigate('word_import')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'word_import'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'word_import' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <PlusCircle className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-left">Nạp Word</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold">DOCX</span>
              </button>

              <button
                onClick={() => handleNavigate('json_import', { mode: 'bank' })}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'json_import'
                    ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-lg ${currentTab === 'json_import' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <FileCode className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-left">Nạp JSON (Đề / NH)</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-bold">JSON</span>
              </button>
            </>
          )}

          {/* Student Portal Navigation */}
          <div className="px-3 pt-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-3 h-3 text-cyan-600" />
            <span>Học sinh Luyện tập</span>
          </div>

          <button
            onClick={() => handleNavigate('student_home')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'student_home'
                ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${currentTab === 'student_home' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span>Góc học sinh</span>
          </button>

          <button
            onClick={() => handleNavigate('exam_manager')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'exam_manager'
                ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${currentTab === 'exam_manager' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left">Kho Đề thi thử</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded-md font-bold">THI THỬ</span>
          </button>

          <button
            onClick={() => handleNavigate('student_class')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'student_class'
                ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${currentTab === 'student_class' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left">Lớp học của tôi</span>
            {user?.classId && (
              <span className="text-[9px] px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded-md font-bold">{user.classId}</span>
            )}
          </button>

          <button
            onClick={() => handleNavigate('student_history')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'student_history'
                ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200/80 shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${currentTab === 'student_history' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
              <History className="w-3.5 h-3.5" />
            </div>
            <span>Lịch sử & Tiến độ</span>
          </button>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đang trực tuyến</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-200/60 rounded">
              {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs ring-2 ring-white">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ND'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{user.email}</p>
              {user.role === 'student' && user.classId && (
                <p className="text-[10px] text-cyan-700 font-bold truncate">Lớp: {user.classId}</p>
              )}
            </div>
            <button
              onClick={() => logout()}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={mainContainerRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F8FAFC]">
        {/* Sleek Top Header Bar */}
        <header className="h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 lg:hidden rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-400">Trang chủ</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold tracking-tight">{getPageTitle()}</span>
            </div>
          </div>

          {/* Header Action Zone */}
          <div className="flex items-center gap-3">
            {/* Status & User Info Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/90 border border-slate-200/90 shadow-xs rounded-full text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800 truncate max-w-[150px]">{user.displayName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 uppercase">
                {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Giáo viên' : `Lớp ${user.classId || 'Học sinh'}`}
              </span>
            </div>

            {isTeacher ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate('add_question')}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold rounded-full shadow-md shadow-cyan-600/20 transition-all uppercase tracking-wide flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm câu hỏi</span>
                </button>
                <button
                  onClick={() => handleNavigate('create_set')}
                  className="hidden sm:flex px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-xs transition-all uppercase tracking-wide items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tạo bộ đề</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavigate('student_home')}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold rounded-full shadow-md shadow-cyan-600/20 transition-all uppercase tracking-wide cursor-pointer hover:scale-[1.02]"
              >
                Vào làm bài ôn tập
              </button>
            )}

            <button
              onClick={() => logout()}
              title="Đăng xuất"
              className="px-3.5 py-1.5 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
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
            {isTeacher && currentTab === 'word_import' && (
              <WordImportView 
                onNavigate={handleNavigate} 
                preselectedChapterId={preselectedChapterId || bankChapterId} 
              />
            )}
            {isTeacher && currentTab === 'json_import' && (
              <JsonImportView 
                onNavigate={handleNavigate} 
                initialMode={jsonImportMode}
                initialChapterId={preselectedChapterId || bankChapterId} 
              />
            )}
            {isTeacher && currentTab === 'exam_manager' && (
              <ExamManagerView onNavigate={handleNavigate} onStartPractice={handleStartPractice} />
            )}
            {isTeacher && currentTab === 'create_set' && (
              <CreateSetView onNavigate={handleNavigate} preselectedIds={preselectedQuestionIds} />
            )}
            {isTeacher && currentTab === 'assignments_manager' && (
              <AssignmentsManager 
                onNavigate={handleNavigate} 
                initialClassId={preselectedClassId} 
                openSetId={selectedOpenSetId} 
              />
            )}
            {isTeacher && currentTab === 'classes_manager' && <ClassesManager onNavigate={handleNavigate} />}
            
            {/* Student accessible views */}
            {currentTab === 'student_home' && (
              <StudentHomeView onStartPractice={handleStartPractice} onNavigate={handleNavigate} />
            )}
            {currentTab === 'exam_manager' && !isTeacher && (
              <ExamManagerView onNavigate={handleNavigate} onStartPractice={handleStartPractice} />
            )}
            {currentTab === 'student_class' && (
              <StudentClassView onStartPractice={handleStartPractice} onNavigate={handleNavigate} />
            )}
            {currentTab === 'practice_view' && (
              <PracticeView
                setId={activeSetId}
                assignmentId={activeAssignmentId}
                chapterId={activeChapterId}
                onFinish={() => setCurrentTab('student_history')}
                onExit={() => setCurrentTab('student_home')}
              />
            )}
            {currentTab === 'student_history' && <StudentHistoryView onNavigate={handleNavigate} />}

            {/* Fallback guard if non-teacher somehow lands on an admin tab */}
            {!isTeacher && !['student_home', 'exam_manager', 'student_class', 'practice_view', 'student_history'].includes(currentTab) && (
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
