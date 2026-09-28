import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  signInWithPopup, 
  googleProvider,
  fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  serverTimestamp
} from '../lib/firebase';
import { ADMIN_EMAILS } from '../data/curriculum';
import { UserProfile, UserRole } from '../types';
import { classService } from '../services/dbService';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: any;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginAsStudentByClass: (classId: string, studentName: string, studentEmail?: string) => Promise<void>;
  updateUserClass: (classId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkIsAdminEmail = (emailStr?: string | null): boolean => {
    if (!emailStr) return false;
    const lower = emailStr.toLowerCase().trim();
    return ADMIN_EMAILS.some(e => e.toLowerCase().trim() === lower);
  };

  // Sync Firebase User with custom profile in Firestore or restore student class session
  useEffect(() => {
    const localStudent = localStorage.getItem('chem10_student_session');
    
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Clear anonymous/guest student session if signed in via Firebase
        localStorage.removeItem('chem10_student_session');
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);

          let userRole: UserRole = 'student';
          if (checkIsAdminEmail(fbUser.email)) {
            userRole = 'admin';
          } else if (docSnap.exists() && docSnap.data()?.role) {
            userRole = docSnap.data().role;
          }

          // Auto-detect student class from Teacher's class sets in Firestore
          let matchedClass = '';
          let studentMshs = docSnap.exists() ? (docSnap.data()?.mshs || '') : '';
          
          if (userRole === 'student' && fbUser.email) {
            try {
              const detectedClass = await classService.findClassForStudentEmail(fbUser.email);
              if (detectedClass) {
                matchedClass = detectedClass;
              } else if (docSnap.exists() && docSnap.data()?.classId) {
                matchedClass = docSnap.data().classId;
              }
            } catch {
              matchedClass = docSnap.exists() ? (docSnap.data()?.classId || '') : '';
            }

            // Check if teacher pre-created student profile with MSHS
            if (!studentMshs) {
              try {
                const preDocRef = doc(db, 'users', `student_${fbUser.email.toLowerCase().replace(/[@.]/g, '_')}`);
                const preDocSnap = await getDoc(preDocRef);
                if (preDocSnap.exists() && preDocSnap.data()?.mshs) {
                  studentMshs = preDocSnap.data()?.mshs;
                }
              } catch (e) {
                console.warn("Could not fetch pre-created student MSHS:", e);
              }
            }
          } else if (docSnap.exists() && docSnap.data()?.classId) {
            matchedClass = docSnap.data().classId;
          }

          let defaultName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Người dùng';
          const emailLower = fbUser.email?.toLowerCase().trim();
          if (emailLower === 'muoint@fpt.edu.vn') {
            defaultName = fbUser.displayName || 'Nguyễn Tuyền Muội';
          } else if (emailLower === 'phuonglv9@fpt.edu.vn') {
            defaultName = fbUser.displayName || 'Lê Văn Phương';
          } else if (emailLower === 'thongtnmfct31178@gmail.com') {
            defaultName = fbUser.displayName || 'Trần Ngọc Minh Thông';
          }

          const profileData: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: defaultName,
            role: userRole,
            photoURL: fbUser.photoURL || undefined,
            createdAt: docSnap.exists() ? docSnap.data()?.createdAt : new Date().toISOString(),
            school: docSnap.exists() ? docSnap.data()?.school : 'THPT FPT',
            classId: matchedClass,
            mshs: studentMshs,
            hasLoggedIn: true,
            lastLoginAt: new Date().toISOString()
          };

          await setDoc(userDocRef, {
            ...profileData,
            hasLoggedIn: true,
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });

          // Also sync placeholder student doc if existing
          if (fbUser.email) {
            try {
              const preDocRef = doc(db, 'users', `student_${fbUser.email.toLowerCase().replace(/[@.]/g, '_')}`);
              await setDoc(preDocRef, {
                hasLoggedIn: true,
                realUid: fbUser.uid,
                classId: matchedClass,
                displayName: defaultName,
                lastLoginAt: serverTimestamp()
              }, { merge: true });
            } catch {}
          }

          setUser(profileData);
        } catch (err) {
          console.error("Error fetching user profile:", err);
          const fallbackRole: UserRole = checkIsAdminEmail(fbUser.email) ? 'admin' : 'student';
          let defaultName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Người dùng';
          const emailLower = fbUser.email?.toLowerCase().trim();
          if (emailLower === 'muoint@fpt.edu.vn') {
            defaultName = 'Nguyễn Tuyền Muội';
          } else if (emailLower === 'phuonglv9@fpt.edu.vn') {
            defaultName = 'Lê Văn Phương';
          } else if (emailLower === 'thongtnmfct31178@gmail.com') {
            defaultName = 'Trần Ngọc Minh Thông';
          }
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: defaultName,
            role: fallbackRole,
            createdAt: new Date().toISOString(),
            classId: '',
            hasLoggedIn: true
          });
        }
      } else if (localStudent) {
        try {
          const parsed = JSON.parse(localStudent);
          if (parsed && parsed.uid && parsed.classId) {
            setUser(parsed);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('chem10_student_session');
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google sign in failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      localStorage.removeItem('chem10_student_session');
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error: any) {
      console.error("Email sign in failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      localStorage.removeItem('chem10_student_session');
      const cleanEmail = email.trim();
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const assignedRole: UserRole = checkIsAdminEmail(cleanEmail) ? 'admin' : 'student';
      
      const userProfile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email || cleanEmail,
        displayName: name || cleanEmail.split('@')[0],
        role: assignedRole,
        createdAt: new Date().toISOString(),
        school: 'THPT FPT',
        classId: '10A1'
      };

      await setDoc(doc(db, 'users', res.user.uid), userProfile);
      setUser(userProfile);
    } catch (error: any) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginAsStudentByClass = async (classId: string, studentName: string, studentEmail?: string) => {
    setLoading(true);
    try {
      const cleanName = studentName.trim() || 'Học sinh';
      const cleanClass = classId.trim() || '10A1';
      const uid = 'student_' + cleanClass.toLowerCase() + '_' + Date.now().toString(36);
      const email = studentEmail?.trim() || `${uid}@student.chem10.local`;

      const studentProfile: UserProfile = {
        uid,
        email,
        displayName: cleanName,
        role: 'student',
        classId: cleanClass,
        school: 'THPT FPT',
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('chem10_student_session', JSON.stringify(studentProfile));
      setUser(studentProfile);
    } catch (error: any) {
      console.error("Student login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserClass = async (classId: string) => {
    if (!user) return;
    const updated = { ...user, classId };
    setUser(updated);
    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), { classId }, { merge: true });
      } catch (e) {
        console.error("Error updating user class:", e);
      }
    } else {
      localStorage.setItem('chem10_student_session', JSON.stringify(updated));
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('chem10_student_session');
      if (firebaseUser) {
        await fbSignOut(auth);
      }
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin' || checkIsAdminEmail(user?.email);
  const isTeacher = isAdmin || user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginAsStudentByClass,
        updateUserClass,
        logout,
        isAdmin,
        isTeacher,
        isStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
