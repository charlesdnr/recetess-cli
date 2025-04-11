// src/app/interceptors/loading.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service'; // Ajuste le chemin si nécessaire

export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const loadingService = inject(LoadingService);

  // Affiche le loader AVANT d'envoyer la requête
  loadingService.showLoader();

  return next(req).pipe(
    finalize(() => {
      // Cache le loader APRÈS avoir reçu la réponse (ou une erreur)
      loadingService.hideLoader();
    })
  );
};