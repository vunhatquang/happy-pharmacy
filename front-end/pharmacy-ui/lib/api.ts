const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, isFormData = false } = options;

    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = isFormData ? (body as FormData) : JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data as T;
  }

  // Auth
  login(email: string, password: string) {
    return this.request<{ token: string; user: User; message: string }>('/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  register(data: { full_name: string; email: string; phone: string; password: string }) {
    return this.request<{ token: string; user: User; message: string }>('/register', {
      method: 'POST',
      body: data,
    });
  }

  getProfile() {
    return this.request<{ user: User }>('/profile');
  }

  updateProfile(data: { full_name?: string; phone?: string }) {
    return this.request<{ user: User }>('/profile', { method: 'PUT', body: data });
  }

  // Medicines
  getMedicines(category?: string) {
    const params = category ? `?category=${category}` : '';
    return this.request<{ data: Medicine[] }>(`/medicines${params}`);
  }

  getMedicine(id: string) {
    return this.request<{ data: Medicine }>(`/medicines/${id}`);
  }

  searchMedicines(query: string) {
    return this.request<{ data: Medicine[] }>(`/medicines/search?q=${encodeURIComponent(query)}`);
  }

  getCategories() {
    return this.request<{ data: Category[] }>('/categories');
  }

  // Cart
  getCart() {
    return this.request<{ data: CartItem[]; total: number; count: number }>('/cart');
  }

  addToCart(medicineId: string, quantity: number = 1) {
    return this.request('/cart', { method: 'POST', body: { medicine_id: medicineId, quantity } });
  }

  updateCartItem(id: string, quantity: number) {
    return this.request(`/cart/${id}`, { method: 'PUT', body: { quantity } });
  }

  removeFromCart(id: string) {
    return this.request(`/cart/${id}`, { method: 'DELETE' });
  }

  clearCart() {
    return this.request('/cart', { method: 'DELETE' });
  }

  // Addresses
  getAddresses() {
    return this.request<{ data: Address[] }>('/addresses');
  }

  createAddress(data: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    return this.request<{ data: Address }>('/addresses', { method: 'POST', body: data });
  }

  updateAddress(id: string, data: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    return this.request<{ data: Address }>(`/addresses/${id}`, { method: 'PUT', body: data });
  }

  deleteAddress(id: string) {
    return this.request(`/addresses/${id}`, { method: 'DELETE' });
  }

  // Orders
  createOrder(data: { address_id: string; payment_method: string; prescription_id?: string; notes?: string }) {
    return this.request<{ data: Order }>('/orders', { method: 'POST', body: data });
  }

  getOrders() {
    return this.request<{ data: Order[] }>('/orders');
  }

  getOrder(id: string) {
    return this.request<{ data: Order }>(`/orders/${id}`);
  }

  // Prescriptions
  uploadPrescription(formData: FormData) {
    return this.request('/prescriptions', { method: 'POST', body: formData, isFormData: true });
  }

  getPrescriptions() {
    return this.request<{ data: Prescription[] }>('/prescriptions');
  }

  // Subscriptions
  getSubscriptions() {
    return this.request<{ data: Subscription[] }>('/subscriptions');
  }

  createSubscription(data: { medicine_id: string; address_id: string; frequency: string; quantity: number }) {
    return this.request<{ data: Subscription }>('/subscriptions', { method: 'POST', body: data });
  }

  cancelSubscription(id: string) {
    return this.request(`/subscriptions/${id}/cancel`, { method: 'PUT' });
  }

  reactivateSubscription(id: string) {
    return this.request(`/subscriptions/${id}/reactivate`, { method: 'PUT' });
  }

  // AI Chat
  askAssistant(symptoms: string) {
    return this.request<{ reply: string; suggested_products: string[] }>('/ai/chat', {
      method: 'POST',
      body: { symptoms },
    });
  }

  // Video Consultations — customer side
  getConsultationAvailability() {
    return this.request<{ data: ConsultationAvailability }>('/consultations/availability');
  }

  joinConsultationQueue(topic: string) {
    return this.request<{ data: Consultation }>('/consultations', {
      method: 'POST',
      body: { topic },
    });
  }

  getActiveConsultation() {
    return this.request<{ data: Consultation | null; queue_position: number }>('/consultations/active');
  }

  getMyConsultations() {
    return this.request<{ data: Consultation[] }>('/consultations');
  }

  leaveConsultationQueue(id: string) {
    return this.request(`/consultations/${id}`, { method: 'DELETE' });
  }

  // Video Consultations — pharmacist side
  pharmacistGetProfile() {
    return this.request<{ data: PharmacistProfile }>('/pharmacist/me');
  }

  pharmacistSetStatus(status: 'available' | 'offline') {
    return this.request<{ data: PharmacistProfile }>('/pharmacist/status', {
      method: 'PUT',
      body: { status },
    });
  }

  pharmacistGetQueue() {
    return this.request<{ data: Consultation[]; count: number }>('/pharmacist/queue');
  }

  pharmacistClaimNext() {
    return this.request<{ data: Consultation }>('/pharmacist/consultations/next', { method: 'POST' });
  }

  pharmacistGetActive() {
    return this.request<{ data: Consultation | null }>('/pharmacist/consultations/active');
  }

  pharmacistGetHistory() {
    return this.request<{ data: Consultation[] }>('/pharmacist/consultations');
  }

  pharmacistRecommend(consultationId: string, data: { medicine_id: string; quantity: number; note?: string }) {
    return this.request<{ data: ConsultationRecommendation }>(
      `/pharmacist/consultations/${consultationId}/recommend`,
      { method: 'POST', body: data }
    );
  }

  pharmacistComplete(consultationId: string, notes?: string) {
    return this.request(`/pharmacist/consultations/${consultationId}/complete`, {
      method: 'PUT',
      body: { notes: notes || '' },
    });
  }

  // Admin — pharmacists & consultations
  adminGetPharmacists() {
    return this.request<{ data: PharmacistProfile[]; count: number }>('/admin/pharmacists');
  }

  adminCreatePharmacist(data: {
    full_name: string;
    email: string;
    phone?: string;
    password: string;
    license_number: string;
    specialization?: string;
    bio?: string;
    years_experience?: number;
  }) {
    return this.request<{ data: PharmacistProfile }>('/admin/pharmacists', { method: 'POST', body: data });
  }

  adminUpdatePharmacist(id: string, data: Partial<PharmacistProfile>) {
    return this.request(`/admin/pharmacists/${id}`, { method: 'PUT', body: data });
  }

  adminGetConsultations(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{ data: Consultation[]; count: number }>(`/admin/consultations${params}`);
  }

  // Admin
  adminGetStats() {
    return this.request('/admin/stats');
  }

  adminGetAnalytics() {
    return this.request('/admin/analytics');
  }

  adminGetMedicines() {
    return this.request<{ data: Medicine[] }>('/admin/medicines');
  }

  adminCreateMedicine(data: Partial<Medicine>) {
    return this.request('/admin/medicines', { method: 'POST', body: data });
  }

  adminUpdateMedicine(id: string, data: Partial<Medicine>) {
    return this.request(`/admin/medicines/${id}`, { method: 'PUT', body: data });
  }

  adminToggleMedicine(id: string) {
    return this.request(`/admin/medicines/${id}/toggle`, { method: 'PATCH' });
  }

  adminGetOrders(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{ data: Order[] }>(`/admin/orders${params}`);
  }

  adminUpdateOrder(id: string, data: { status?: string; payment_status?: string }) {
    return this.request(`/admin/orders/${id}`, { method: 'PUT', body: data });
  }

  adminGetPrescriptions(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{ data: Prescription[] }>(`/admin/prescriptions${params}`);
  }

  adminReviewPrescription(id: string, status: 'approved' | 'rejected') {
    return this.request(`/admin/prescriptions/${id}/review`, { method: 'PUT', body: { status } });
  }

  adminGetInventory() {
    return this.request<{ data: Medicine[] }>('/admin/inventory');
  }

  adminUpdateStock(id: string, data: { change_qty: number; reason: string }) {
    return this.request(`/admin/inventory/${id}/stock`, { method: 'PUT', body: data });
  }

  adminGetInventoryLogs(id: string) {
    return this.request(`/admin/inventory/${id}/logs`);
  }
}

