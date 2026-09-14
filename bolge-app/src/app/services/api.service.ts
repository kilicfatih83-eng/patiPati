import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3001/api';

  login(isim: string, sifre: string): Observable<any> {
        // Login endpoint is an exception, does not have /api prefix
    return this.http.post('http://localhost:3001/login', { isim, sifre });
  }

  getIlanlar(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.apiUrl}/bolge/ilanlar`, { params });
  }

  updateIlanDurum(updates: {id: number, durum: number}[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/bolge/ilan-durum-guncelle`, { updates });
  }

  getTalipler(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.apiUrl}/bolge/talipler`, { params });
  }

  updateTalipDurum(updates: {id: number, durum: number}[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/bolge/talip-durum-guncelle`, { updates });
  }

  getIlanDetayForBolge(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/bolge/ilan-detay/${id}`);
  }
}
