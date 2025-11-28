
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
                    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
                    resolve(user);
                } else if (username === 'manager' && password === 'TlsManage#$') {
                    const user = USERS[1];
                    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
                    resolve(user);
                } else {
                    resolve(null);
                }
            }, 500);
        });
    },

    logout: () => {
        localStorage.removeItem(AUTH_KEY);
    },

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(AUTH_KEY);
        if (!stored) return null;
        try {
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem(AUTH_KEY);
    }
};
