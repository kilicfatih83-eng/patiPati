import { Injectable, signal, computed } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  id: number;
  isim: string;
  adm: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private tokenKey = 'token'; // Admin token key
  private _token = signal<string | null>(null);
  public currentUser = signal<{ isim: string, adm: number } | null>(null);
  public notification = signal<string | null>(null);
  public authError = signal<string | null>(null); // For auth errors

  public isLoggedIn = computed(() => !!this.currentUser());

  constructor() {
    const token = localStorage.getItem(this.tokenKey);
    this._token.set(token);
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        this.currentUser.set({ isim: decoded.isim, adm: decoded.adm });
      } catch (e) {
        console.error('Invalid token found', e);
        this.removeToken();
      }
    }
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this._token.set(token);
    try {
      const decoded: DecodedToken = jwtDecode(token);
      this.currentUser.set({ isim: decoded.isim, adm: decoded.adm });
    } catch (e) {
      console.error('Invalid token on set', e);
      this.currentUser.set(null);
    }
  }

  getToken(): string | null {
    return this._token();
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    this._token.set(null);
    this.currentUser.set(null);
    this.authError.set(null); // Clear auth error on logout
  }

  handleAuthError(): void {
    const errorMessage = "giriş yapın";
    this.removeToken();
    this.authError.set(errorMessage);
    this.setNotification(errorMessage, 10000); // Also use the main notification for visibility
  }

  setNotification(message: string, duration: number = 5000): void {
    this.notification.set(message);
    setTimeout(() => {
      if (this.notification() === message) {
        this.notification.set(null);
      }
    }, duration);
  }

  clearNotification(): void {
    this.notification.set(null);
  }
}
