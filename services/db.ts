
import {
  Staff, Product, Customer, Appointment, Sale, Package, Notification, Category, Service, Lead, CouponTemplate, Combo,
  Role, AppointmentStatus
} from '../types';
import { sheetsService } from './sheets';

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
      // Trigger background sync to sheets if configured
      if (sheetsService.isConfigured()) {
        sheetsService.write(this.tableName, data).then(() => console.log(`Synced ${this.tableName}`));
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

// Sync Logic
export const syncFromCloud = async () => {
  if (!sheetsService.isConfigured()) return { success: false, message: 'Cloud not configured' };

  try {
    const response = await sheetsService.readAll();
    if (response.status === 'success' && response.data) {
      const cloudData = response.data;

      // Override local stores with cloud data
      if (cloudData['Staff']) db.staff.overrideLocal(cloudData['Staff']);
      if (cloudData['Categories']) db.categories.overrideLocal(cloudData['Categories']);
      if (cloudData['Services']) db.services.overrideLocal(cloudData['Services']);
      if (cloudData['Combos']) db.combos.overrideLocal(cloudData['Combos']);
      if (cloudData['Inventory']) db.inventory.overrideLocal(cloudData['Inventory']);
      if (cloudData['Packages']) db.packages.overrideLocal(cloudData['Packages']);
      if (cloudData['Leads']) db.leads.overrideLocal(cloudData['Leads']);
      if (cloudData['Sales']) db.sales.overrideLocal(cloudData['Sales']);
      if (cloudData['CouponTemplates']) db.couponTemplates.overrideLocal(cloudData['CouponTemplates']);

      // Helper to get YYYY-MM-DD in IST from any date input
      const toISTDate = (val: any) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return val;
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      };

      // Helper to get HH:mm in IST from any date input
      const toISTTime = (val: any) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return val;
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
      };

      // Special handling for Customers and Appointments to sanitize Dates
      if (cloudData['Customers']) {
        const cleanCustomers = cloudData['Customers'].map((c: any) => {
          let parsedCoupons = [];
          try {
            if (typeof c.activeCoupons === 'string') {
              parsedCoupons = JSON.parse(c.activeCoupons);
            } else if (Array.isArray(c.activeCoupons)) {
              parsedCoupons = c.activeCoupons;
            }
          } catch (e) {
            parsedCoupons = [];
          }

          return {
            ...c,
            // Ensure dates are YYYY-MM-DD in IST
            birthday: toISTDate(c.birthday),
            anniversary: toISTDate(c.anniversary),
            // Ensure activeCoupons is always an array
            activeCoupons: parsedCoupons || []
          };
        });
        db.customers.overrideLocal(cleanCustomers);
      }

      if (cloudData['Appointments']) {
        const cleanAppts = cloudData['Appointments'].map((a: any) => ({
          ...a,
          // Ensure date is YYYY-MM-DD in IST
          date: toISTDate(a.date),
          // Ensure time is HH:MM in IST
          time: a.time && a.time.toString().includes('T') ? toISTTime(a.time) : a.time
        }));
        db.appointments.overrideLocal(cleanAppts);
      }

      return { success: true, message: 'Data synchronized from cloud.' };
    } else {
      return { success: false, message: response.message || 'Sync failed' };
    }
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Network error during sync' };
  }
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
