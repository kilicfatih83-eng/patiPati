import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class ApiService {
  private apiUrl = "http://localhost:3001/api";

  constructor(private http: HttpClient) { }

  login(isim: string, sifre: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/public/login`, { isim, sifre });
  }

  getBolgeler(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bolgeler`);
  }

  getIlanlar(params?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ilanlar`, { params });
  }

  getIlanById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ilanlar/${id}`);
  }

  createIlan(ilanData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ilanlar`, ilanData);
  }

  talipOl(ilanId: string, talipData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ilanlar/${ilanId}/talip-ol`, talipData);
  }

  gonderMesaj(mesajData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mesaj`, mesajData);
  }

  getMyApplications(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-applications`);
  }

  getMyAdsApplicants(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-ads-applicants`);
  }

  getMyAds(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-ads`);
  }

  getTalepDetayFull(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/talep-detay-full/${id}`);
  }

  getTalepDetayKisitli(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/talep-detay-kisitli/${id}`);
  }

  getIlanDetayFull(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ilan-detay-full/${id}`);
  }

  getIlanDetayKisitli(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ilan-detay-kisitli/${id}`);
  }

  getMyYayinHakki(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me/yayin-hakki`);
  }

  getMyAdDetayFull(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-ad-detay-full/${id}`);
  }

  getMyAdDetayKisitli(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-ad-detay-kisitli/${id}`);
  }

}
