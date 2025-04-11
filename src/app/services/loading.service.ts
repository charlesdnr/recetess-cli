// src/app/services/loading.service.ts
import { Injectable, signal, computed, WritableSignal, Signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private requestCount = signal(0);

  readonly isLoading: Signal<boolean> = computed(() => this.requestCount() > 0);

  showLoader(): void {
    this.requestCount.update(count => count + 1);
  }

  hideLoader(): void {
    this.requestCount.update(count => Math.max(0, count - 1));
  }
}