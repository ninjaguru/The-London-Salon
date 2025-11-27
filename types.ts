
export enum Role {
  Admin = 'Admin',
  Manager = 'Manager',
  HairStylist = 'Hair Stylist',
  Beautician = 'Beautician',
  HouseKeeping = 'House Keeping'
}

export interface Staff {
  id: string;
  name: string;
  role: Role;
  specialties: string[];
  active: boolean;
  target?: number; // Monthly revenue target
  salary?: number; // Monthly salary
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  price: number;
  category: string;
  minThreshold: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  apartment: string;
  birthday: string;
  anniversary: string;
  membershipId?: string; // Link to the specific membership plan they bought
  membershipRenewalDate?: string; // ISO Date string
  walletBalance: number; // Current credit balance
  joinDate: string;
  notes?: string;
}

export enum AppointmentStatus {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface Appointment {
  id: string;
  customerId: string;
  staffId: string;
  serviceName: string;
  date: string; // ISO Date string
  time: string;
  durationMin: number;
  status: AppointmentStatus;
  price: number;
}

export interface Sale {
  id: string;
  date: string;
  customerId: string | null; // Can be guest
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    type: 'Service' | 'Product' | 'Membership';
  }>;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Wallet';
}

export interface Membership {
  id: string;
  name: string;
  cost: number; // How much the customer pays (e.g. 5000)
  creditValue: number; // How much value they get (e.g. 6000)
  description: string;
  complimentaryServices: string[]; // List of free services
  validityMonths: number; // Duration in months
}

export type NotificationType = 'reminder' | 'alert' | 'info' | 'staff';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  relatedId?: string;
}
