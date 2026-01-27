
import {
  Staff, Product, Customer, Appointment, Sale, Package, Notification, Category, Service, Lead, CouponTemplate, Combo, Attendance,
  Role, AppointmentStatus
} from '../types';
import { firebaseService, getFirebaseDb } from './firebase';
import { doc, setDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';

// Helper: Get Current Date in IST (YYYY-MM-DD)
export const getTodayIST = (): string => {
  // Returns YYYY-MM-DD in Asia/Kolkata timezone
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper: Safe ID Generator
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto.randomUUID is not available
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Initial Empty Data
const INITIAL_STAFF: Staff[] = [];
const INITIAL_CATEGORIES: Category[] = [];
const INITIAL_SERVICES: Service[] = [];
const INITIAL_COMBOS: Combo[] = [];
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_PACKAGES: Package[] = [];
const INITIAL_CUSTOMERS: Customer[] = [];
const INITIAL_LEADS: Lead[] = [];
const INITIAL_APPOINTMENTS: Appointment[] = [];
const INITIAL_SALES: Sale[] = [];
const INITIAL_NOTIFICATIONS: Notification[] = [];
const INITIAL_COUPON_TEMPLATES: CouponTemplate[] = [];
const INITIAL_ATTENDANCE: Attendance[] = [];

class StorageService<T> {
  private key: string;
  private initialData: T[];
  private tableName: string; // For Google Sheets mapping

  constructor(key: string, initialData: T[], tableName: string) {
    this.key = key;
    this.initialData = initialData;
    this.tableName = tableName;
  }

  getAll(): T[] {
    try {
      const stored = localStorage.getItem(this.key);
      if (!stored) {
        try {
          // Initialize Local Storage ONLY.
          localStorage.setItem(this.key, JSON.stringify(this.initialData));
        } catch (e) {
          console.warn(`LocalStorage write failed for ${this.key}`, e);
        }
        return this.initialData;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error(`LocalStorage access failed for ${this.key}`, e);
      return this.initialData;
    }
  }

  save(data: T[]) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));


      // Trigger background sync to Firebase if configured
      if (firebaseService.isConfigured()) {
        const firestore = getFirebaseDb();
        if (firestore) {
          let userName = 'Cloud-Sync';
          try {
            const userJson = localStorage.getItem('salon_auth_user');
            if (userJson) userName = JSON.parse(userJson).name;
          } catch (e) { }

          // Special handling for Attendance: Save individual entry to shared collection
          // This prevents different staff phones from overwriting each other's logs
          if (this.tableName === 'Attendance' && data.length > 0) {
            // Find the most recently active entry (latest login or logout)
            const sorted = [...(data as any)].sort((a, b) => {
              const timeA = new Date(a.logoutTime || a.loginTime).getTime();
              const timeB = new Date(b.logoutTime || b.loginTime).getTime();
              return timeB - timeA;
            });

            const lastItem = sorted[0];
            if (lastItem && lastItem.id) {
              setDoc(doc(firestore, 'salon_attendance', lastItem.id), {
                ...lastItem,
                updatedAt: new Date().toISOString()
              }).then(() => console.log('Synced individual attendance entry:', lastItem.userName));
            }
          }

          setDoc(doc(firestore, 'salon_vault', this.tableName), {
            data,
            updatedAt: new Date().toISOString(),
            updatedBy: userName
          }).then(() => console.log(`Synced ${this.tableName} to Firebase`));
        }
      }

      // Dispatch event for UI reactivity
      window.dispatchEvent(new Event('db-updated'));
    } catch (e) {
      console.error(`LocalStorage save failed for ${this.key}`, e);
    }
  }

  add(item: T) {
    const current = this.getAll();
    this.save([item, ...current]);
  }

  // Method to override local data with cloud data (without triggering write back)
  overrideLocal(data: T[]) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      window.dispatchEvent(new Event('db-updated'));
    } catch (e) {
      console.error(`LocalStorage override failed for ${this.key}`, e);
    }
  }
}

