import { Component, OnInit, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InfoMessageComponent } from '../components/info-message/info-message.component';

@Component({
  selector: 'app-vitrin',
  standalone: true,
  imports: [CommonModule, FormsModule, InfoMessageComponent],
  templateUrl: './vitrin.component.html',
  styleUrls: ['./vitrin.component.css']
})
export class VitrinComponent implements OnInit {
  ilanlar = signal<any[]>([]);
  bolgeler = signal<any[]>([]);
  hayvanTurleri = signal(['kedi', 'köpek', 'kuş']);

  selectedBolge = signal('');
  selectedTur = signal('');
  ilanIdSearch = signal('');

  bilgiMesaji = signal<{text: string, type: 'error' | 'success'} | null>(null);
  readonly vitrinInfoMessage = 'Sistemde yayınlanan ve onaylanmış tüm ilanları bu sayfada görebilirsiniz. Detayları görmek için bir ilana tıklayın.';


  isLoggedIn: Signal<boolean>;

  constructor(private apiService: ApiService, private authService: AuthService, private router: Router, private route: ActivatedRoute) {
    this.isLoggedIn = this.authService.isLoggedIn;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const ilanIdFromQuery = params['ilan_id'];
      if (ilanIdFromQuery) {
        this.ilanIdSearch.set(ilanIdFromQuery);
        this.searchIlanById();
      } else {
        this.loadIlanlar();
      }
    });
    this.loadBolgeler();
  }

  loadIlanlar(): void {
    this.bilgiMesaji.set(null);
    const params: any = {};
    if (this.selectedBolge()) {
      params.bolge = this.selectedBolge();
    }
    if (this.selectedTur()) {
      params.tur = this.selectedTur();
    }

    this.apiService.getIlanlar(params).subscribe({
      next: (data) => {
        this.ilanlar.set(data);
      },
      error: (err) => {
        this.bilgiMesaji.set({ text: err.error?.message || 'İlanlar yüklenirken bir hata oluştu.', type: 'error' });
      }
    });
  }

  loadBolgeler(): void {
    this.bilgiMesaji.set(null);
    this.apiService.getBolgeler().subscribe({
      next: (data) => {
        this.bolgeler.set(data);
      },
      error: (err) => {
        this.bilgiMesaji.set({ text: err.error?.message || 'Bölgeler yüklenirken bir hata oluştu.', type: 'error' });
      }
    });
  }

  applyFilters(): void {
    this.ilanIdSearch.set(''); // Clear the other search when applying filters
    this.loadIlanlar();
  }

  searchIlanById(): void {
    this.bilgiMesaji.set(null);
    if (!this.ilanIdSearch() || this.ilanIdSearch().trim() === '') {
        this.loadIlanlar(); // Load all if search is empty
        return;
    }
    // Clear other filters when searching by ID
    this.selectedBolge.set('');
    this.selectedTur.set('');
    this.apiService.getIlanlar({ ilan_id: this.ilanIdSearch().trim() }).subscribe({
      next: (data) => {
        this.ilanlar.set(data);
      },
      error: (err) => {
        this.bilgiMesaji.set({ text: err.error?.message || 'İlan aranırken bir hata oluştu.', type: 'error' });
      }
    });
  }

  viewDetails(ilan: any): void {
    // Pass the full ad object to the detail page
    // This ensures the detail page knows the 'durum' and can fetch accordingly.
    this.router.navigate(['/ilan', ilan.id], { state: { ilanData: ilan } });
  }
  
  goToIlanVer(): void {
    this.router.navigate(['/ilan/yeni']);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout();
  }
}
