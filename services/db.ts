
import {
  Staff, Product, Customer, Appointment, Sale, Package, Notification, Category, Service, Lead, CouponTemplate, Combo,
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
  couponTemplates: new StorageService<CouponTemplate>('salon_coupon_templates_v6', INITIAL_COUPON_TEMPLATES, 'CouponTemplates')
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
      querySnapshot.forEach((doc) => {
        const tableName = doc.id;
        const cloudData = doc.data().data;

        // Map Firebase collection names to our db keys
        const dbKey = Object.keys(db).find(key => (db as any)[key].tableName === tableName);
        if (dbKey && cloudData) {
          (db as any)[dbKey].overrideLocal(cloudData);
        }
      });
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

  return onSnapshot(collection(firestore, 'salon_vault'), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const tableName = change.doc.id;
        const cloudData = change.doc.data().data;
        const updatedAt = change.doc.data().updatedAt;

        // Only override if cloud is newer or different
        const dbKey = Object.keys(db).find(key => (db as any)[key].tableName === tableName);
        if (dbKey && cloudData) {
          const store = (db as any)[dbKey];
          const localData = store.getAll();
          if (JSON.stringify(localData) !== JSON.stringify(cloudData)) {
            console.log(`Real-time update for ${tableName}`);
            store.overrideLocal(cloudData);
          }
        }
      }
    });
  });
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
