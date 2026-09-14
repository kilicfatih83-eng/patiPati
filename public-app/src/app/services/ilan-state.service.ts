import { Injectable, signal } from "@angular/core";

    @Injectable({
      providedIn: "root"
    })
    export class IlanStateService {
      public myAds = signal<any[]>([]);

      constructor() { }

      setMyAds(ilanlar: any[]): void {
        this.myAds.set(ilanlar);
      }

      findAdById(id: number): any | undefined {
        return this.myAds().find(ilan => ilan.id === id);
      }
    }