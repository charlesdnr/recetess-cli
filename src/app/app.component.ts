// src/app/app.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog'; // Importer DialogModule
import { PasswordModule } from 'primeng/password'; // Importer PasswordModule
import { FormsModule } from '@angular/forms'; // Importer FormsModule
import { ToastModule } from 'primeng/toast'; // Pour messages erreur login
import { MessageService } from 'primeng/api';

import { RecipeService } from './services/recipe.service';
import { AuthService } from './services/auth.service'; // <-- Importer AuthService
import { Category } from './models/recipe.model';
import { Subscription, Observable } from 'rxjs';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, MenubarModule, ButtonModule,
    InputTextModule, DialogModule, PasswordModule, FormsModule, ToastModule, InputGroupModule, InputGroupAddonModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Livre de Recettes';
  items: MenuItem[] = [];
  private categorySub: Subscription | null = null;
  private authSub: Subscription | null = null; // Pour suivre l'état d'auth

  // Propriétés pour le dialogue de login
  displayLoginDialog: boolean = false;
  adminPasswordInput: string = '';
  loginLoading: boolean = false;

  isAdmin$: Observable<boolean>; // Observable pour l'état admin
  currentYear = new Date().getFullYear();

  constructor(
    private recipeService: RecipeService,
    public authService: AuthService, // Rendre public pour accès template facile ou utiliser observable
    private messageService: MessageService,
    private cdRef: ChangeDetectorRef // Injecter pour ChangeDetectionStrategy.OnPush
  ) {
    this.isAdmin$ = this.authService.isAdmin$; // Lier à l'observable du service
    this.authService.checkStatusOnLoad()
  }

  ngOnInit(): void {
    this.loadMenuItems(); // Charge les catégories initialement

    // S'abonner aux changements d'état d'admin pour reconstruire le menu si nécessaire
    this.authSub = this.isAdmin$.subscribe(isAdmin => {
      console.log('Admin status changed:', isAdmin);
      this.buildMenu(); // Reconstruire le menu quand l'état change
      this.cdRef.markForCheck(); // Marquer pour vérification avec OnPush
    });

    // Optionnel : vérifier le statut au cas où le token serait déjà dans sessionStorage
    // this.authService.checkStatusOnLoad(); // Est déjà appelé dans le constructeur du service
  }

  ngOnDestroy(): void {
    if (this.categorySub) this.categorySub.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe(); // Se désabonner de l'état d'auth
  }

  // Charger les catégories (peut rester séparé)
  loadMenuItems(): void {
    if (this.categorySub) this.categorySub.unsubscribe();
    this.categorySub = this.recipeService.getCategories().subscribe(categories => {
      this.buildMenu(categories); // Appeler la fonction de construction
    });
  }

  // Construire le menu (factorisé)
  buildMenu(categories: Category[] = []): void { // Accepte les catégories en argument ou tableau vide
    console.log('Building menu, isAdmin:', this.authService.isAuthenticated());
    const isAdmin = this.authService.isAuthenticated(); // Obtenir l'état actuel

    const categoryMenuItems: MenuItem[] = categories.map(category => ({
      label: category.name,
      routerLink: (!category.subcategories || category.subcategories.length === 0)
        ? ['/category', category.name] : undefined,
      items: (category.subcategories && category.subcategories.length > 0)
        ? category.subcategories.map(sub => ({
          label: sub.name,
          routerLink: ['/category', category.name, sub.name]
        })) : undefined
    }));

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

    // Ajouter les items admin seulement si connecté
    this.items = isAdmin ? [...baseItems, ...adminItems] : baseItems;
    this.cdRef.markForCheck(); // Marquer pour vérification avec OnPush
  }

  // Afficher le dialogue de connexion
  showLoginDialog(): void {
    this.adminPasswordInput = ''; // Vider le champ
    this.displayLoginDialog = true;
  }

  // Tentative de connexion
  attemptLogin(): void {
    if (!this.adminPasswordInput) return;
    this.loginLoading = true;
    this.authService.login(this.adminPasswordInput).subscribe(success => {
      this.loginLoading = false;
      if (success) {
        this.displayLoginDialog = false; // Fermer dialogue si succès
        this.messageService.add({ severity: 'success', summary: 'Connecté', detail: 'Accès admin accordé.' });
      } else {
        this.messageService.add({ severity: 'error', summary: 'Échec', detail: 'Mot de passe incorrect.' });
      }
      this.adminPasswordInput = ''; // Toujours vider
    });
  }

  // Déconnexion
  logout(): void {
    this.authService.logout();
    this.messageService.add({ severity: 'info', summary: 'Déconnecté', detail: 'Accès admin retiré.' });
    // Le menu se met à jour via l'abonnement à isAdmin$
  }
}