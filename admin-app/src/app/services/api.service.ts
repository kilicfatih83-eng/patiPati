import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3001/api'; // Backend server URL

  constructor(private http: HttpClient) { }

  login(isim: string, sifre: string): Observable<any> {
    console.log('ApiService: Attempting login for', isim);
        // Login endpoint is an exception, does not have /api prefix
    return this.http.post(`http://localhost:3001/login`, { isim, sifre }).pipe(
      tap(response => console.log('ApiService: Login response', response))
    );
  }

  getYon(): Observable<any[]> {
    console.log('ApiService: Fetching yonetici list');
    return this.http.get<any[]>(`${this.apiUrl}/getYon`).pipe(
      tap(response => console.log('ApiService: GetYon response', response))
    );
  }

  saveChanges(changes: { updates: any[], inserts: any[], deletes: number[] }): Observable<any> {
    console.log('ApiService: Saving changes', changes);
    return this.http.post(`${this.apiUrl}/save-changes`, changes).pipe(
      tap(response => console.log('ApiService: SaveChanges response', response))
    );
  }

  getBolgeler(): Observable<any[]> {
    console.log('ApiService: Fetching bolge list');
    // Note: The public app uses /api/bolgeler. We use the same for admin.
    return this.http.get<any[]>(`${this.apiUrl}/bolgeler`).pipe(
      tap(response => console.log('ApiService: GetBolgeler response', response))
    );
  }

  getKullanicilar(durum?: number[]): Observable<any[]> {
    let params = new HttpParams();
    if (durum && durum.length > 0) {
      durum.forEach(d => {
        params = params.append('durum', d.toString());
      });
    }
    console.log(`ApiService: Fetching kullanici list with params: ${params.toString()}`);
    return this.http.get<any[]>(`${this.apiUrl}/kullanicilar`, { params }).pipe(
      tap(response => console.log('ApiService: GetKullanicilar response', response))
    );
  }

  updateKullaniciStatus(updates: { id: number, durum: number }[]): Observable<any> {
    console.log('ApiService: Updating user statuses', updates);
    return this.http.post(`${this.apiUrl}/kullanicilar/update-status`, { updates }).pipe(
      tap(response => console.log('ApiService: UpdateKullaniciStatus response', response))
    );
  }

  registerKullanici(userData: any): Observable<any> {
    console.log('ApiService: Registering new user', userData);
    return this.http.post(`${this.apiUrl}/kullanicilar/register`, userData).pipe(
      tap(response => console.log('ApiService: RegisterKullanici response', response))
    );
  }
}
