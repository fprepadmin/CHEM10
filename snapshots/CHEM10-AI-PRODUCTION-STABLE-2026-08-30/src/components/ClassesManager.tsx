import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  UserPlus, 
  BookOpen, 
  GraduationCap, 
  ArrowLeft, 
  Mail, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Archive, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Eye, 
  ChevronRight, 
  BarChart2, 
  TrendingUp, 
  Sparkles, 
  Send, 
  Copy, 
  ArrowRight, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  ShieldCheck,
  Check,
  Calendar,
  Layers,
  Award,
  Clock,
  History,
  FileText,
  UserCheck,
  UserX
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { classService, assignmentService, submissionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { 
  ClassRoom, 
  StudentInClass, 
  BulkStudentParsedItem, 
  BulkImportReport, 
  Assignment, 
  Submission, 
  ClassOperationLog 
} from '../types';

interface ClassesManagerProps {
  onNavigate: (tab: string, param?: any) => void;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({ onNavigate }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  
  // Class lists & main selection
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'students' | 'assignments' | 'results' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Selected Class details data
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [classAssignments, setClassAssignments] = useState<Assignment[]>([]);
  const [classSubmissions, setClassSubmissions] = useState<Submission[]>([]);
  const [classLogs, setClassLogs] = useState<ClassOperationLog[]>([]);
  const [loadingClassDetails, setLoadingClassDetails] = useState(false);

  // Student filtering & search in class detail
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'NO_SUBMISSIONS' | 'COMPLETED' | 'HIGH_SCORE' | 'LOW_SCORE'>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isSingleAddModalOpen, setIsSingleAddModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isRemoveStudentModalOpen, setIsRemoveStudentModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isStudentSubmissionsModalOpen, setIsStudentSubmissionsModalOpen] = useState(false);

  // Active student for action menu
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<StudentInClass | null>(null);
  const [studentSubmissionsList, setStudentSubmissionsList] = useState<Submission[]>([]);
  const [targetTransferClassId, setTargetTransferClassId] = useState('');

  // Add / Edit Form State
  const [formClassName, setFormClassName] = useState('');
  const [formGrade, setFormGrade] = useState<number>(10);
  const [formSubject, setFormSubject] = useState('Hóa học');
  const [formAcademicYear, setFormAcademicYear] = useState('2026 - 2027');
  const [formTeacherName, setFormTeacherName] = useState('Thầy Mười NT');
  const [formTeacherEmail, setFormTeacherEmail] = useState('muoint@fpt.edu.vn');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Single Add student form
  const [singleStudentEmail, setSingleStudentEmail] = useState('');
  const [singleStudentName, setSingleStudentName] = useState('');

  // Bulk Email State
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkStep, setBulkStep] = useState<'INPUT' | 'PREVIEW' | 'RESULT'>('INPUT');
  const [bulkReport, setBulkReport] = useState<BulkImportReport | null>(null);
  const [bulkParsedItems, setBulkParsedItems] = useState<BulkStudentParsedItem[]>([]);
  const [bulkIsProcessing, setBulkIsProcessing] = useState(false);
  const [bulkResultSummary, setBulkResultSummary] = useState<{
    success: number;
    duplicate: number;
    invalid: number;
    failed: number;
    newTotal: number;
  } | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Load classes
  const loadClasses = async () => {
    setLoading(true);
    try {
      const list = await classService.getClasses();
      setClasses(list);
      
      // Update selected class if already open
      if (selectedClass) {
        const refreshed = list.find(c => c.id === selectedClass.id);
        if (refreshed) {
          setSelectedClass(refreshed);
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi tải danh sách lớp học", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // Load details for selected class
  const loadSelectedClassData = async (classRoom: ClassRoom) => {
    setLoadingClassDetails(true);
    try {
      const [studentList, allAssignments, allSubs, logs] = await Promise.all([
        classService.getStudentsWithStatsForClass(classRoom.id),
        assignmentService.getAssignments(),
        submissionService.getAllSubmissions(),
        classService.getClassLogs(classRoom.id)
      ]);

      const classAssigns = allAssignments.filter(a => 
        a.classId === classRoom.id || (a.classIds && a.classIds.includes(classRoom.id))
      );

      const targetEmails = new Set((classRoom.studentEmails || []).map(e => e.toLowerCase().trim()));
      const classSubs = allSubs.filter(s => targetEmails.has(s.studentEmail.toLowerCase().trim()));

      setStudents(studentList);
      setClassAssignments(classAssigns);
      setClassSubmissions(classSubs);
      setClassLogs(logs);
    } catch (err) {
      console.error("Error loading class details:", err);
      showToast("Lỗi khi tải dữ liệu chi tiết lớp học", "error");
    } finally {
      setLoadingClassDetails(false);
    }
  };

  // Handle open class detail
  const handleSelectClass = (cls: ClassRoom, tab: 'overview' | 'students' | 'assignments' | 'results' | 'settings' = 'overview') => {
    setSelectedClass(cls);
    setActiveDetailTab(tab);
    loadSelectedClassData(cls);
  };

  // Handle Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formClassName.trim()) {
      setFormError('Vui lòng nhập tên lớp học');
      return;
    }

    try {
      await classService.createClass({
        name: formClassName.trim(),
        grade: formGrade,
        subject: formSubject.trim() || 'Hóa học',
        academicYear: formAcademicYear.trim() || '2026 - 2027',
        teacherName: formTeacherName.trim() || 'Thầy Mười NT',
        teacherEmail: formTeacherEmail.trim() || 'muoint@fpt.edu.vn',
        description: formDescription.trim(),
        studentEmails: [],
        studentCount: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      });

      showToast(`Đã tạo thành công lớp ${formClassName.trim()}`);
      setIsCreateModalOpen(false);
      setFormClassName('');
      setFormDescription('');
      loadClasses();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi tạo lớp học');
    }
  };

  // Handle Edit Class
  const handleOpenEditModal = (cls: ClassRoom) => {
    setFormClassName(cls.name);
    setFormGrade(cls.grade || 10);
    setFormSubject(cls.subject || 'Hóa học');
    setFormAcademicYear(cls.academicYear || '2026 - 2027');
    setFormTeacherName(cls.teacherName);
    setFormTeacherEmail(cls.teacherEmail);
    setFormDescription(cls.description || '');
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setFormError('');

    try {
      await classService.updateClass(selectedClass.id, {
        name: formClassName.trim(),
        grade: formGrade,
        subject: formSubject.trim(),
        academicYear: formAcademicYear.trim(),
        teacherName: formTeacherName.trim(),
        teacherEmail: formTeacherEmail.trim(),
        description: formDescription.trim()
      });

      showToast(`Đã cập nhật thông tin lớp ${formClassName.trim()}`);
      setIsEditModalOpen(false);
      loadClasses();
      if (selectedClass) {
        setSelectedClass({
          ...selectedClass,
          name: formClassName.trim(),
          grade: formGrade,
          subject: formSubject.trim(),
          academicYear: formAcademicYear.trim(),
          teacherName: formTeacherName.trim(),
          teacherEmail: formTeacherEmail.trim(),
          description: formDescription.trim()
        });
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi cập nhật lớp học');
    }
  };

  // Handle Archive / Restore Class
  const handleArchiveClass = async () => {
    if (!selectedClass) return;
    try {
      await classService.archiveClass(selectedClass.id, {
        uid: user?.uid || 'admin',
        email: user?.email || 'muoint@fpt.edu.vn'
      });
      showToast(`Đã lưu trữ lớp ${selectedClass.name}`, 'warning');
      setIsArchiveModalOpen(false);
      loadClasses();
      setSelectedClass(null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu trữ lớp', 'error');
    }
  };

  const handleRestoreClass = async (cls: ClassRoom) => {
    try {
      await classService.restoreClass(cls.id);
      showToast(`Đã khôi phục hoạt động cho lớp ${cls.name}`);
      loadClasses();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi khôi phục lớp', 'error');
    }
  };

  // --- BULK ADD VIA EMAIL ENGINE ---
  const handleOpenBulkAddModal = () => {
    setBulkInputText('');
    setBulkStep('INPUT');
    setBulkReport(null);
    setBulkParsedItems([]);
    setBulkResultSummary(null);
    setIsBulkAddModalOpen(true);
  };

  const handleAnalyzeBulkEmails = async () => {
    if (!selectedClass) return;
    if (!bulkInputText.trim()) {
      showToast("Vui lòng nhập hoặc dán danh sách email học sinh", "warning");
      return;
    }

    setBulkIsProcessing(true);
    try {
      const report = await classService.parseAndAnalyzeStudentBatch(selectedClass.id, bulkInputText);
      setBulkReport(report);
      setBulkParsedItems(report.items);
      setBulkStep('PREVIEW');
    } catch (err: any) {
      showToast(err.message || "Lỗi khi phân tích danh sách email", "error");
    } finally {
      setBulkIsProcessing(false);
    }
  };

  const handleToggleParsedItem = (id: string) => {
    setBulkParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    }));
  };

  const handleToggleSelectAllValid = (selectAll: boolean) => {
    setBulkParsedItems(prev => prev.map(item => {
      if (item.status === 'VALID' || item.status === 'EXISTING_USER_NEW_TO_CLASS' || item.status === 'NEW_ACCOUNT_NEEDED') {
        return { ...item, selected: selectAll };
      }
      return item;
    }));
  };

  const handleUpdateItemDisplayName = (id: string, newName: string) => {
    setBulkParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, displayName: newName };
      }
      return item;
    }));
  };

  const handleConfirmBulkAdd = async () => {
    if (!selectedClass) return;
    const selectedValidItems = bulkParsedItems.filter(i => 
      i.selected && (i.status === 'VALID' || i.status === 'EXISTING_USER_NEW_TO_CLASS' || i.status === 'NEW_ACCOUNT_NEEDED')
    );

    if (selectedValidItems.length === 0) {
      showToast("Không có học sinh hợp lệ nào được chọn để thêm", "warning");
      return;
    }

    setBulkIsProcessing(true);
    try {
      const result = await classService.bulkAddStudentsToClass(
        selectedClass.id,
        selectedValidItems.map(i => ({ email: i.email, displayName: i.displayName })),
        {
          uid: user?.uid || 'teacher-admin',
          email: user?.email || 'muoint@fpt.edu.vn'
        }
      );

      setBulkResultSummary(result);
      setBulkStep('RESULT');

      // Refresh parent data & class details immediately
      await loadClasses();
      const updatedClass = await classService.getClassById(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        loadSelectedClassData(updatedClass);
      }

      showToast(`🎉 Đã thêm thành công ${result.success} học sinh vào lớp ${selectedClass.name}!`);
    } catch (err: any) {
      showToast(err.message || "Lỗi khi thêm danh sách học sinh vào lớp", "error");
    } finally {
      setBulkIsProcessing(false);
    }
  };

  // Single student add
  const handleSingleStudentAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !singleStudentEmail.trim()) return;

    const email = singleStudentEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      showToast("Email không hợp lệ. Vui lòng kiểm tra lại!", "error");
      return;
    }

    if ((selectedClass.studentEmails || []).map(e => e.toLowerCase()).includes(email)) {
      showToast("Học sinh này đã có trong lớp!", "warning");
      return;
    }

    try {
      await classService.bulkAddStudentsToClass(
        selectedClass.id,
        [{ email, displayName: singleStudentName.trim() || undefined }],
        {
          uid: user?.uid || 'admin',
          email: user?.email || 'muoint@fpt.edu.vn'
        }
      );

      showToast(`Đã thêm học sinh ${email} vào lớp ${selectedClass.name}`);
      setIsSingleAddModalOpen(false);
      setSingleStudentEmail('');
      setSingleStudentName('');

      await loadClasses();
      const updatedClass = await classService.getClassById(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        loadSelectedClassData(updatedClass);
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi thêm học sinh", "error");
    }
  };

  // Remove student from class
  const handleRemoveStudentConfirm = async () => {
    if (!selectedClass || !selectedStudentForAction) return;
    try {
      await classService.removeStudentFromClass(
        selectedClass.id,
        selectedStudentForAction.email,
        {
          uid: user?.uid || 'admin',
          email: user?.email || 'muoint@fpt.edu.vn'
        }
      );

      showToast(`Đã xóa học sinh ${selectedStudentForAction.displayName} khỏi lớp ${selectedClass.name}`);
      setIsRemoveStudentModalOpen(false);
      setSelectedStudentForAction(null);

      await loadClasses();
      const updatedClass = await classService.getClassById(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        loadSelectedClassData(updatedClass);
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa học sinh", "error");
    }
  };

  // Transfer student to another class
  const handleTransferStudentConfirm = async () => {
    if (!selectedClass || !selectedStudentForAction || !targetTransferClassId) {
      showToast("Vui lòng chọn lớp học đích để chuyển", "warning");
      return;
    }

    try {
      await classService.transferStudent(
        selectedClass.id,
        targetTransferClassId,
        selectedStudentForAction.email,
        {
          uid: user?.uid || 'admin',
          email: user?.email || 'muoint@fpt.edu.vn'
        }
      );

      const targetClassObj = classes.find(c => c.id === targetTransferClassId);
      showToast(`Đã chuyển học sinh ${selectedStudentForAction.displayName} sang lớp ${targetClassObj?.name || targetTransferClassId}`);
      setIsTransferModalOpen(false);
      setSelectedStudentForAction(null);

      await loadClasses();
      const updatedClass = await classService.getClassById(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        loadSelectedClassData(updatedClass);
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi chuyển lớp cho học sinh", "error");
    }
  };

  // View student submissions modal
  const handleViewStudentSubmissions = (student: StudentInClass) => {
    const studentSubs = classSubmissions.filter(s => s.studentEmail.toLowerCase() === student.email.toLowerCase());
    setSelectedStudentForAction(student);
    setStudentSubmissionsList(studentSubs);
    setIsStudentSubmissionsModalOpen(true);
  };

  // Excel template generator & download
  const handleDownloadExcelTemplate = () => {
    const sampleRows = [
      { STT: 1, 'Họ và tên': 'Nguyễn Văn An', Email: 'nguyenvanan@fpt.edu.vn' },
      { STT: 2, 'Họ và tên': 'Trần Thị Bình', Email: 'tranthibinh@fpt.edu.vn' },
      { STT: 3, 'Họ và tên': 'Lê Hoàng Cường', Email: 'lehoangcuong@fpt.edu.vn' },
      { STT: 4, 'Họ và tên': 'Phạm Thị Dung', Email: 'phamthidung@fpt.edu.vn' },
      { STT: 5, 'Họ và tên': 'Hoàng Minh Đức', Email: 'hoangminhduc@fpt.edu.vn' }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh.xlsx');
    showToast("Đã tải xuống file mẫu Mau_Danh_Sach_Hoc_Sinh.xlsx");
  };

  // Excel file upload & parsing
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstWsName = wb.SheetNames[0];
        const ws = wb.Sheets[firstWsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawData || rawData.length === 0) {
          showToast("File Excel không có dữ liệu!", "warning");
          return;
        }

        // Detect columns from headers
        const headerRow: string[] = rawData[0].map((h: any) => String(h || '').trim());
        let emailColIdx = -1;
        let nameColIdx = -1;

        headerRow.forEach((h, idx) => {
          const lower = h.toLowerCase();
          if (lower.includes('email') || lower.includes('mail')) {
            emailColIdx = idx;
          }
          if (lower.includes('họ') || lower.includes('tên') || lower.includes('name') || lower.includes('hoc sinh')) {
            nameColIdx = idx;
          }
        });

        // If not found in headers, scan first 3 rows
        if (emailColIdx === -1) {
          for (let r = 0; r < Math.min(5, rawData.length); r++) {
            const row = rawData[r];
            if (Array.isArray(row)) {
              row.forEach((cell, idx) => {
                if (String(cell).includes('@')) {
                  emailColIdx = idx;
                }
              });
            }
          }
        }

        if (emailColIdx === -1) {
          showToast("Không tìm thấy cột Email trong file Excel!", "error");
          return;
        }

        // Build plain text for parser
        const lines: string[] = [];
        for (let r = 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.length === 0) continue;
          const email = String(row[emailColIdx] || '').trim();
          const name = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim() : '';
          if (email && email.includes('@')) {
            lines.push(name ? `${name} | ${email}` : email);
          }
        }

        if (lines.length === 0) {
          showToast("Không tìm thấy địa chỉ email hợp lệ nào trong file!", "warning");
          return;
        }

        setBulkInputText(lines.join('\n'));
        setIsExcelImportModalOpen(false);
        setIsBulkAddModalOpen(true);
        setBulkStep('INPUT');

        // Directly analyze
        if (selectedClass) {
          setBulkIsProcessing(true);
          const report = await classService.parseAndAnalyzeStudentBatch(selectedClass.id, lines.join('\n'));
          setBulkReport(report);
          setBulkParsedItems(report.items);
          setBulkStep('PREVIEW');
          setBulkIsProcessing(false);
        }
      } catch (err: any) {
        console.error("Excel import error:", err);
        showToast("Lỗi khi đọc file Excel: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export current student list with grades to Excel
  const handleExportClassToExcel = () => {
    if (!selectedClass) return;

    const data = students.map((s, idx) => ({
      STT: idx + 1,
      'Họ và tên': s.displayName,
      Email: s.email,
      'Trạng thái': s.status === 'ACTIVE' ? 'Đã tham gia' : 'Chờ kích hoạt',
      'Số bài đã nộp': s.submissionsCount,
      'Điểm trung bình': s.avgScore,
      'Số bài hoàn thành': s.completedCount,
      'Bài chưa làm': s.pendingCount,
      'Ngày tham gia': s.joinedAt ? new Date(s.joinedAt).toLocaleDateString('vi-VN') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Lop_${selectedClass.name}`);
    XLSX.writeFile(wb, `Danh_Sach_${selectedClass.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    showToast(`Đã xuất danh sách lớp ${selectedClass.name} sang Excel`);
  };

  // Sample bulk paste helpers
  const handlePasteSample5 = () => {
    const sample = `nguyenvanan@fpt.edu.vn
tranthibinh@fpt.edu.vn
lehoangcuong@fpt.edu.vn
phamthidung@fpt.edu.vn
hoangminhduc@fpt.edu.vn`;
    setBulkInputText(sample);
  };

  const handlePasteSampleWithNames = () => {
    const sample = `Nguyễn Văn An | nguyenvanan@fpt.edu.vn
Trần Thị Bình | tranthibinh@fpt.edu.vn
Lê Hoàng Cường | lehoangcuong@fpt.edu.vn
Phạm Thị Dung | phamthidung@fpt.edu.vn
Hoàng Minh Đức | hoangminhduc@fpt.edu.vn`;
    setBulkInputText(sample);
  };

  // Filtered Class List
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (statusFilter === 'ACTIVE' && c.status === 'ARCHIVED') return false;
      if (statusFilter === 'ARCHIVED' && c.status !== 'ARCHIVED') return false;
      if (classSearchTerm.trim()) {
        const term = classSearchTerm.toLowerCase();
        return (
          c.name.toLowerCase().includes(term) ||
          c.teacherName.toLowerCase().includes(term) ||
          c.teacherEmail.toLowerCase().includes(term) ||
          (c.academicYear && c.academicYear.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [classes, classSearchTerm, statusFilter]);

  // Filtered Students in Class Detail
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (studentSearch.trim()) {
        const term = studentSearch.toLowerCase();
        if (!s.displayName.toLowerCase().includes(term) && !s.email.toLowerCase().includes(term)) {
          return false;
        }
      }

      if (studentStatusFilter === 'ACTIVE' && s.status !== 'ACTIVE') return false;
      if (studentStatusFilter === 'PENDING' && s.status !== 'PENDING') return false;
      if (studentStatusFilter === 'NO_SUBMISSIONS' && s.submissionsCount > 0) return false;
      if (studentStatusFilter === 'COMPLETED' && s.pendingCount > 0) return false;
      if (studentStatusFilter === 'HIGH_SCORE' && s.avgScore < 8.0) return false;
      if (studentStatusFilter === 'LOW_SCORE' && s.avgScore >= 6.5) return false;

      return true;
    });
  }, [students, studentSearch, studentStatusFilter]);

  // Calculated Class Stats
  const classStats = useMemo(() => {
    const total = students.length;
    const activeSubmittingStudents = students.filter(s => s.submissionsCount > 0).length;
    const noSubmissionStudents = total - activeSubmittingStudents;
    
    const validScores = students.filter(s => s.submissionsCount > 0).map(s => s.avgScore);
    const avgScore = validScores.length > 0
      ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1))
      : 0;

    const excellentCount = students.filter(s => s.avgScore >= 8.0 && s.submissionsCount > 0).length;
    const goodCount = students.filter(s => s.avgScore >= 6.5 && s.avgScore < 8.0 && s.submissionsCount > 0).length;
    const needImprovementCount = students.filter(s => (s.avgScore < 6.5 || s.submissionsCount === 0)).length;

    return {
      total,
      activeSubmittingStudents,
      noSubmissionStudents,
      avgScore,
      excellentCount,
      goodCount,
      needImprovementCount
    };
  }, [students]);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-fade-in text-xs font-semibold ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : toast.type === 'warning' 
            ? 'bg-amber-50 border-amber-200 text-amber-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: CLASS LIST VIEW (QUẢN LÝ LỚP HỌC) */}
      {/* ========================================================================= */}
      {!selectedClass ? (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Quản lý lớp học</h1>
              <p className="text-xs text-slate-500 mt-1">
                Danh sách lớp học THPT FPT phụ trách môn Hóa học 10
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFormClassName('');
                  setFormGrade(10);
                  setFormSubject('Hóa học');
                  setFormAcademicYear('2026 - 2027');
                  setFormTeacherName(user?.displayName || 'Thầy Mười NT');
                  setFormTeacherEmail(user?.email || 'muoint@fpt.edu.vn');
                  setFormDescription('');
                  setFormError('');
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo lớp học mới</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên lớp, giáo viên phụ trách, năm học..."
                value={classSearchTerm}
                onChange={(e) => setClassSearchTerm(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Đang hoạt động ({classes.filter(c => (c.status || 'ACTIVE') !== 'ARCHIVED').length})
              </button>
              <button
                onClick={() => setStatusFilter('ARCHIVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ARCHIVED'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Đã lưu trữ ({classes.filter(c => c.status === 'ARCHIVED').length})
              </button>
            </div>
          </div>

          {/* Classes Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-600" />
              <span>Đang tải danh sách lớp học...</span>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Không tìm thấy lớp học nào</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Hãy tạo lớp học mới để quản lý học sinh và giao bài tập.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20"
              >
                + Tạo lớp học ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClasses.map(c => {
                const isArchived = c.status === 'ARCHIVED';
                return (
                  <div 
                    key={c.id} 
                    className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:shadow-md ${
                      isArchived ? 'border-slate-300 opacity-75' : 'border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <div className="p-6">
                      {/* Top badges */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 bg-cyan-50 text-cyan-800 font-bold rounded-md text-[11px] border border-cyan-200">
                            Khối {c.grade || 10}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md text-[11px]">
                            {c.academicYear || '2026 - 2027'}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Users className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{c.studentEmails ? c.studentEmails.length : (c.studentCount || 0)} học sinh</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 
                        onClick={() => handleSelectClass(c)}
                        className="text-base font-bold text-slate-900 mb-2 cursor-pointer hover:text-cyan-600 transition-colors group-hover:translate-x-0.5"
                      >
                        {c.name}
                      </h3>

                      {c.description && (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>
                      )}

                      {/* Teacher info */}
                      <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span className="truncate">
                            Giáo viên: <strong>{c.teacherName}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.teacherEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Card Footer */}
                    <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                      {isArchived ? (
                        <button
                          onClick={() => handleRestoreClass(c)}
                          className="text-amber-700 font-bold hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Khôi phục lớp</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate('assignments_manager', { classId: c.id })}
                          className="text-cyan-700 font-bold hover:text-cyan-800 flex items-center gap-1 group/btn"
                        >
                          <span>Giao bài cho lớp này</span>
                          <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectClass(c)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-full font-bold text-[11px] border border-slate-200 transition-colors shadow-2xs"
                        >
                          Chi tiết lớp
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: CHI TIẾT LỚP HỌC (CLASS DETAILS - 5 TABS) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Breadcrumb & Actions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedClass(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
                title="Quay lại danh sách lớp"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                    Khối {selectedClass.grade || 10} • {selectedClass.subject || 'Hóa học'}
                  </span>
                  <span className="text-slate-400 text-xs">• {selectedClass.academicYear || '2026 - 2027'}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {selectedClass.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('assignments_manager', { classId: selectedClass.id })}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Giao bài cho lớp này</span>
              </button>
            </div>
          </div>

          {/* 5 Tabs Navigation */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center overflow-x-auto gap-1">
            <button
              onClick={() => setActiveDetailTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                activeDetailTab === 'overview'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tổng quan</span>
            </button>

            <button
              onClick={() => setActiveDetailTab('students')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                activeDetailTab === 'students'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>👥 Danh sách học sinh ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveDetailTab('assignments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                activeDetailTab === 'assignments'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Giao bài ({classAssignments.length})</span>
            </button>

            <button
              onClick={() => setActiveDetailTab('results')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                activeDetailTab === 'results'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Kết quả học tập</span>
            </button>

            <button
              onClick={() => setActiveDetailTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                activeDetailTab === 'settings'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cài đặt lớp</span>
            </button>
          </div>

          {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
          {activeDetailTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Sĩ số lớp</div>
                  <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                    <span>{students.length}</span>
                    <span className="text-xs font-semibold text-slate-500">học sinh</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-cyan-600">Bài đang giao</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {classAssignments.filter(a => a.status === 'ACTIVE').length}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-emerald-600">Đã hoàn thành</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {classStats.activeSubmittingStudents}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-amber-600">Chưa hoàn thành</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {classStats.noSubmissionStudents}
                  </div>
                </div>
              </div>

              {/* Class Info Card & Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-600" />
                    <span>Thông tin lớp học</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Tên lớp</span>
                      <strong className="text-slate-900">{selectedClass.name}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Khối</span>
                      <strong className="text-slate-900">Khối {selectedClass.grade || 10}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Môn học</span>
                      <strong className="text-slate-900">{selectedClass.subject || 'Hóa học'}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Giáo viên phụ trách</span>
                      <strong className="text-slate-900">{selectedClass.teacherName}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Email giáo viên</span>
                      <strong className="text-slate-900 truncate block">{selectedClass.teacherEmail}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Năm học</span>
                      <strong className="text-slate-900">{selectedClass.academicYear || '2026 - 2027'}</strong>
                    </div>
                  </div>

                  {selectedClass.description && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Mô tả lớp học</span>
                      {selectedClass.description}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-600" />
                      <span>Thao tác nhanh</span>
                    </h3>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleOpenBulkAddModal()}
                        className="w-full p-2.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-cyan-200 transition-colors"
                      >
                        <Mail className="w-4 h-4 text-cyan-600" />
                        <span>Thêm học sinh hàng loạt bằng Email</span>
                      </button>

                      <button
                        onClick={() => setIsExcelImportModalOpen(true)}
                        className="w-full p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Nhập danh sách từ Excel (.xlsx)</span>
                      </button>

                      <button
                        onClick={() => handleDownloadExcelTemplate()}
                        className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Tải file Excel mẫu</span>
                      </button>

                      <button
                        onClick={() => handleExportClassToExcel()}
                        className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Xuất danh sách học sinh</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100 text-[11px] text-cyan-800">
                    💡 Điểm trung bình môn: <strong>{classStats.avgScore} / 10</strong> ({classStats.excellentCount} HS đạt điểm giỏi)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DANH SÁCH HỌC SINH (STUDENT LIST & BULK ADD ENGINE) */}
          {activeDetailTab === 'students' && (
            <div className="space-y-4 animate-fade-in">
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="🔎 Tìm kiếm theo họ tên, email học sinh..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* Actions Button Group */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenBulkAddModal()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>+ Thêm học sinh hàng loạt</span>
                  </button>

                  <button
                    onClick={() => setIsSingleAddModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Thêm 1 email</span>
                  </button>

                  <button
                    onClick={() => setIsExcelImportModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Nhập Excel</span>
                  </button>

                  <button
                    onClick={handleDownloadExcelTemplate}
                    title="Tải file Excel mẫu"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setStudentStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                    studentStatusFilter === 'ALL'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tất cả ({students.length})
                </button>

                <button
                  onClick={() => setStudentStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                    studentStatusFilter === 'ACTIVE'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Đã tham gia ({students.filter(s => s.status === 'ACTIVE').length})
                </button>

                <button
                  onClick={() => setStudentStatusFilter('HIGH_SCORE')}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                    studentStatusFilter === 'HIGH_SCORE'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Điểm giỏi ≥ 8.0 ({students.filter(s => s.avgScore >= 8.0).length})
                </button>

                <button
                  onClick={() => setStudentStatusFilter('LOW_SCORE')}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                    studentStatusFilter === 'LOW_SCORE'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Cần củng cố &lt; 6.5 ({students.filter(s => s.avgScore < 6.5 && s.submissionsCount > 0).length})
                </button>

                <button
                  onClick={() => setStudentStatusFilter('NO_SUBMISSIONS')}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                    studentStatusFilter === 'NO_SUBMISSIONS'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Chưa nộp bài nào ({students.filter(s => s.submissionsCount === 0).length})
                </button>
              </div>

              {/* Student Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>Không có học sinh nào phù hợp bộ lọc.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-3.5 px-4 w-12 text-center">STT</th>
                          <th className="py-3.5 px-4">Họ và tên</th>
                          <th className="py-3.5 px-4">Email</th>
                          <th className="py-3.5 px-4 text-center">Trạng thái</th>
                          <th className="py-3.5 px-4 text-center">Bài đã làm</th>
                          <th className="py-3.5 px-4 text-center">Điểm TB</th>
                          <th className="py-3.5 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((s, idx) => (
                          <tr key={s.email || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 text-center text-slate-400 font-semibold text-[11px]">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {s.displayName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                              {s.email}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {s.status === 'ACTIVE' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Đã tham gia
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  Chờ kích hoạt
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                              {s.submissionsCount} bài
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {s.submissionsCount > 0 ? (
                                <span className={`font-black text-sm ${
                                  s.avgScore >= 8.0 ? 'text-emerald-600' : s.avgScore >= 6.5 ? 'text-cyan-600' : 'text-amber-600'
                                }`}>
                                  {s.avgScore}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewStudentSubmissions(s)}
                                  title="Xem lịch sử làm bài"
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-cyan-600 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedStudentForAction(s);
                                    setTargetTransferClassId('');
                                    setIsTransferModalOpen(true);
                                  }}
                                  title="Chuyển lớp"
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-cyan-600 transition-colors"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedStudentForAction(s);
                                    setIsRemoveStudentModalOpen(true);
                                  }}
                                  title="Xóa khỏi lớp"
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GIAO BÀI (CLASS ASSIGNMENTS) */}
          {activeDetailTab === 'assignments' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Danh sách bài tập & bài kiểm tra của lớp</h3>
                  <p className="text-xs text-slate-500">Các bài tập đã giao trực tiếp cho {selectedClass.name}</p>
                </div>

                <button
                  onClick={() => onNavigate('assignments_manager', { classId: selectedClass.id })}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 uppercase tracking-wide"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Giao bài mới</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {classAssignments.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>Chưa có bài kiểm tra nào được giao cho lớp này.</p>
                  </div>
                ) : (
                  classAssignments.map(assign => {
                    const assignSubs = classSubmissions.filter(s => s.assignmentId === assign.id);
                    return (
                      <div key={assign.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-900">{assign.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              assign.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : assign.status === 'SCHEDULED'
                                ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {assign.status === 'ACTIVE' ? 'Đang mở' : assign.status === 'SCHEDULED' ? 'Sắp mở' : 'Đã kết thúc'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Thời lượng: <strong>{assign.durationMinutes > 0 ? `${assign.durationMinutes} phút` : 'Tự do'}</strong></span>
                            <span>Hạn nộp: <strong>{assign.deadline || assign.endAt?.slice(0, 10) || 'Không giới hạn'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Đã nộp</span>
                            <div className="text-base font-black text-slate-800">
                              {assignSubs.length} / {students.length}
                            </div>
                          </div>

                          <button
                            onClick={() => onNavigate('assignments_manager', { classId: selectedClass.id })}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: KẾT QUẢ HỌC TẬP (LEARNING OUTCOMES & ANALYTICS) */}
          {activeDetailTab === 'results' && (
            <div className="space-y-6 animate-fade-in">
              {/* Analytics Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Tổng sĩ số</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{classStats.total}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-emerald-600">Đã làm bài</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{classStats.activeSubmittingStudents}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-amber-600">Chưa nộp bài</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{classStats.noSubmissionStudents}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-cyan-600">Điểm trung bình lớp</div>
                  <div className="text-2xl font-black text-cyan-600 mt-1">{classStats.avgScore} <span className="text-xs text-slate-400">/ 10</span></div>
                </div>
              </div>

              {/* Score Distribution */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Phân bố phổ điểm
                  </h3>
                  <button
                    onClick={handleExportClassToExcel}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất bảng điểm Excel</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
                      <span>≥ 8.0 (Giỏi & Xuất sắc)</span>
                      <span>{classStats.excellentCount} học sinh</span>
                    </div>
                    <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${classStats.total > 0 ? (classStats.excellentCount / classStats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-cyan-50/60 rounded-2xl border border-cyan-100">
                    <div className="flex items-center justify-between text-xs text-cyan-800 font-bold mb-1">
                      <span>6.5 – 7.9 (Khá)</span>
                      <span>{classStats.goodCount} học sinh</span>
                    </div>
                    <div className="w-full bg-cyan-200/60 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-cyan-600 h-full rounded-full"
                        style={{ width: `${classStats.total > 0 ? (classStats.goodCount / classStats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
                    <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
                      <span>&lt; 6.5 (Cần cải thiện)</span>
                      <span>{classStats.needImprovementCount} học sinh</span>
                    </div>
                    <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-600 h-full rounded-full"
                        style={{ width: `${classStats.total > 0 ? (classStats.needImprovementCount / classStats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CÀI ĐẶT LỚP (SETTINGS & AUDIT LOGS) */}
          {activeDetailTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Chỉnh sửa thông tin lớp học
                  </h3>
                  <button
                    onClick={() => handleOpenEditModal(selectedClass)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sửa thông tin</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Tên lớp</span>
                    <strong className="text-slate-800">{selectedClass.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Giáo viên phụ trách</span>
                    <strong className="text-slate-800">{selectedClass.teacherName} ({selectedClass.teacherEmail})</strong>
                  </div>
                </div>
              </div>

              {/* Operation Logs (Audit History) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-600" />
                  <span>Nhật ký thao tác lớp học (Audit Logs)</span>
                </h3>

                {classLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">Chưa có nhật ký thay đổi nào cho lớp này.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {classLogs.map((log, i) => (
                      <div key={log.id || i} className="py-2.5 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-800 uppercase text-[11px]">
                            {log.action === 'BULK_ADD_STUDENTS' ? 'Thêm học sinh hàng loạt' :
                             log.action === 'TRANSFER_STUDENT' ? 'Chuyển lớp học sinh' :
                             log.action === 'REMOVE_STUDENT' ? 'Xóa học sinh khỏi lớp' :
                             log.action === 'ARCHIVE_CLASS' ? 'Lưu trữ lớp học' : log.action}
                          </strong>
                          <span className="text-slate-400 block text-[10px]">
                            Bởi: {log.performedByEmail} • {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        {log.total && (
                          <span className="text-xs font-bold text-emerald-600">
                            Thành công: {log.success}/{log.total}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger Zone: Archive Class */}
              <div className="bg-red-50/50 p-6 rounded-2xl border border-red-200 space-y-3">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">
                  Vùng nguy hiểm: Lưu trữ / Xóa lớp học
                </h4>
                <p className="text-xs text-red-700">
                  Lưu trữ lớp học sẽ ẩn lớp khỏi danh sách đang hoạt động. Toàn bộ lịch sử làm bài và điểm số của học sinh sẽ được giữ nguyên an toàn.
                </p>
                <button
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Lưu trữ lớp học này</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK ADD STUDENTS VIA EMAIL (TẠO DANH SÁCH HỌC SINH HÀNG LOẠT) */}
      {/* ========================================================================= */}
      {isBulkAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cyan-600" />
                  <span>Thêm học sinh hàng loạt bằng Email</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Lớp: <strong className="text-slate-800">{selectedClass?.name}</strong>
                </span>
              </div>
              <button
                onClick={() => setIsBulkAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Multi-Step Flow */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* STEP 1: INPUT EMAIL TEXTAREA */}
              {bulkStep === 'INPUT' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Dán danh sách email học sinh (mỗi email một dòng, hoặc cách nhau bởi dấu phẩy, chấm phẩy, hoặc cột Excel)
                    </label>
                    <textarea
                      rows={8}
                      placeholder={`nguyenvana@fpt.edu.vn\ntranthib@fpt.edu.vn\nLê Văn C | levanc@fpt.edu.vn\nphamthid@fpt.edu.vn\nhoanganh@fpt.edu.vn`}
                      value={bulkInputText}
                      onChange={(e) => setBulkInputText(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  {/* Fast Samples Helper */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Dán mẫu nhanh:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePasteSample5}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                      >
                        5 Email mẫu
                      </button>
                      <button
                        type="button"
                        onClick={handlePasteSampleWithNames}
                        className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-lg text-[11px] font-bold"
                      >
                        Họ tên | Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkInputText('')}
                        className="text-slate-400 hover:text-red-500 text-[11px]"
                      >
                        Xóa trắng
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-cyan-50 rounded-2xl border border-cyan-100 text-xs text-cyan-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Hệ thống tự động nhận diện:</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-cyan-800">
                      <li>Copy trực tiếp 1 cột từ Excel hoặc Word.</li>
                      <li>Phát hiện email đã có trong lớp để tránh trùng lặp.</li>
                      <li>Tự động lấy họ tên từ tài khoản đã có hoặc tạo tài khoản học sinh mới.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* STEP 2: ANALYSIS & PREVIEW */}
              {bulkStep === 'PREVIEW' && bulkReport && (
                <div className="space-y-4">
                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng email</span>
                      <strong className="text-base text-slate-900 font-black">{bulkReport.total}</strong>
                    </div>

                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">✅ Sẽ thêm</span>
                      <strong className="text-base text-emerald-700 font-black">
                        {bulkParsedItems.filter(i => i.selected && (i.status === 'VALID' || i.status === 'EXISTING_USER_NEW_TO_CLASS' || i.status === 'NEW_ACCOUNT_NEEDED')).length}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">⚠️ Đã có trong lớp</span>
                      <strong className="text-base text-amber-700 font-black">{bulkReport.alreadyInClassCount}</strong>
                    </div>

                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-red-800 block">❌ Email lỗi</span>
                      <strong className="text-base text-red-700 font-black">{bulkReport.invalidEmailCount}</strong>
                    </div>
                  </div>

                  {/* Preview Table Controls */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-bold text-slate-700">Xem trước danh sách học sinh:</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAllValid(true)}
                        className="text-cyan-600 hover:underline font-bold"
                      >
                        Chọn tất cả hợp lệ
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAllValid(false)}
                        className="text-slate-400 hover:underline"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {bulkParsedItems.map((item, idx) => {
                      const isEligible = item.status === 'VALID' || item.status === 'EXISTING_USER_NEW_TO_CLASS' || item.status === 'NEW_ACCOUNT_NEEDED';
                      return (
                        <div key={item.id} className={`p-3 text-xs flex items-center justify-between gap-3 ${
                          !isEligible ? 'bg-slate-50/70 opacity-65' : 'hover:bg-cyan-50/30'
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              disabled={!isEligible}
                              checked={item.selected}
                              onChange={() => handleToggleParsedItem(item.id)}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            />
                            <span className="text-slate-400 text-[10px] font-mono w-5">{idx + 1}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">{item.email}</span>
                              </div>
                              <input
                                type="text"
                                value={item.displayName}
                                onChange={(e) => handleUpdateItemDisplayName(item.id, e.target.value)}
                                placeholder="Họ và tên học sinh"
                                className="text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md mt-0.5 w-48"
                              />
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {item.status === 'ALREADY_IN_CLASS' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                ⚠️ Đã có trong lớp
                              </span>
                            )}
                            {item.status === 'INVALID_EMAIL' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                                ❌ Email lỗi
                              </span>
                            )}
                            {item.status === 'EXISTING_USER_NEW_TO_CLASS' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                ✅ Tài khoản đã có
                              </span>
                            )}
                            {item.status === 'NEW_ACCOUNT_NEEDED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                ✨ Tạo hồ sơ mới
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: RESULT SUMMARY */}
              {bulkStep === 'RESULT' && bulkResultSummary && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-600/10">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900">
                      🎉 Thêm học sinh thành công!
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Đã cập nhật danh sách và sĩ số cho lớp <strong>{selectedClass?.name}</strong>
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-left max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Đã thêm thành công:</span>
                      <strong className="text-emerald-600 font-bold">{bulkResultSummary.success} học sinh</strong>
                    </div>
                    {bulkResultSummary.duplicate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Đã có trong lớp (bỏ qua):</span>
                        <strong className="text-amber-600 font-bold">{bulkResultSummary.duplicate} học sinh</strong>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                      <span className="text-slate-800">Sĩ số mới của lớp:</span>
                      <span className="text-cyan-600 font-black">{bulkResultSummary.newTotal} học sinh</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {bulkStep === 'INPUT' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBulkAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={bulkIsProcessing || !bulkInputText.trim()}
                    onClick={handleAnalyzeBulkEmails}
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
                  >
                    {bulkIsProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang kiểm tra...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Kiểm tra danh sách →</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {bulkStep === 'PREVIEW' && (
                <>
                  <button
                    type="button"
                    onClick={() => setBulkStep('INPUT')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
                  >
                    ← Sửa lại danh sách
                  </button>
                  <button
                    type="button"
                    disabled={bulkIsProcessing || bulkParsedItems.filter(i => i.selected && (i.status === 'VALID' || i.status === 'EXISTING_USER_NEW_TO_CLASS' || i.status === 'NEW_ACCOUNT_NEEDED')).length === 0}
                    onClick={handleConfirmBulkAdd}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 uppercase tracking-wide transition-all"
                  >
                    {bulkIsProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang thêm vào lớp...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Thêm {bulkParsedItems.filter(i => i.selected && (i.status === 'VALID' || i.status === 'EXISTING_USER_NEW_TO_CLASS' || i.status === 'NEW_ACCOUNT_NEEDED')).length} học sinh vào lớp
                        </span>
                      </>
                    )}
                  </button>
                </>
              )}

              {bulkStep === 'RESULT' && (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsBulkAddModalOpen(false)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-md uppercase tracking-wide"
                  >
                    Hoàn tất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE STUDENT ADD */}
      {/* ========================================================================= */}
      {isSingleAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSingleStudentAdd} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Thêm học sinh bằng Email</h3>
              <button type="button" onClick={() => setIsSingleAddModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ Email học sinh *</label>
              <input
                type="email"
                required
                placeholder="nguyenvanan@fpt.edu.vn"
                value={singleStudentEmail}
                onChange={(e) => setSingleStudentEmail(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Nguyễn Văn An"
                value={singleStudentName}
                onChange={(e) => setSingleStudentName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSingleAddModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide"
              >
                Thêm vào lớp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCEL IMPORT */}
      {/* ========================================================================= */}
      {isExcelImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Nhập danh sách từ Excel</span>
              </h3>
              <button type="button" onClick={() => setIsExcelImportModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Tải lên file Excel (.xlsx, .xls) có chứa cột <strong>Email</strong> và <strong>Họ và tên</strong> để hệ thống tự động kiểm tra và thêm vào lớp.
              </p>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-cyan-500 transition-colors bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer text-cyan-600 font-bold hover:underline block">
                  Chọn file Excel từ máy tính
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400 block mt-1">Định dạng hỗ trợ: .xlsx, .xls, .csv</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="text-cyan-700 font-bold text-xs hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file Excel mẫu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSFER STUDENT (CHUYỂN HỌC SINH GIỮA CÁC LỚP) */}
      {/* ========================================================================= */}
      {isTransferModalOpen && selectedStudentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Chuyển lớp học sinh</h3>
              <button type="button" onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Học sinh</span>
                <strong className="text-slate-900 text-sm">{selectedStudentForAction.displayName}</strong>
                <span className="text-slate-500 block text-[11px] font-mono">{selectedStudentForAction.email}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chọn lớp học đích *</label>
                <select
                  value={targetTransferClassId}
                  onChange={(e) => setTargetTransferClassId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-semibold"
                >
                  <option value="">-- Chọn lớp chuyển đến --</option>
                  {classes.filter(c => c.id !== selectedClass?.id && (c.status || 'ACTIVE') !== 'ARCHIVED').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.teacherName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
                ✓ <strong>Bảo toàn dữ liệu:</strong> Toàn bộ lịch sử làm bài, điểm số và tài khoản của học sinh được giữ nguyên khi chuyển lớp.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!targetTransferClassId}
                onClick={handleTransferStudentConfirm}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide"
              >
                Xác nhận chuyển lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REMOVE STUDENT FROM CLASS */}
      {/* ========================================================================= */}
      {isRemoveStudentModalOpen && selectedStudentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Xác nhận xóa khỏi lớp</span>
              </h3>
              <button type="button" onClick={() => setIsRemoveStudentModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Bạn có chắc chắn muốn xóa học sinh <strong className="text-slate-900">{selectedStudentForAction.displayName}</strong> ({selectedStudentForAction.email}) khỏi lớp <strong className="text-slate-900">{selectedClass?.name}</strong>?
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                ⚠️ <strong>Lưu ý:</strong> Thao tác này chỉ xóa quan hệ của học sinh khỏi lớp. <strong>Tài khoản đăng nhập và lịch sử làm bài KHÔNG bị xóa.</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRemoveStudentModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRemoveStudentConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold shadow-md shadow-red-600/20 uppercase tracking-wide"
              >
                Xóa khỏi lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW STUDENT SUBMISSIONS & TEST HISTORY */}
      {/* ========================================================================= */}
      {isStudentSubmissionsModalOpen && selectedStudentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Lịch sử làm bài: {selectedStudentForAction.displayName}
                </h3>
                <span className="text-xs text-slate-400 font-mono">{selectedStudentForAction.email}</span>
              </div>
              <button type="button" onClick={() => setIsStudentSubmissionsModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              {studentSubmissionsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Học sinh chưa nộp bài thi nào trong lớp này.
                </div>
              ) : (
                studentSubmissionsList.map((sub, i) => (
                  <div key={sub.id || i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block">{sub.questionSetTitle}</strong>
                      <span className="text-slate-400 text-[11px]">
                        Nộp lúc: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Điểm</span>
                      <div className="text-lg font-black text-cyan-600">{sub.score} / 10</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE CLASS */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleCreateClass} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Tạo lớp học mới</h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp *</label>
              <input
                type="text"
                required
                placeholder="10A3 - Hóa học Tự nhiên"
                value={formClassName}
                onChange={(e) => setFormClassName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khối</label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value={10}>Khối 10</option>
                  <option value={11}>Khối 11</option>
                  <option value={12}>Khối 12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
                <input
                  type="text"
                  value={formAcademicYear}
                  onChange={(e) => setFormAcademicYear(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giáo viên phụ trách</label>
              <input
                type="text"
                value={formTeacherName}
                onChange={(e) => setFormTeacherName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email giáo viên</label>
              <input
                type="email"
                value={formTeacherEmail}
                onChange={(e) => setFormTeacherEmail(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả lớp học</label>
              <input
                type="text"
                placeholder="Lớp chuyên ban Tự nhiên..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide"
              >
                Tạo lớp học
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CLASS */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSaveEditClass} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Sửa thông tin lớp học</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp *</label>
              <input
                type="text"
                required
                value={formClassName}
                onChange={(e) => setFormClassName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khối</label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value={10}>Khối 10</option>
                  <option value={11}>Khối 11</option>
                  <option value={12}>Khối 12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
                <input
                  type="text"
                  value={formAcademicYear}
                  onChange={(e) => setFormAcademicYear(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giáo viên phụ trách</label>
              <input
                type="text"
                value={formTeacherName}
                onChange={(e) => setFormTeacherName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email giáo viên</label>
              <input
                type="email"
                value={formTeacherEmail}
                onChange={(e) => setFormTeacherEmail(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả lớp học</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md uppercase tracking-wide"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ARCHIVE CLASS CONFIRMATION */}
      {/* ========================================================================= */}
      {isArchiveModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Xác nhận lưu trữ lớp học</span>
              </h3>
              <button type="button" onClick={() => setIsArchiveModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Xóa/lưu trữ lớp <strong className="text-slate-900">{selectedClass.name}</strong> sẽ ảnh hưởng đến việc giao bài và quản lý học sinh. Bạn có chắc chắn muốn lưu trữ lớp này không?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleArchiveClass}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold shadow-md uppercase tracking-wide"
              >
                Đồng ý lưu trữ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
