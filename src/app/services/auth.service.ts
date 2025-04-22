import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface LoginResponse {
  message: string;
  token: string;
  username?: string; // Ajout du nom d'utilisateur
}

interface StatusResponse {
  isAdmin: boolean;
  username?: string; // Ajout du nom d'utilisateur
}

// Interface pour stocker les informations décodées du token
interface TokenData {
  role: string;
  username?: string;
  exp?: number; // timestamp d'expiration (si utilisé)
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.endpoint}/api/auth`;
  private storageKey = 'admin_token';

  // BehaviorSubject pour l'état de connexion
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  isAdmin$ = this.isAdminSubject.asObservable();

  // Nouveau BehaviorSubject pour le nom d'utilisateur
  private usernameSubject = new BehaviorSubject<string | null>(null);
  username$ = this.usernameSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkStatusOnLoad();
  }

  // Méthode pour obtenir l'état de connexion actuel
  public isAuthenticated(): boolean {
    return this.isAdminSubject.getValue();
  }

  // Méthode pour obtenir le nom d'utilisateur actuel
  public getUsername(): string | null {
    return this.usernameSubject.getValue();
  }

  // Méthode pour obtenir le token
  public getToken(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  // Décodage simple du JWT (sans vérification de signature)
  private parseJwt(token: string): TokenData {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error parsing token:', e);
      return { role: '' };
    }
  }

  // Vérifier le statut au chargement
  checkStatusOnLoad(): void {
    const token = this.getToken();
    if (token) {
      // Optionnel: extraire le nom d'utilisateur du token
      try {
        const tokenData = this.parseJwt(token);
        if (tokenData.username) {
          this.usernameSubject.next(tokenData.username);
        }
      } catch (e) {
        console.error('Error parsing stored token:', e);
      }

      this.http.get<StatusResponse>(`${this.apiUrl}/status`, {
        headers: new HttpHeaders({ 'X-Admin-Token': token })
      }).pipe(
        tap(response => {
          // Mise à jour du nom d'utilisateur si fourni dans la réponse
          if (response.username) {
            this.usernameSubject.next(response.username);
          }
        }),
        map(response => response.isAdmin),
        catchError(() => {
          this.clearToken();
          return of(false);
        })
      ).subscribe(isAdmin => {
        this.isAdminSubject.next(isAdmin);
        if (!isAdmin) {
          this.clearToken();
        }
      });
    } else {
      this.isAdminSubject.next(false);
      this.usernameSubject.next(null);
    }
  }

  // Connexion avec username/password
  login(username: string, password: string): Observable<boolean> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          if (response && response.token) {
            this.storeToken(response.token);
            this.isAdminSubject.next(true);

            // Stocker le nom d'utilisateur
            if (response.username) {
              this.usernameSubject.next(response.username);
            } else {
              // Essayer d'extraire du token
              try {
                const tokenData = this.parseJwt(response.token);
                if (tokenData.username) {
                  this.usernameSubject.next(tokenData.username);
                }
              } catch (e) {
                console.error('Error parsing token after login:', e);
              }
            }
          } else {
            this.clearToken();
            this.isAdminSubject.next(false);
            this.usernameSubject.next(null);
          }
        }),
        map(response => !!response?.token),
        catchError(error => {
          console.error('AuthService: Login failed', error);
          this.clearToken();
          this.isAdminSubject.next(false);
          this.usernameSubject.next(null);
          return of(false);
        })
      );
  }

  // Déconnexion
  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: new HttpHeaders({ 'X-Admin-Token': token })
      })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }

    this.clearToken();
    this.isAdminSubject.next(false);
    this.usernameSubject.next(null);
  }

  // Stocker le token
  private storeToken(token: string): void {
    localStorage.setItem(this.storageKey, token);
  }

  // Effacer le token
  private clearToken(): void {
    localStorage.removeItem(this.storageKey);
  }
}
