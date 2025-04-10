import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
) => {
    const authService = inject(AuthService);
    const token = authService.getToken();

    // Si un token existe, cloner la requête et ajouter l'en-tête
    if (token) {
        const clonedReq = req.clone({
            headers: req.headers.set('X-Admin-Token', token),
        });
        // console.log('AuthInterceptor: Adding X-Admin-Token header'); // Debug
        return next(clonedReq);
    }

    // Sinon, passer la requête originale
    return next(req);
};