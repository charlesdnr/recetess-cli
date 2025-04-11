import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

import { RecipeService } from './services/recipe.service';
import { AuthService } from './services/auth.service';
import { Category } from './models/recipe.model';
import { Subscription, Observable } from 'rxjs';

import { GlobalLoaderComponent } from './components/global-loader/global-loader.component'; // <-- Importer le loader

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, MenubarModule, ButtonModule,
    InputTextModule, DialogModule, PasswordModule, FormsModule,
    ToastModule, InputGroupModule, InputGroupAddonModule,
    GlobalLoaderComponent, RouterLink // <-- Ajouter le loader aux imports
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private recipeService = inject(RecipeService)
  public authService = inject(AuthService)
  private messageService = inject(MessageService)
  private cdRef = inject(ChangeDetectorRef)

  title = 'Livre de Recettes';
  items: MenuItem[] = [];
  private categorySub: Subscription | null = null;
  private authSub: Subscription | null = null;

  displayLoginDialog: boolean = false;
  adminPasswordInput: string = '';
  loginLoading: boolean = false;
  currentSearchTerm: string = '';
  isAdmin$: Observable<boolean>;
  currentYear = new Date().getFullYear();

  constructor() {
    this.isAdmin$ = this.authService.isAdmin$;
    this.authService.checkStatusOnLoad()
  }

  ngOnInit(): void {
    this.loadMenuItems();
    this.authSub = this.isAdmin$.subscribe(isAdmin => {
      // Recharger les catégories pour potentiellement mettre à jour le menu si nécessaire
      this.recipeService.getCategories().subscribe(categories => {
          this.buildMenu(categories); // Reconstruire avec les catégories à jour
      });
      this.cdRef.markForCheck();
    });
  }


  ngOnDestroy(): void {
    if (this.categorySub) this.categorySub.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe();
  }

  loadMenuItems(): void {
    if (this.categorySub) this.categorySub.unsubscribe();
    // Utiliser le cache ou recharger
    this.categorySub = this.recipeService.getCategories().subscribe(categories => {
      this.buildMenu(categories);
    });
  }


  buildMenu(categories: Category[] = []): void {
    const isAdmin = this.authService.isAuthenticated();

    const categoryMenuItems: MenuItem[] = categories.map(category => ({
      label: category.name,
      routerLink: (!category.subcategories || category.subcategories.length === 0)
        ? ['/category', category.name] : undefined,
      items: (category.subcategories && category.subcategories.length > 0)
        ? category.subcategories.map(sub => ({
          label: sub.name,
          routerLink: ['/category', category.name, sub.name]
        })) : undefined
    })).sort((a, b) => a.label.localeCompare(b.label)); // Tri alphabétique

    const baseItems: MenuItem[] = [
      { label: 'Accueil', icon: 'pi pi-home', routerLink: '/' },
      {
        label: 'Catégories',
        icon: 'pi pi-list',
        items: categoryMenuItems.length > 0 ? categoryMenuItems : [{ label: '(Aucune)', disabled: true }]
      },
    ];

    const adminItems: MenuItem[] = [
      { label: 'Nouvelle Recette', icon: 'pi pi-plus', routerLink: '/new-recipe' },
      { label: 'Gérer les Catégories', icon: 'pi pi-cog', routerLink: '/manage-categories' }
    ];

    this.items = isAdmin ? [...baseItems, ...adminItems] : baseItems;
    this.cdRef.markForCheck();
  }


  showLoginDialog(): void {
    this.adminPasswordInput = '';
    this.displayLoginDialog = true;
  }

  attemptLogin(): void {
    if (!this.adminPasswordInput) return;
    this.loginLoading = true;
    this.authService.login(this.adminPasswordInput).subscribe({
        next: success => {
            this.loginLoading = false;
            if (success) {
                this.displayLoginDialog = false;
                this.messageService.add({ severity: 'success', summary: 'Connecté', detail: 'Accès admin accordé.' });
                // Le menu se mettra à jour via l'abonnement à isAdmin$
            } else {
                this.messageService.add({ severity: 'error', summary: 'Échec', detail: 'Mot de passe incorrect.' });
            }
            this.adminPasswordInput = '';
        },
        error: () => {
            // Gérer explicitement l'erreur si le service ne le fait pas déjà (catchError)
             this.loginLoading = false;
             this.messageService.add({ severity: 'error', summary: 'Échec', detail: 'Erreur lors de la connexion.' });
             this.adminPasswordInput = '';
        }
    });
}
performSearch(): void {
  const term = this.currentSearchTerm.trim();
  if (term) {
    // Naviguer vers la page de résultats de recherche en passant le terme comme query param
    this.router.navigate(['/search'], { queryParams: { q: term } });
    this.currentSearchTerm = ''; // Optionnel: vider le champ après la recherche
  }
}

  logout(): void {
    this.authService.logout();
    this.messageService.add({ severity: 'info', summary: 'Déconnecté', detail: 'Accès admin retiré.' });
  }
}