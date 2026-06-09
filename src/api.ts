import apiClient from './apiClient';
import { Appointment, AvailabilityConfig, Service, User, AppointmentStatus, BlockedDate } from '../types';

// ✅ TYPING [M-11]: Generic API response wrapper — replaces Promise<any>
export interface ApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

// ---- Typed payloads ----
export interface LoginCredentials { email: string; password: string; }
export interface CreateUserPayload {
    email: string; password: string;
    companyName: string; ownerName: string;
    contactPhone?: string; planType?: string;
}
export interface BookingPayload {
    professional_id: string | null;
    serviceId: number; serviceName: string;
    startAt: string; duration: number;
    clientName: string; clientPhone: string; clientEmail?: string;
}
export interface ProfileUpdatePayload {
    name?: string; short_description?: string;
    services_title?: string; services_subtitle?: string;
    primary_color?: string; secondary_color?: string;
    cover_image?: string; profile_image?: string;
    telegram_bot_token?: string; telegram_chat_id?: string;
}

export const api = {
    // Auth
    async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User }>> {
        return apiClient.post('/auth/login', credentials);
    },

    async logout(): Promise<ApiResponse> {
        return apiClient.post('/auth/logout');
    },

    async getMe(): Promise<ApiResponse<{ user: User; account: Record<string, unknown> }>> {
        return apiClient.get('/auth/me');
    },

    // Diagnostics
    async ping(): Promise<ApiResponse> {
        return apiClient.get('/ping');
    },

    async checkDb(): Promise<ApiResponse> {
        return apiClient.get('/db');
    },

    // Services
    async listServices(): Promise<ApiResponse<Service[]>> {
        return apiClient.get('/services');
    },

    async saveServices(services: Service[]): Promise<ApiResponse> {
        return apiClient.put('/services', services);
    },

    // Availability
    async getAvailability(): Promise<ApiResponse<AvailabilityConfig>> {
        return apiClient.get('/availability');
    },

    async saveAvailability(payload: AvailabilityConfig): Promise<ApiResponse> {
        return apiClient.put('/availability', payload);
    },

    // Blocked Dates
    async listBlockedDates(): Promise<ApiResponse<BlockedDate[]>> {
        return apiClient.get('/blocked-dates');
    },

    async addBlockedDate(data: { date: string; reason: string; startTime?: string | null; endTime?: string | null }): Promise<ApiResponse<BlockedDate>> {
        return apiClient.post('/blocked-dates', data);
    },

    async deleteBlockedDate(id: number): Promise<ApiResponse> {
        return apiClient.delete(`/blocked-dates/${id}`);
    },

    // Appointments
    async listAppointments(filters?: { from?: string; to?: string; history?: boolean; page?: number; limit?: number; source?: 'active' | 'archive' }): Promise<ApiResponse<{ items: Appointment[]; pagination: { total: number; page: number; limit: number; hasMore: boolean } }>> {
        return apiClient.get('/appointments', { params: filters });
    },

    async updateAppointmentStatus(id: number, status: AppointmentStatus): Promise<ApiResponse> {
        return apiClient.patch(`/appointments/${id}/status`, { status });
    },

    async deleteAppointment(id: number): Promise<ApiResponse> {
        return apiClient.delete(`/appointments/${id}`);
    },

    async bulkDeleteAppointments(ids: number[]): Promise<ApiResponse> {
        return apiClient.post('/appointments/bulk-delete', { ids });
    },

    async createPublicAppointment(data: BookingPayload): Promise<ApiResponse<{ id: number }>> {
        return apiClient.post('/appointments/create', data);
    },

    async getPublicProfile(id: string): Promise<ApiResponse> {
        return apiClient.get(`/public/profile/${id}`);
    },

    async updateProfile(data: ProfileUpdatePayload): Promise<ApiResponse> {
        return apiClient.patch('/me/profile', data);
    },

    // Clients (CRM)
    async listClients(search?: string): Promise<ApiResponse> {
        return apiClient.get('/clients', { params: { search } });
    },

    async saveClient(data: { name: string; phone: string; email?: string }): Promise<ApiResponse> {
        return apiClient.post('/clients', data);
    },

    async deleteClient(id: number): Promise<ApiResponse> {
        return apiClient.delete(`/clients/${id}`);
    },

    // Admin
    async adminListProfiles(): Promise<ApiResponse<User[]>> {
        return apiClient.get('/admin/profiles');
    },

    async adminUpdateProfile(id: string, data: Partial<User>): Promise<ApiResponse> {
        return apiClient.patch(`/admin/profiles/${id}`, data);
    },

    async adminRenewPlan(id: string, months: number): Promise<ApiResponse<{ newExpiryDate: string }>> {
        return apiClient.post(`/admin/profiles/${id}/renew`, { months });
    },

    async adminCreateUser(data: CreateUserPayload): Promise<ApiResponse<{ id: number }>> {
        return apiClient.post('/admin/users', data);
    },

    async adminDeleteUser(id: string): Promise<ApiResponse> {
        return apiClient.delete(`/admin/users/${id}`);
    },

    async changePassword(password: string): Promise<ApiResponse> {
        return apiClient.post('/me/change-password', { password });
    },

    async updateOnboarding(seen: boolean): Promise<ApiResponse> {
        return apiClient.post('/me/onboarding', { seen });
    },

    async requestPasswordReset(email: string): Promise<ApiResponse> {
        return apiClient.post('/auth/forgot-password', { email });
    },

    async confirmPasswordReset(code: string, password: string): Promise<ApiResponse> {
        return apiClient.post('/auth/reset-password', { code, password });
    }
};


