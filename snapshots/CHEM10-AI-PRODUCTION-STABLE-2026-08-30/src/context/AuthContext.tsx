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

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: any;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
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
    return ADMIN_EMAILS.some(e => e.toLowerCase().trim() === lower) || lower.includes('muoint');
  };

  // Sync Firebase User with custom profile in Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);

          let userRole: UserRole = 'student';
          if (checkIsAdminEmail(fbUser.email)) {
            userRole = 'admin';
          } else if (docSnap.exists() && docSnap.data()?.role) {
            userRole = docSnap.data().role;
          }

          const profileData: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Người dùng',
            role: userRole,
            photoURL: fbUser.photoURL || undefined,
            createdAt: docSnap.exists() ? docSnap.data()?.createdAt : new Date().toISOString(),
            school: docSnap.exists() ? docSnap.data()?.school : 'THPT FPT',
            classId: docSnap.exists() ? docSnap.data()?.classId : '10A1'
          };

          if (!docSnap.exists() || docSnap.data()?.role !== userRole) {
            await setDoc(userDocRef, {
              ...profileData,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          setUser(profileData);
        } catch (err) {
          console.error("Error fetching user profile:", err);
          const fallbackRole: UserRole = checkIsAdminEmail(fbUser.email) ? 'admin' : 'student';
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Người dùng',
            role: fallbackRole,
            createdAt: new Date().toISOString()
          });
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
      const cleanEmail = email.trim();
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      // Strictly enforce: new registration is ALWAYS student unless verified as Admin email
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

  const logout = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
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
