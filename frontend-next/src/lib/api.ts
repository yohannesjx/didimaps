const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://maps.didi.et';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user?: {
    id: string;
    phone: string;
    phone_verified: boolean;
    name?: string;
    role: string;
    is_new?: boolean;
  };
}

interface Business {
  id: string;
  name: string;
  name_am?: string;
  lat: number;
  lng: number;
  address?: string;
  city: string;
  avg_rating: number;
  review_count: number;
  distance_m?: number;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
}

interface Category {
  id: string;
  name: string;
  name_am?: string;
  icon?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  }

  // Auth
  async sendCode(phone: string) {
    return this.fetch<{ message: string; expires_in: number }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyCode(phone: string, code: string) {
    const res = await this.fetch<TokenResponse>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    this.setToken(res.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', res.refresh_token);
    }
    return res;
  }

  async login(email: string, password: string) {
    const res = await this.fetch<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  // User
  async getMe() {
    return this.fetch<{
      id: string;
      phone: string;
      name?: string;
      photo_url?: string;
      role: string;
    }>('/api/me');
  }

  async updateMe(data: { name?: string; photo_url?: string }) {
    return this.fetch('/api/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Geocoding
  async search(q: string) {
    return this.fetch<{ results: Array<{
      place_id: number;
      name: string;
      display_name: string;
      lat: string;
      lng: string;
      type: string;
    }> }>(`/api/search?q=${encodeURIComponent(q)}`);
  }

  async reverse(lat: number, lng: number) {
    return this.fetch<{
      display_name: string;
      address?: Record<string, string>;
    }>(`/api/reverse?lat=${lat}&lng=${lng}`);
  }

  // Routing
  async getRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    return this.fetch<{
      code: string;
      routes: Array<{
        distance: number;
        duration: number;
        geometry: string;
      }>;
    }>(`/api/route?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`);
  }

  // Categories
  async getCategories() {
    return this.fetch<Category[]>('/api/categories');
  }

  // Businesses
  async getNearbyBusinesses(lat: number, lng: number, radius = 1000, category?: string) {
    let url = `/api/business/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
    if (category) url += `&category=${category}`;
    return this.fetch<{ businesses: Business[]; count: number }>(url);
  }

  async searchBusinesses(q: string) {
    return this.fetch<{ businesses: Business[]; count: number }>(
      `/api/business/search?q=${encodeURIComponent(q)}`
    );
  }

  async getBusiness(id: string) {
    return this.fetch<Business & {
      description?: string;
      phone?: string;
      email?: string;
      website?: string;
      hours?: Array<{
        day_of_week: number;
        open_time?: string;
        close_time?: string;
        is_closed: boolean;
      }>;
      media?: Array<{
        id: string;
        media_type: string;
        url: string;
        thumbnail_url?: string;
      }>;
      is_saved: boolean;
    }>(`/api/business/${id}`);
  }

  async createBusiness(data: {
    name: string;
    lat: number;
    lng: number;
    category_id?: string;
    description?: string;
    phone?: string;
  }) {
    return this.fetch<{ id: string; message: string }>('/api/business', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveBusiness(id: string) {
    return this.fetch(`/api/business/${id}/save`, { method: 'POST' });
  }

  async unsaveBusiness(id: string) {
    return this.fetch(`/api/business/${id}/save`, { method: 'DELETE' });
  }

  async getSavedBusinesses() {
    return this.fetch<Business[]>('/api/business/saved');
  }

  // Posts
  async getFeed(lat?: number, lng?: number) {
    let url = '/api/posts/feed';
    if (lat && lng) url += `?lat=${lat}&lng=${lng}`;
    return this.fetch<{
      posts: Array<{
        id: string;
        user: { id: string; name?: string; photo_url?: string };
        content_type: string;
        media_url: string;
        thumbnail_url?: string;
        caption?: string;
        lat?: number;
        lng?: number;
        like_count: number;
        liked: boolean;
        created_at: string;
      }>;
    }>(url);
  }

  async likePost(id: string) {
    return this.fetch(`/api/posts/${id}/like`, { method: 'POST' });
  }

  async unlikePost(id: string) {
    return this.fetch(`/api/posts/${id}/like`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export type { Business, Category, TokenResponse };
