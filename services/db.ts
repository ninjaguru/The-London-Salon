
import { 
  Staff, Product, Customer, Appointment, Sale, Package, Notification, Category, Service, Lead, CouponTemplate, Combo,
  Role, AppointmentStatus 
} from '../types';
import { sheetsService } from './sheets';

// Initial Seed Data - CLEARED
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

// Helper: Get Current Date in IST (YYYY-MM-DD)
export const getTodayIST = (): string => {
  // Returns YYYY-MM-DD in Asia/Kolkata timezone
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const createNotification = (type: 'reminder' | 'alert' | 'info' | 'staff', title: string, message: string, relatedId?: string) => {
  const notifications = db.notifications.getAll();
  const newNotif: Notification = {
    id: crypto.randomUUID(),
    type,
    title,
    message,
    date: new Date().toISOString(),
    read: false,
    relatedId
  };
  db.notifications.save([newNotif, ...notifications]);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    alert("No data to export");
    return;
  }
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => {
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${getTodayIST()}.csv`;
  a.click();
};

export const syncFromCloud = async () => {
  if (!sheetsService.isConfigured()) {
    return { success: false, message: 'Google Sheets not configured.' };
  }

  // 1. Pull data from Sheets
  const result = await sheetsService.readAll();
  if (result.status === 'error') {
    return { success: false, message: result.message || 'Sync failed' };
  }

  const data = result.data;
  if (!data) return { success: false, message: 'No data found in sheet' };

  // 2. Override Local Storage
  db.overrideLocal(data);

  return { success: true, message: 'Sync complete. Data updated from cloud.' };
};

class StorageService {
  private createStore<T>(key: string, initialData: T[], tableName: string) {
    return {
      getAll: (): T[] => {
        const stored = localStorage.getItem(key);
        if (!stored) {
          localStorage.setItem(key, JSON.stringify(initialData));
          return initialData;
        }
        try {
            return JSON.parse(stored);
        } catch(e) {
            return initialData;
        }
      },
      save: (data: T[]) => {
        localStorage.setItem(key, JSON.stringify(data));
        // Auto-push to sheets if configured
        if (sheetsService.isConfigured()) {
            sheetsService.write(tableName, data).then(res => {
                if (res.status === 'error') console.error(`Failed to push ${tableName} to cloud`);
            });
        }
        // Dispatch event for UI updates
        window.dispatchEvent(new Event('db-updated'));
      },
      add: (item: T) => {
        const current = this.createStore<T>(key, initialData, tableName).getAll();
        const updated = [item, ...current];
        this.createStore<T>(key, initialData, tableName).save(updated);
      },
      key,
      tableName
    };
  }

  staff = this.createStore<Staff>('salon_staff_v4_clean', INITIAL_STAFF, 'Staff');
  categories = this.createStore<Category>('salon_categories_v4_clean', INITIAL_CATEGORIES, 'Categories');
  services = this.createStore<Service>('salon_services_v4_clean', INITIAL_SERVICES, 'Services');
  combos = this.createStore<Combo>('salon_combos_v4_clean', INITIAL_COMBOS, 'Combos');
  inventory = this.createStore<Product>('salon_inventory_v4_clean', INITIAL_PRODUCTS, 'Inventory');
  packages = this.createStore<Package>('salon_packages_v4_clean', INITIAL_PACKAGES, 'Packages');
  customers = this.createStore<Customer>('salon_customers_v4_clean', INITIAL_CUSTOMERS, 'Customers');
  leads = this.createStore<Lead>('salon_leads_v4_clean', INITIAL_LEADS, 'Leads');
  appointments = this.createStore<Appointment>('salon_appointments_v4_clean', INITIAL_APPOINTMENTS, 'Appointments');
  sales = this.createStore<Sale>('salon_sales_v4_clean', INITIAL_SALES, 'Sales');
  notifications = this.createStore<Notification>('salon_notifications_v4_clean', INITIAL_NOTIFICATIONS, 'Notifications');
  couponTemplates = this.createStore<CouponTemplate>('salon_coupon_templates_v4_clean', [], 'CouponTemplates');

  // Helper for offline pagination simulation
  getPaginated<T>(tableName: string, page: number, pageSize: number): { data: T[], total: number } {
    let allData: any[] = [];
    switch(tableName) {
        case 'Customers': allData = this.customers.getAll(); break;
        case 'Appointments': allData = this.appointments.getAll(); break;
        default: return { data: [], total: 0 };
    }
    
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
        data: allData.slice(start, end),
        total: allData.length
    };
  }

  // Helper to bulk override local data from cloud sync result
  overrideLocal(cloudData: any) {
    // SANITIZATION LOGIC: Fix Dates/Times from Google Sheets ISO strings
    
    // 1. Sanitize Appointments
    if (cloudData.Appointments) {
        cloudData.Appointments = cloudData.Appointments.map((appt: any) => {
            // Fix Date (convert ISO to YYYY-MM-DD IST)
            if (appt.date && typeof appt.date === 'string' && appt.date.includes('T')) {
                // If the sheet Date column has a time component or is an ISO string, format it strictly to YYYY-MM-DD
                appt.date = new Date(appt.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            }
            
            // Fix Time (extract HH:MM from ISO string if present)
            if (appt.time && typeof appt.time === 'string' && appt.time.includes('T')) {
                // Sheets often returns time columns as 1899-12-30Txx:xx:xx.xxxZ
                const d = new Date(appt.time);
                const hours = d.getHours().toString().padStart(2, '0');
                const minutes = d.getMinutes().toString().padStart(2, '0');
                appt.time = `${hours}:${minutes}`;
            }
            return appt;
        });
    }

    // 2. Sanitize Customers (Birthdays/Anniversaries)
    if (cloudData.Customers) {
        cloudData.Customers = cloudData.Customers.map((c: any) => {
             if (c.birthday && typeof c.birthday === 'string' && c.birthday.includes('T')) {
                 c.birthday = new Date(c.birthday).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
             }
             if (c.anniversary && typeof c.anniversary === 'string' && c.anniversary.includes('T')) {
                 c.anniversary = new Date(c.anniversary).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
             }
             // Ensure activeCoupons is an array (Sheets might return string)
             if (c.activeCoupons && typeof c.activeCoupons === 'string') {
                 try { c.activeCoupons = JSON.parse(c.activeCoupons); } catch(e) { c.activeCoupons = []; }
             }
             return c;
        });
    }

    const stores = [
        this.staff, this.categories, this.services, this.combos, this.inventory, 
        this.packages, this.customers, this.leads, this.appointments, this.sales, 
        this.notifications, this.couponTemplates
    ];

    stores.forEach(store => {
        if (cloudData[store.tableName]) {
            localStorage.setItem(store.key, JSON.stringify(cloudData[store.tableName]));
        }
    });
    
    window.dispatchEvent(new Event('db-updated'));
  }
}

export const db = new StorageService();
