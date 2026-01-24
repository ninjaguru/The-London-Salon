
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

const STORAGE_KEY_CONFIG = 'salon_firebase_config';

export const firebaseService = {
    getConfig: (): FirebaseConfig | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
            return stored ? JSON.parse(stored) : null;
        } catch (e) { return null; }
    },

    setConfig: (config: FirebaseConfig) => {
        try {
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
        } catch (e) { }
    },

    isConfigured: (): boolean => {
        const config = firebaseService.getConfig();
        return !!(config && config.apiKey && config.projectId);
    }
};

// Singleton initialization
let db: any = null;
let auth: any = null;

export const getFirebaseApp = () => {
    const config = firebaseService.getConfig();
    if (!config) return null;

    if (getApps().length === 0) {
        return initializeApp(config);
    }
    return getApp();
};

export const getFirebaseDb = () => {
    if (db) return db;
    const app = getFirebaseApp();
    if (!app) return null;
    db = getFirestore(app);

    // Enable offline persistence
    try {
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code === 'unimplemented') {
                console.warn('The current browser does not support all of the features required to enable persistence');
            }
        });
    } catch (e) { }

    return db;
};

export const getFirebaseAuth = () => {
    if (auth) return auth;
    const app = getFirebaseApp();
    if (!app) return null;
    auth = getAuth(app);
    return auth;
};
