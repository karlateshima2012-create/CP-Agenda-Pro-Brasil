
export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'rejected';
export type UserRole = 'admin' | 'client' | 'super_admin';
export type PlanType = '1m' | '3m' | '6m' | '12m';
export type AccountStatus = 'active' | 'expired' | 'blocked';

export interface Service {
  id?: number;
  name: string;
  description: string;
  duration: number;
  cleaning_buffer?: number;
  price: number;
  imageUrl?: string;
  imageOpacity?: number;
  nameColor?: string;
  descriptionColor?: string;
}

export interface Appointment {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: number;
  serviceName: string;
  startAt: string;
  endAt?: string;
  duration: number;
  status: AppointmentStatus;
  createdAt: string;
  user_id?: string;
  deleted_at?: string | null;
}

export interface WorkingHour {
  day: number | string;
  name: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  timeType?: 'interval' | 'fixed';
  fixedTimes?: string[];
}

export interface BlockedDate {
  id: number;
  date: string;
  reason: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  created_at: string;
  updated_at: string;
}
export interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  paidAt?: string;
  planReference: string;
}

export interface AvailabilityConfig {
  workingHours: WorkingHour[];
  blockedDates: BlockedDate[];
  intervalMinutes: number;
  availableMonths?: number[];
}

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  companyName: string;
  ownerName?: string; // Novo campo para o administrador
  coverImage?: string;
  profileImage?: string;
  shortDescription?: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactPhone?: string;
  planType?: PlanType;
  planExpiresAt?: string;
  accountStatus?: AccountStatus;
  publicLink?: string;
  mustChangePassword?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  lastAccessAt?: string;
  lastAppointmentAt?: string;
  appointmentCount?: number;
  appointmentsLast30Days?: number;
  servicesCount?: number;
  hasTelegram?: boolean;
  hasProfileImage?: boolean;
  hasCoverImage?: boolean;
  hasDescription?: boolean;
  createdAt?: string;
  invoices?: Invoice[];
  viewMode?: 'card' | 'list';
  coverOpacity?: number;
}

export interface AccountInfo {
  companyName: string;
  coverImage?: string;
  profileImage?: string;
  shortDescription?: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactEmail: string;
  contactPhone: string;
  planType: PlanType;
  planExpiresAt: string;
  status: AccountStatus;
  publicLink: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  lifetimeAppointments?: number;
  onboardingSeen?: boolean;
  createdAt?: string;
  invoices?: Invoice[];
  viewMode?: 'card' | 'list';
  coverOpacity?: number;
}
