import { Injectable, signal, computed } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  id: number;
  isim: string;
  bolgeId: number;
  kus?: number;
  kedi?: number;
  kopek?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private tokenKey = 'bolge_token'; // Bolge app token key
  private _token = signal<string | null>(null);
  public currentUser = signal<{ isim: string, bolgeId: number, kus?: number, kedi?: number, kopek?: number } | null>(null);
  public notification = signal<string | null>(null);

  public isLoggedIn = computed(() => !!this.currentUser());

  constructor() {
    const token = localStorage.getItem(this.tokenKey);
    this._token.set(token);
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        this.currentUser.set({ 
          isim: decoded.isim, 
          bolgeId: decoded.bolgeId,
          kus: decoded.kus,
          kedi: decoded.kedi,
          kopek: decoded.kopek
        });
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
      this.currentUser.set({ 
        isim: decoded.isim, 
        bolgeId: decoded.bolgeId,
        kus: decoded.kus,
        kedi: decoded.kedi,
        kopek: decoded.kopek
      });
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
