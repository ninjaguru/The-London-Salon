
import { 
  Staff, Product, Customer, Appointment, Sale, Membership, Notification, Category,
  Role, AppointmentStatus 
} from '../types';

// Initial Seed Data
const INITIAL_STAFF: Staff[] = [
  { id: '1', name: 'Alice Chen', role: Role.Manager, specialties: ['Management'], active: true, target: 0, salary: 50000 },
  { id: '2', name: 'Marco Rossi', role: Role.HairStylist, specialties: ['Cutting', 'Styling'], active: true, target: 100000, salary: 35000 },
  { id: '3', name: 'Sarah Jones', role: Role.Beautician, specialties: ['Facials', 'Waxing'], active: true, target: 80000, salary: 32000 },
  { id: '4', name: 'David Smith', role: Role.HouseKeeping, specialties: ['Cleaning'], active: true, target: 0, salary: 20000 },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Hair Care', description: 'Shampoos, Conditioners, and Treatments' },
  { id: '2', name: 'Styling', description: 'Gels, Sprays, and Mousse' },
  { id: '3', name: 'Tools', description: 'Brushes, Combs, and Accessories' }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Silk Shampoo', brand: 'LuxeLock', quantity: 45, price: 1200, category: 'Hair Care', minThreshold: 10 },
  { id: '2', name: 'Velvet Conditioner', brand: 'LuxeLock', quantity: 8, price: 1400, category: 'Hair Care', minThreshold: 15 },
  { id: '3', name: 'Gold Serum', brand: 'ShineCo', quantity: 12, price: 2500, category: 'Hair Care', minThreshold: 5 },
  { id: '4', name: 'Hairspray Strong', brand: 'HoldIt', quantity: 50, price: 850, category: 'Styling', minThreshold: 10 },
  { id: '5', name: 'Hair Mask', brand: 'DeepCare', quantity: 2, price: 1800, category: 'Hair Care', minThreshold: 5 },
];

const INITIAL_MEMBERSHIPS: Membership[] = [
  { 
    id: '1', name: 'Silver Wallet', cost: 5000, creditValue: 6000, description: 'Pay ₹5000, get ₹6000 worth of services.',
    complimentaryServices: ['Free Hair Wash'], validityMonths: 6
  },
  { 
    id: '2', name: 'Gold Wallet', cost: 10000, creditValue: 12500, description: 'Pay ₹10000, get ₹12500 worth of services.',
    complimentaryServices: ['Free Haircut', 'Free Head Massage'], validityMonths: 12
  },
  { 
    id: '3', name: 'Platinum Wallet', cost: 25000, creditValue: 32000, description: 'Pay ₹25000, get ₹32000 worth of services.',
    complimentaryServices: ['Free Haircut', 'Free Facial', 'Priority Booking'], validityMonths: 12
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { 
    id: '1', name: 'Emma Watson', email: 'emma@example.com', phone: '9876543210', 
    apartment: 'Apt 4B, Hyde Park', birthday: '1990-04-15', anniversary: '2015-06-20',
    walletBalance: 2500, membershipId: '1', joinDate: '2023-01-15',
    membershipRenewalDate: '2024-01-15'
  },
  { 
    id: '2', name: 'John Doe', email: 'john@example.com', phone: '9876543211', 
    apartment: 'Villa 12, Palm Springs', birthday: '1985-08-20', anniversary: '',
    walletBalance: 0, membershipId: undefined, joinDate: '2023-03-20'
  },
  { 
    id: '3', name: 'Jane Smith', email: 'jane@example.com', phone: '9876543212', 
    apartment: 'Flat 101, City Center', birthday: '1992-12-10', anniversary: '2018-02-14',
    walletBalance: 500, membershipId: '1', joinDate: '2023-06-10',
    membershipRenewalDate: '2024-06-10'
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: '1', customerId: '1', staffId: '2', serviceName: 'Haircut & Style', date: new Date().toISOString().split('T')[0], time: '10:00', durationMin: 60, status: AppointmentStatus.Scheduled, price: 2000 },
  { id: '2', customerId: '2', staffId: '3', serviceName: 'Full Color', date: new Date().toISOString().split('T')[0], time: '13:00', durationMin: 120, status: AppointmentStatus.Completed, price: 4500 },
  // Historical data for reports
  { id: '3', customerId: '3', staffId: '2', serviceName: 'Haircut', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], time: '11:00', durationMin: 45, status: AppointmentStatus.Completed, price: 1500 },
  { id: '4', customerId: '1', staffId: '3', serviceName: 'Highlights', date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], time: '14:00', durationMin: 90, status: AppointmentStatus.Completed, price: 3500 },
];

const INITIAL_SALES: Sale[] = [
  { 
    id: '1', 
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    customerId: '1', 
    items: [{ name: 'Silk Shampoo', price: 1200, quantity: 1, type: 'Product' }], 
    total: 1200,
    paymentMethod: 'Cash'
  },
  { 
    id: '2', 
    date: new Date(Date.now() - 86400000 * 3).toISOString(), 
    customerId: '2', 
    items: [
      { name: 'Gold Serum', price: 2500, quantity: 1, type: 'Product' },
      { name: 'Velvet Conditioner', price: 1400, quantity: 1, type: 'Product' }
    ], 
    total: 3900,
    paymentMethod: 'Card'
  }
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Low Stock Warning',
    message: 'Velvet Conditioner is below the minimum threshold (8 left).',
    date: new Date().toISOString(),
    read: false,
    relatedId: '2'
  },
  {
    id: '2',
    type: 'reminder',
    title: 'Appointment Reminder',
    message: 'Reminder sent to Emma Watson for appointment tomorrow at 10:00.',
    date: new Date().toISOString(),
    read: true,
    relatedId: '1'
  }
];

// Helper to manage generic CRUD
class StorageService<T> {
  private key: string;
  private initialData: T[];

  constructor(key: string, initialData: T[]) {
    this.key = key;
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
  }

  add(item: T) {
    const all = this.getAll();
    all.push(item);
    this.save(all);
  }
}

export const db = {
  staff: new StorageService<Staff>('salon_staff_v2', INITIAL_STAFF),
  categories: new StorageService<Category>('salon_categories', INITIAL_CATEGORIES),
  inventory: new StorageService<Product>('salon_inventory', INITIAL_PRODUCTS),
  customers: new StorageService<Customer>('salon_customers_v3', INITIAL_CUSTOMERS),
  memberships: new StorageService<Membership>('salon_memberships_v3', INITIAL_MEMBERSHIPS),
  appointments: new StorageService<Appointment>('salon_appointments', INITIAL_APPOINTMENTS),
  sales: new StorageService<Sale>('salon_sales', INITIAL_SALES),
  notifications: new StorageService<Notification>('salon_notifications', INITIAL_NOTIFICATIONS),
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
