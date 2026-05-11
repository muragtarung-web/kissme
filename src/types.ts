export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'customer' | 'admin' | 'staff';
  points: number;
  tier: LoyaltyTier;
  photoURL?: string;
  createdAt: any;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image: string;
  images?: string[];
  available: boolean;
  stock?: number;
  trackInventory?: boolean;
  bestSeller?: boolean;
  featured?: boolean;
  variants?: string[];
}

export interface Order {
  id: string;
  customerId: string;
  status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivery' | 'delivered' | 'cancelled' | 'completed';
  type: 'dine-in' | 'pickup' | 'delivery' | 'advance' | 'bulk' | 'catering' | 'Terminal';
  total: number;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod: string;
  createdAt: any;
  statusHistory?: {
    status: string;
    timestamp: any;
    note?: string;
  }[];
}

export interface Event {
  id: string;
  title: string;
  desc: string;
  date: string;
  time: string;
  img: string;
}

export interface Moment {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: any;
  featured?: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'active' | 'on-leave' | 'inactive';
  joinedAt: string;
  dailyRate: number;
  standardHours: number;
  overtimeRatePerHour: number;
  lateDeductionPerHour: number;
  absentDeduction: number;
  allowOvertime: boolean;
}

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  note?: string;
  timeIn?: string;
  timeOut?: string;
  earnedAmount?: number;
  overtimePay?: number;
  overtimeHours?: number;
  deductions?: number;
  status: 'scheduled' | 'active' | 'completed' | 'absent' | 'late';
}

export interface SiteSettings {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  heroTagline?: string;
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  featuresTitle?: string;
  delicaciesTitle?: string;
  eventsTitle?: string;
  momentsTitle?: string;
  membershipTitle?: string;
  visitTitle?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  membersTitle?: string;
  eventsPageTagline?: string;
  eventsPageTitle?: string;
  featuredEventBadge?: string;
  featuredEventDate?: string;
  featuredEventTitle?: string;
  featuredEventDescription?: string;
  featuredEventImage?: string;
  officialLogo?: string;
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  contactEmail: string;
  contactPhone: string;
  address: string;
  openingHours: string;
  delicacies?: {
    name: string;
    price: string;
    image: string;
  }[];
}

export interface Reservation {
  id: string;
  customerId: string;
  date: string;
  time: string;
  guests: number | string;
  type: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'booked' | 'completed' | 'cancelled';
  tableNumber?: string;
  tableId?: string;
  eventId?: string;
  fullName?: string;
  phone?: string;
  createdAt?: any;
}

export interface Reminder {
  id: string;
  eventId: string;
  message: string;
  subject: string;
  scheduledAt: any;
  sentAt?: any;
  type: 'email' | 'in-app' | 'both';
  status: 'scheduled' | 'sent' | 'failed';
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  eventId?: string;
  type?: 'order' | 'reservation' | 'event' | 'system';
  referenceId?: string;
}
