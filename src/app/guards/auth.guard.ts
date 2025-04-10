import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true; // Autorisé si admin connecté
  } else {
    // Non autorisé, rediriger vers l'accueil
    console.log('AuthGuard: Access denied, redirecting to home.');
    router.navigate(['/']);
    return false;
  }
};