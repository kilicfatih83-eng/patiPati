import { Injectable, signal, computed } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private userKey = 'public_user_data';
  public currentUser = signal<{ id: number, isim: string, yayinHakki: number } | null>(null);
  public yayinHakki = computed(() => this.currentUser()?.yayinHakki ?? null);
  public notification = signal<string | null>(null);
  public headerStatusMessage = signal<string | null>(null);

  public isLoggedIn = computed(() => !!this.currentUser());

  constructor() {
    const storedUser = localStorage.getItem(this.userKey);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        this.currentUser.set(userData.user);
      } catch (error) {
        console.error("Invalid user data in storage", error);
        this.logout();
      }
    }
  }

  setLoginData(response: { token: string, user: { id: number, isim: string, yayinHakki: number } }): void {
    const dataToStore = JSON.stringify(response);
    localStorage.setItem(this.userKey, dataToStore);
    this.currentUser.set(response.user);
  }

  getToken(): string | null {
    const storedUser = localStorage.getItem(this.userKey);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        return userData.token || null;
      } catch {
        return null;
      }
    }
    return null;
  }
  
  logout(): void {
      localStorage.removeItem(this.userKey);
      this.currentUser.set(null);
  }

  updateYayinHakki(newHak: number): void {
    const currentUser = this.currentUser();
    if (currentUser) {
        const updatedUser = { ...currentUser, yayinHakki: newHak };
        this.currentUser.set(updatedUser);

        const storedData = localStorage.getItem(this.userKey);
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                parsedData.user = updatedUser;
                localStorage.setItem(this.userKey, JSON.stringify(parsedData));
            } catch (e) {
                console.error("Failed to update yayinHakki in localStorage", e);
            }
        }
    }
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

  setHeaderStatusMessage(message: string | null): void {
    this.headerStatusMessage.set(message);
  }
}
