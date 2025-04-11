// src/app/components/global-loader/global-loader.component.ts
import { Component, inject, Signal } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LoadingService } from '../../services/loading.service'; // Ajuste le chemin

@Component({
  selector: 'app-global-loader',
  standalone: true,
  imports: [ProgressSpinnerModule],
  templateUrl: './global-loader.component.html',
  styleUrls: ['./global-loader.component.scss']
})
export class GlobalLoaderComponent {
  private loadingService = inject(LoadingService);
  // Assigne directement le signal du service à une propriété du composant
  isLoading: Signal<boolean> = this.loadingService.isLoading;
}