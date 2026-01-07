const API_URL = import.meta.env.VITE_API_URL || 'https://medmap-backend-6t7y.onrender.com/api';

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor' | 'admin';
  phone_number?: string;
}

export const api = {
  async login(email: string, password: string): Promise<{ user?: User; token?: string; error?: any }> {
    try {
      const response = await fetch(`${API_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();
      if (!response.ok) return { error: data };

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      const user = await this.getProfile(data.access);
      return { user, token: data.access };
    } catch (error) {
      return { error };
    }
  },

  async signup(data: any): Promise<{ user?: User; error?: any }> {
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok) return { error: responseData };
      return { user: responseData };
    } catch (error) {
      return { error };
    }
  },

  async getProfile(token: string): Promise<User> {
    const response = await fetch(`${API_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('access_token');

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Only add JSON content-type if body is not FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // ensures cookies are sent if session auth is ever used
    });

    return response;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await this.request(`/users/${id}/`);
      if (!response.ok) return null;
      return response.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    try {
      const response = await this.request(`/users/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const response = await this.request('/users/change_password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.old_password || 'Failed to change password');
    }
    return response.json();
  },
};