// Storage Keys - Updated to v6 to clear previous bad data/cache
export const db = {
  staff: new StorageService<Staff>('salon_staff_v6', INITIAL_STAFF, 'Staff'),
  categories: new StorageService<Category>('salon_categories_v6', INITIAL_CATEGORIES, 'Categories'),
  services: new StorageService<Service>('salon_services_v6', INITIAL_SERVICES, 'Services'),
  combos: new StorageService<Combo>('salon_combos_v6', INITIAL_COMBOS, 'Combos'),
  inventory: new StorageService<Product>('salon_inventory_v6', INITIAL_PRODUCTS, 'Inventory'),
  packages: new StorageService<Package>('salon_packages_v6', INITIAL_PACKAGES, 'Packages'),
  customers: new StorageService<Customer>('salon_customers_v6', INITIAL_CUSTOMERS, 'Customers'),
  leads: new StorageService<Lead>('salon_leads_v6', INITIAL_LEADS, 'Leads'),
  appointments: new StorageService<Appointment>('salon_appointments_v6', INITIAL_APPOINTMENTS, 'Appointments'),
  sales: new StorageService<Sale>('salon_sales_v6', INITIAL_SALES, 'Sales'),
  notifications: new StorageService<Notification>('salon_notifications_v6', INITIAL_NOTIFICATIONS, 'Notifications'),
  couponTemplates: new StorageService<CouponTemplate>('salon_coupon_templates_v6', INITIAL_COUPON_TEMPLATES, 'CouponTemplates'),
  attendance: new StorageService<Attendance>('salon_attendance_v6', INITIAL_ATTENDANCE, 'Attendance')
};

export const createNotification = (type: Notification['type'], title: string, message: string, relatedId?: string) => {
  const newNotif: Notification = {
    id: generateId(),
    type,
    title,
    message,
    date: new Date().toISOString(),
    read: false,
    relatedId
  };
  db.notifications.add(newNotif);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    alert('No data to export');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const val = row[header];
      // Escape quotes and wrap in quotes if string contains comma
      const formatted = typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      return formatted;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Cloud sync Logic
export const syncFromCloud = async () => {
  // If Firebase is configured, it handles real-time sync, but we can do a one-time push/pull here
  if (firebaseService.isConfigured()) {
    const firestore = getFirebaseDb();
    if (!firestore) return { success: false, message: 'Firebase not initialized' };

    try {
      const querySnapshot = await getDocs(collection(firestore, 'salon_vault'));

      const promises = querySnapshot.docs.map(async (docSnap) => {
        const tableName = docSnap.id;
        let cloudData = docSnap.data().data;

        // Special handling for Attendance: Always fetch and merge individual logs
        if (tableName === 'Attendance') {
          try {
            const logsSnap = await getDocs(collection(firestore, 'salon_attendance'));
            const allLogs = logsSnap.docs.map(d => d.data() as Attendance);
            cloudData = allLogs.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
          } catch (e) {
            console.warn('Failed to fetch individual attendance logs during sync', e);
          }
        }

        const dbKey = Object.keys(db).find(key => (db as any)[key].tableName === tableName);
        if (dbKey && cloudData) {
          (db as any)[dbKey].overrideLocal(cloudData);
        }
      });

      await Promise.all(promises);
      return { success: true, message: 'Data synchronized from Firebase.' };
    } catch (e) {
      console.error('Firebase Sync Error:', e);
      return { success: false, message: 'Firebase sync failed.' };
    }
  }
  return { success: false, message: 'Cloud integration (Sheets/Firebase) not configured.' };
};

// Real-time Listener Setup
export const setupRealtimeSync = () => {
  if (!firebaseService.isConfigured()) return null;

  const firestore = getFirebaseDb();
  if (!firestore) return null;

  const unsubscribers: (() => void)[] = [];

  // 1. Listen to the main Vault for all tables
  const unsubVault = onSnapshot(collection(firestore, 'salon_vault'), (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const tableName = change.doc.id;

        // Skip Attendance here if we are listening to it directly
        if (tableName === 'Attendance') return;

        const cloudData = change.doc.data().data;
        const dbKey = Object.keys(db).find(key => (db as any)[key].tableName === tableName);
        if (dbKey && cloudData) {
          const store = (db as any)[dbKey];
          if (JSON.stringify(store.getAll()) !== JSON.stringify(cloudData)) {
            store.overrideLocal(cloudData);
          }
        }
      }
    });
  }, (err) => console.warn('Vault listener error:', err));
  unsubscribers.push(unsubVault);

  // 2. Direct listener for Attendance logs (Individual documents)
  const unsubAttendance = onSnapshot(collection(firestore, 'salon_attendance'), (snapshot) => {
    const allLogs = snapshot.docs.map(d => d.data() as Attendance);
    const sortedLogs = allLogs.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());

    const localLogs = db.attendance.getAll();
    if (JSON.stringify(localLogs) !== JSON.stringify(sortedLogs)) {
      console.log('Real-time sync: Received new attendance records');
      db.attendance.overrideLocal(sortedLogs);
    }
  }, (err) => console.warn('Attendance listener error (check rules):', err));
  unsubscribers.push(unsubAttendance);

  return () => unsubscribers.forEach(unsub => unsub());
};

// Helper for local pagination (if needed)
export const getPaginated = <T>(data: T[], page: number, pageSize: number): { data: T[], total: number } => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    data: data.slice(start, end),
    total: data.length
  };
};
