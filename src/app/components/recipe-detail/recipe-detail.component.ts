// src/app/components/recipe-detail/recipe-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { TabViewModule } from 'primeng/tabview';
// StepsModule n'est pas utilisé dans le template, peut être enlevé si non nécessaire ailleurs
// import { StepsModule } from 'primeng/steps';
// import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner'; // Ajouter pour le chargement
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    ChipModule,
    TabViewModule,
    // StepsModule, // Enlever si non utilisé
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    ProgressSpinnerModule ,
    MessageModule
  ],
  providers: [
    ConfirmationService,
    MessageService
  ],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss']
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  recipeId: string = '';
  isLoading: boolean = false; // Ajouter pour l'indicateur de chargement
  showPrintDialog: boolean = false;
  // backendBaseUrl n'est plus nécessaire ici si les images viennent de Firebase
  // readonly backendBaseUrl: string;

  isAdmin$: Observable<boolean>;

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router,
    public authService: AuthService
  ) {
    // this.backendBaseUrl = this.recipeService.backendBaseUrl; // Plus nécessaire
    this.isAdmin$ = this.authService.isAdmin$;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.recipeId = params.get('id') || '';
      this.loadRecipe();
    });
  }

  loadRecipe(): void {
    if (this.recipeId) {
      this.isLoading = true; // Commencer le chargement
      this.recipeService.getRecipe(this.recipeId).subscribe({
        next: recipe => {
          this.recipe = recipe || null;
          this.isLoading = false; // Fin du chargement (succès)
          if (!recipe) {
            console.warn(`Recipe with ID ${this.recipeId} not found.`);
            // Optionnel: Afficher un message ou rediriger
            this.messageService.add({ severity: 'warn', summary: 'Non trouvé', detail: 'Recette non trouvée.' });
            // this.router.navigate(['/']); // Rediriger si non trouvé ?
          }
        },
        error: err => {
          console.error("Error loading recipe:", err);
          this.isLoading = false; // Fin du chargement (erreur)
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la recette.' });
        }
      });
    }
  }

  // --- CORRECTION ICI ---
  deleteRecipe(): void {
    // Utiliser 'this.recipeId' qui est plus fiable que de dépendre de l'objet 'recipe' chargé
    if (!this.recipeId || !this.recipe) { // Vérifier l'ID et l'objet chargé pour le message de confirmation
      console.error("Cannot delete recipe: ID or recipe data missing.");
      return;
    }

    const recipeNameToConfirm = this.recipe.title; // Garder le nom juste pour le message

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer la recette "${recipeNameToConfirm}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui, supprimer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.isLoading = true; // Afficher indicateur pendant la suppression
        // Appeler le service UNIQUEMENT avec l'ID de la recette
        this.recipeService.deleteRecipe(this.recipeId)
          .subscribe({
            next: success => {
              this.isLoading = false; // Fin de l'indicateur
              if (success) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Succès',
                  detail: 'La recette a été supprimée'
                });
                this.recipe = null; // Effacer la recette de l'affichage
                setTimeout(() => {
                  this.router.navigate(['/']); // Rediriger vers l'accueil
                }, 1500); // Laisser le temps de voir le message Toast
              } else {
                // Ce cas 'else' ne devrait pas arriver si le service utilise throwError
                this.messageService.add({
                  severity: 'error',
                  summary: 'Erreur',
                  detail: 'La suppression de la recette a échoué'
                });
              }
            },
            error: err => {
              this.isLoading = false; // Fin de l'indicateur
              console.error("Error deleting recipe:", err);
              this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                // Afficher un message plus spécifique si le backend en renvoie un
                detail: err?.error?.message || 'La suppression de la recette a échoué'
              });
            }
          });
      },
      reject: () => {
        // Optionnel: action si l'utilisateur annule
        this.isLoading = false;
      }
    });
  }
  // --- FIN CORRECTION ---

  showPrintPreview(): void {
    this.showPrintDialog = true;
  }

  printRecipe(): void {
    window.print();
    this.showPrintDialog = false;
  }

  // --- CORRECTION ICI ---
  getFullImageUrl(imageUrl: string | undefined): string {
    const defaultImg = 'assets/images/default-recipe.jpg'; // Chemin local pour l'image par défaut DANS Angular

    // Si imageUrl existe et semble être une URL Firebase Storage valide
    if (imageUrl && imageUrl.startsWith('https://storage.googleapis.com/')) {
      return imageUrl; // Retourner l'URL Firebase directement
    }

    // Sinon, retourner l'image par défaut locale
    return defaultImg;
  }
  // --- FIN CORRECTION ---
}