export const api = new ApiClient();

// Types
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name: string;
  category_id: string;
  requires_prescription: boolean;
  price: number;
  stock_qty: number;
  packaging_type: string;
  description: string;
  image_url: string;
  origin_doc_url: string;
  is_active: boolean;
  category: Category;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  medicine_id: string;
  quantity: number;
  medicine: Medicine;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  is_default: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  address_id: string;
  prescription_id?: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  notes: string;
  items: OrderItem[];
  shipment?: Shipment;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  medicine_id: string;
  quantity: number;
  unit_price: number;
  medicine: Medicine;
}

export interface Shipment {
  id: string;
  order_id: string;
  tracking_code: string;
  carrier: string;
  status: string;
  estimated_delivery?: string;
}

export interface Prescription {
  id: string;
  user_id: string;
  image_url: string;
  doctor_name: string;
  hospital_name: string;
  status: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  medicine_id: string;
  address_id: string;
  frequency: string;
  quantity: number;
  next_order_at: string;
  is_active: boolean;
  medicine: Medicine;
  address: Address;
}

export interface PharmacistProfile {
  id: string;
  user_id: string;
  license_number: string;
  specialization: string;
  bio: string;
  years_experience: number;
  status: 'offline' | 'available' | 'in_call';
  last_active_at?: string;
  user?: User;
  created_at: string;
}

export interface ConsultationRecommendation {
  id: string;
  consultation_id: string;
  medicine_id: string;
  quantity: number;
  note: string;
  medicine?: Medicine;
  created_at: string;
}

export interface Consultation {
  id: string;
  customer_id: string;
  pharmacist_id?: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  topic: string;
  room_name: string;
  pharmacist_notes: string;
  started_at?: string;
  ended_at?: string;
  customer?: User;
  pharmacist?: User;
  recommendations?: ConsultationRecommendation[];
  created_at: string;
}

export interface ConsultationAvailability {
  pharmacists_available: number;
  pharmacists_on_duty: number;
  queue_length: number;
  estimated_wait_minutes: number;
  is_open: boolean;
}

// Helper to format VND currency
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
