// components/recipe-detail/recipe-detail.component.ts
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
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

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
    StepsModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule
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
  showPrintDialog: boolean = false;
  readonly backendBaseUrl: string; // Stocker l'URL

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router
  ) {
    this.backendBaseUrl = this.recipeService.backendBaseUrl;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.recipeId = params.get('id') || '';
      this.loadRecipe();
    });
  }

  loadRecipe(): void {
    if (this.recipeId) {
      this.recipeService.getRecipe(this.recipeId).subscribe(recipe => {
        this.recipe = recipe || null;
      });
    }
  }

 // Dans src/app/components/recipe-detail/recipe-detail.component.ts
deleteRecipe(): void {
  if (!this.recipe) return; // S'assurer que la recette est chargée

  const recipeToDelete = this.recipe; // Copie pour éviter problème de scope dans confirm

  this.confirmationService.confirm({
    message: 'Êtes-vous sûr de vouloir supprimer cette recette ?',
    header: 'Confirmation de suppression',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      // Passer les infos nécessaires au service
      this.recipeService.deleteRecipe(recipeToDelete.id, recipeToDelete.category, recipeToDelete.subcategory)
        .subscribe(success => {
        if (success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'La recette a été supprimée'
          });
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 1500);
        } else {
           this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'La suppression de la recette a échoué'
          });
        }
      });
    }
  });
}

  showPrintPreview(): void {
    this.showPrintDialog = true;
  }

  printRecipe(): void {
    window.print();
    this.showPrintDialog = false;
  }
  getFullImageUrl(imageUrl: string | undefined): string {
    const defaultImg = 'assets/images/default-recipe.jpg'; // Chemin local par défaut

    // Si pas d'URL, si c'est l'URL par défaut, ou si ça ne commence pas par /uploads
    if (!imageUrl || imageUrl === defaultImg || !imageUrl.startsWith('/uploads')) {
      // Retourner l'image par défaut (qui est dans les assets Angular)
      return defaultImg;
    }
    // === CORRECTION ICI ===
    // Préfixer avec l'URL du backend en utilisant correctement les backticks et ${}
    return `${this.backendBaseUrl}${imageUrl}`;
    // =======================
  }
}