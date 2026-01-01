
export enum Role {
  Admin = 'Admin',
  Manager = 'Manager',
  HairStylist = 'Hair Stylist',
  Beautician = 'Beautician',
  HouseKeeping = 'House Keeping'
}

export interface User {
  username: string;
  name: string;
  role: 'Admin' | 'Manager';
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

export type GenderTarget = 'Men' | 'Women' | 'Unisex';

export interface Service {
  id: string;
  name: string;
  categoryId: string; // Links to Category ID
  price: number;
  offerPrice?: number;
  gender: GenderTarget;
  durationMin: number;
  description?: string;
}

export interface Combo {
  id: string;
  name: string;
  price: number;
  description: string; // Comma separated services or details
  active: boolean;
  gender: GenderTarget;
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

export interface CouponTemplate {
  id: string;
  name: string;
  code: string;
  discountType: 'Percentage' | 'Fixed';
  value: number;
  validityDays: number;
  description: string;
}

export interface CustomerCoupon {
  id: string;
  templateId: string;
  name: string;
  code: string;
  description: string;
  assignedDate: string;
  expiryDate: string;
  isRedeemed: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  apartment: string;
  birthday: string;
  anniversary: string;

  // Wallet Packages
  packageId?: string; // Link to the specific wallet plan/package

  // Yearly Membership
  isMember: boolean; // Paid 200rs yearly membership
  membershipExpiry?: string; // ISO Date string for yearly membership

  membershipRenewalDate?: string; // ISO Date string for Wallet Package Expiry (Legacy name kept for compatibility or refactored)

  walletBalance: number; // Current credit balance
  joinDate: string;
  notes?: string;
  activeCoupons: CustomerCoupon[];
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
  discount: number; // Discount amount applied
  paymentMethod?: 'Cash' | 'Card' | 'UPI' | 'Wallet'; // Method of payment used
}

export interface Sale {
  id: string;
  date: string;
  customerId: string | null; // Can be guest
  staffId?: string; // Links to Staff ID
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    type: 'Service' | 'Product' | 'Package' | 'Combo' | 'Membership';
  }>;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Wallet';
}

export interface Package {
  id: string;
  name: string;
  cost: number; // How much the customer pays (e.g. 5000)
  creditValue: number; // How much value they get (e.g. 6000)
  description: string;
  complimentaryServices: string[]; // List of free services
  validityMonths: number; // Duration in months
  gender: GenderTarget;
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

// --- LEADS ---

export type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Converted' | 'Lost';

export interface LeadComment {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string; // e.g. Instagram, Referral, Walk-in
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  comments: LeadComment[];
}