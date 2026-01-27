import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { User, Attendance } from '../types';
import { db, generateId, getTodayIST } from './db';

const AUTH_KEY = 'salon_auth_user';
const USERS_COLLECTION = 'users'; // We'll store user profile info here

export const authService = {
    login: async (email: string, password: string): Promise<User | null> => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Firebase not configured');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const fbUser = userCredential.user;

            // For now, we'll map common roles based on name or metadata, 
            // In a real app, you'd fetch this from a 'users' collection in Firestore.
            const user: User = {
                username: fbUser.email || 'user',
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Staff',
                role: (fbUser.email === 'admin@thelondonsalon.com' || fbUser.email === 'ninjaproctor@gmail.com') ? 'Admin' : 'Manager' // Logic for roles
            };

            localStorage.setItem(AUTH_KEY, JSON.stringify(user));

            // Record Attendance
            const attendance: Attendance = {
                id: generateId(),
                userId: fbUser.uid,
                userName: user.name,
                date: getTodayIST(),
                loginTime: new Date().toISOString()
            };
            db.attendance.add(attendance);
            localStorage.setItem('salon_active_session', attendance.id);

            return user;
        } catch (error: any) {
            console.error('Firebase Login Error:', error);
            throw error;
        }
    },

    logout: async () => {
        const auth = getFirebaseAuth();

        // Record Logout Time
        const sessionId = localStorage.getItem('salon_active_session');
        if (sessionId) {
            const all = db.attendance.getAll();
            const updated = all.map(a => a.id === sessionId ? { ...a, logoutTime: new Date().toISOString() } : a);
            db.attendance.save(updated);
            localStorage.removeItem('salon_active_session');
        }

        if (auth) await signOut(auth);
        localStorage.removeItem(AUTH_KEY);
    },

    getCurrentUser: (): User | null => {
        try {
            const stored = localStorage.getItem(AUTH_KEY);
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    },

    isAuthenticated: (): boolean => {
        try {
            return !!localStorage.getItem(AUTH_KEY);
        } catch (e) {
            return false;
        }
    }
};
