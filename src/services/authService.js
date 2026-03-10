const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.user = JSON.parse(localStorage.getItem('auth_user') || 'null');
  }

  // Registro de usuario
  async register(userData) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          ...data,
        };
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Verificar email
  async verifyEmail(token) {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          ...data,
        };
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Reenviar correo de verificación
  async resendVerificationEmail(email) {
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          ...data,
        };
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Login
  async login(email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          ...data,
        };
      }

      // Guardar token y usuario
      if (data.data?.token) {
        this.setToken(data.data.token);
        this.setUser(data.data.usuario);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      // Limpiar datos locales
      this.clearAuth();

      return data;
    } catch (error) {
      // Limpiar datos locales incluso si hay error
      this.clearAuth();
      throw error;
    }
  }

  // Obtener usuario actual
  async getUser() {
    try {
      const response = await fetch(`${API_URL}/auth/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth();
        }
        throw {
          status: response.status,
          ...data,
        };
      }

      this.setUser(data.data);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Guardar token
  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Guardar usuario
  setUser(user) {
    this.user = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  // Limpiar autenticación
  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  // Verificar si hay sesión activa
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  // Obtener token
  getToken() {
    return this.token;
  }

  // Obtener usuario
  getUser() {
    return this.user;
  }

  // Hacer request autenticado
  async fetchWithAuth(url, options = {}) {
    const headers = {
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearAuth();
    }

    return response;
  }
}

// Exportar instancia singleton
export default new AuthService();
