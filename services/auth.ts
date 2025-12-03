
import { User } from '../types';

const USERS: User[] = [
    { username: 'ninja', name: 'System Admin', role: 'Admin' },
    { username: 'manager', name: 'Salon Manager', role: 'Manager' }
];

const AUTH_KEY = 'salon_auth_user';

export const authService = {
    login: (username: string, password: string): Promise<User | null> => {
        return new Promise((resolve) => {
            // Simulated delay
            setTimeout(() => {
                // Hardcoded credentials
                if (username === 'ninja' && password === 'Q1p0w2o9#$') {
                    const user = USERS[0];
                    try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); } catch(e){}
                    resolve(user);
                } else if (username === 'manager' && password === 'TlsManage#$') {
                    const user = USERS[1];
                    try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); } catch(e){}
                    resolve(user);
                } else {
                    resolve(null);
                }
            }, 500);
        });
    },

    logout: () => {
        try { localStorage.removeItem(AUTH_KEY); } catch(e){}
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
