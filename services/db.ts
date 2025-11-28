
import { 
  Staff, Product, Customer, Appointment, Sale, Membership, Notification, Category, Service, Lead,
  Role, AppointmentStatus 
} from '../types';
import { sheetsService } from './sheets';

// Initial Seed Data - CLEARED
const INITIAL_STAFF: Staff[] = [];
const INITIAL_CATEGORIES: Category[] = [];
const INITIAL_SERVICES: Service[] = [];
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_MEMBERSHIPS: Membership[] = [];
const INITIAL_CUSTOMERS: Customer[] = [];
const INITIAL_LEADS: Lead[] = [];
const INITIAL_APPOINTMENTS: Appointment[] = [];
const INITIAL_SALES: Sale[] = [];
const INITIAL_NOTIFICATIONS: Notification[] = [];

// Helper to manage generic CRUD
class StorageService<T> {
  private key: string;
  private tableName: string; // The Google Sheet Tab Name
  private initialData: T[];

  constructor(key: string, tableName: string, initialData: T[]) {
    this.key = key;
    this.tableName = tableName;
    this.initialData = initialData;
  }

  getAll(): T[] {
    const stored = localStorage.getItem(this.key);
    if (!stored) {
      localStorage.setItem(this.key, JSON.stringify(this.initialData));
      return this.initialData;
    }
    return JSON.parse(stored);
  }

  save(data: T[]) {
    localStorage.setItem(this.key, JSON.stringify(data));
    window.dispatchEvent(new Event('db-updated'));
    // Trigger background sync if connected
    if (sheetsService.isConfigured()) {
      sheetsService.write(this.tableName, data).then(res => {
        if (res.status === 'error') console.error(`Sync error for ${this.tableName}:`, res.message);
      });
    }
  }

  add(item: T) {
    const all = this.getAll();
    all.push(item);
    this.save(all);
  }

  // Used when pulling data FROM cloud
  overrideLocal(data: T[]) {
    localStorage.setItem(this.key, JSON.stringify(data));
    window.dispatchEvent(new Event('db-updated'));
  }
}

// Updated keys to force a clean state
export const db = {
  staff: new StorageService<Staff>('salon_staff_v4_clean', 'Staff', INITIAL_STAFF),
  categories: new StorageService<Category>('salon_categories_v4_clean', 'Categories', INITIAL_CATEGORIES),
  services: new StorageService<Service>('salon_services_v4_clean', 'Services', INITIAL_SERVICES),
  inventory: new StorageService<Product>('salon_inventory_v4_clean', 'Inventory', INITIAL_PRODUCTS),
  customers: new StorageService<Customer>('salon_customers_v4_clean', 'Customers', INITIAL_CUSTOMERS),
  leads: new StorageService<Lead>('salon_leads_v4_clean', 'Leads', INITIAL_LEADS),
  memberships: new StorageService<Membership>('salon_memberships_v4_clean', 'Memberships', INITIAL_MEMBERSHIPS),
  appointments: new StorageService<Appointment>('salon_appointments_v4_clean', 'Appointments', INITIAL_APPOINTMENTS),
  sales: new StorageService<Sale>('salon_sales_v4_clean', 'Sales', INITIAL_SALES),
  notifications: new StorageService<Notification>('salon_notifications_v4_clean', 'Notifications', INITIAL_NOTIFICATIONS),
};

// Global Sync Function
export const syncFromCloud = async (): Promise<{success: boolean, message: string}> => {
  const result = await sheetsService.readAll();
  
  if (result.status === 'success' && result.data) {
    const data = result.data;
    if (data.Staff) db.staff.overrideLocal(data.Staff);
    if (data.Categories) db.categories.overrideLocal(data.Categories);
    if (data.Services) db.services.overrideLocal(data.Services);
    if (data.Inventory) db.inventory.overrideLocal(data.Inventory);
    if (data.Customers) db.customers.overrideLocal(data.Customers);
    if (data.Leads) db.leads.overrideLocal(data.Leads);
    if (data.Memberships) db.memberships.overrideLocal(data.Memberships);
    if (data.Appointments) db.appointments.overrideLocal(data.Appointments);
    if (data.Sales) db.sales.overrideLocal(data.Sales);
    if (data.Notifications) db.notifications.overrideLocal(data.Notifications);
    
    return { success: true, message: 'Data synced from cloud successfully' };
  } else {
    return { success: false, message: result.message || 'Unknown error' };
  }
};

// Helper to create a notification easily
export const createNotification = (
  type: Notification['type'], 
  title: string, 
  message: string, 
  relatedId?: string
) => {
  const newNotification: Notification = {
    id: crypto.randomUUID(),
    type,
    title,
    message,
    date: new Date().toISOString(),
    read: false,
    relatedId
  };
  db.notifications.add(newNotification);
};

// Helper to export data to CSV
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    alert("No data to export");
    return;
  }
  
  // Get all unique headers
  const headers = Array.from(new Set(data.flatMap(Object.keys)));
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      let val = row[header];
      // Handle objects/arrays (stringify them)
      if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val).replace(/"/g, '""'); 
      } else if (typeof val === 'string') {
          val = val.replace(/"/g, '""');
      }
      return `"${val ?? ''}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
