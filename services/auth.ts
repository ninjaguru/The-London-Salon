import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { User } from '../types';

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
            return user;
        } catch (error: any) {
            console.error('Firebase Login Error:', error);
            throw error;
        }
    },

    logout: async () => {
        const auth = getFirebaseAuth();
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
