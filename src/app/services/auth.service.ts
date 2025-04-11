import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface LoginResponse {
  message: string;
  token: string; // Le backend renvoie le token ici
}

interface StatusResponse {
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.endpoint}/api/auth`; // URL base pour l'API d'auth
  private storageKey = 'admin_token'; // Clé pour sessionStorage

  // BehaviorSubject pour l'état de connexion réactif
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(private http: HttpClient) {
    // Vérifier le statut au démarrage (ou si token existe déjà)
    this.checkStatusOnLoad();
  }

  // Méthode pour obtenir l'état de connexion actuel (synchrone)
  public isAuthenticated(): boolean {
    return this.isAdminSubject.getValue();
  }

  // Méthode pour obtenir le token actuel (pour l'intercepteur)
  public getToken(): string | null {
    return sessionStorage.getItem(this.storageKey); // Lire depuis sessionStorage
    // Alternative simple (non persistante) : return this.currentToken;
  }

  // Vérifier le statut auprès du backend au chargement
  checkStatusOnLoad(): void {
    const token = this.getToken();
    if (token) {
      this.http.get<StatusResponse>(`${this.apiUrl}/status`, {
        headers: new HttpHeaders({ 'X-Admin-Token': token }) // Envoyer le token pour vérification
      }).pipe(
        map(response => response.isAdmin),
        catchError(() => of(false)) // Si erreur, considérer comme non connecté
      ).subscribe(isAdmin => {
        this.isAdminSubject.next(isAdmin);
        // if (!isAdmin) {
        //   this.clearToken(); // Nettoyer si le token n'est plus valide
        // }
      });
    } else {
      this.isAdminSubject.next(false);
    }
  }

  // Connexion
  login(password: string): Observable<boolean> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { password })
      .pipe(
        tap(response => {
          if (response && response.token) {
            this.storeToken(response.token); // Stocker le token reçu
            this.isAdminSubject.next(true); // Mettre à jour l'état
          } else {
            // Ne devrait pas arriver si le backend renvoie 200 + token
            this.clearToken();
            this.isAdminSubject.next(false);
          }
        }),
        map(response => !!response?.token), // Retourne true si un token est reçu
        catchError(error => {
          console.error('AuthService: Login failed', error);
          this.clearToken();
          this.isAdminSubject.next(false);
          return of(false); // Retourne false en cas d'erreur
        })
      );
  }

  // Déconnexion
  logout(): void {
    const token = this.getToken();
    if (token) {
      // Informer le backend (optionnel mais propre)
      this.http.post(`${this.apiUrl}/logout`, {}, { headers: new HttpHeaders({ 'X-Admin-Token': token }) })
        .pipe(catchError(() => of(null)))
    }
    // Nettoyer côté client dans tous les cas
    this.clearToken();
    this.isAdminSubject.next(false);
  }

  // Stocker le token (ici dans sessionStorage)
  private storeToken(token: string): void {
    sessionStorage.setItem(this.storageKey, token);
    // Alternative simple (non persistante) : this.currentToken = token;
  }

  // Effacer le token
  private clearToken(): void {
    sessionStorage.removeItem(this.storageKey);
    // Alternative simple (non persistante) : this.currentToken = null;
  }
}
