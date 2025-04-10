import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importez FormsModule pour ngModel
import { RecipeService } from '../../services/recipe.service';
import { Category } from '../../models/recipe.model';
import { MessageService, ConfirmationService } from 'primeng/api'; // Pour les messages et confirmations
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast'; // Module pour les notifications
import { MessagesModule } from 'primeng/messages'; // Autre option pour les messages
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // Module pour la confirmation
import { ProgressSpinnerModule } from 'primeng/progressspinner'; // Pour l'indicateur de chargement
import { PanelModule } from 'primeng/panel'; // Pour structurer l'affichage
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Ajoutez FormsModule ici
    ButtonModule,
    InputTextModule,
    ToastModule, // Ajoutez ToastModule
    MessagesModule,
    MessageModule,
    ConfirmDialogModule, // Ajoutez ConfirmDialogModule
    ProgressSpinnerModule,
    PanelModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.scss'],
  providers: [MessageService, ConfirmationService] // Ajoutez les services ici
})
export class CategoryManagementComponent implements OnInit {

  categories: Category[] = [];
  isLoading = false;
  errorLoading: string | null = null;
  isAdmin$: Observable<boolean>;

  newCategoryName: string = '';
  newSubcategoryNames: { [categoryName: string]: string } = {}; // Pour stocker le nom de la nouvelle sous-cat par catégorie

  constructor(
    private recipeService: RecipeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public authService: AuthService
  ) {
    this.isAdmin$ = this.authService.isAdmin$;
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.errorLoading = null;
    this.recipeService.getCategories().subscribe({
      next: (data) => {
        this.categories = data; // data contient maintenant les objets Category avec id?
        // Initialiser les champs pour les nouvelles sous-catégories en utilisant l'ID
        this.newSubcategoryNames = {};
        this.categories.forEach(cat => {
          if (cat.id) { // Vérifier que l'ID existe
            this.newSubcategoryNames[cat.id] = '';
          }
        });
        this.isLoading = false;
      },
      error: (err) => {
        // ... gestion erreur ...
        this.isLoading = false;
      }
    });
  }

  onAddCategory(): void {
    const nameToAdd = this.newCategoryName.trim();
    if (!nameToAdd) {
      this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Le nom de la catégorie ne peut pas être vide.' });
      return;
    }

    this.isLoading = true;
    this.recipeService.addCategory(nameToAdd).subscribe({
      next: (response) => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: response.message });
        this.newCategoryName = '';
        this.loadCategories(); // Recharger pour avoir la nouvelle catégorie avec son ID
        this.recipeService.clearAllCaches(); // Peut être utile pour le menu principal
      },
      error: (err: HttpErrorResponse) => {
        console.error("Error adding category:", err);
        const detail = err.error?.message || 'Une erreur est survenue lors de l\'ajout.';
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: detail });
        this.isLoading = false; // Arrêter le chargement en cas d'erreur aussi
      }
    });
  }

  onAddSubcategory(categoryId: string): void {
    // Utilise l'ID pour récupérer le nom à ajouter
    const subNameToAdd = this.newSubcategoryNames[categoryId]?.trim();
    if (!subNameToAdd) {
      this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Le nom de la sous-catégorie ne peut pas être vide.' });
      return;
    }
    if (!categoryId) {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'ID de catégorie manquant.' });
      return;
    }

    this.isLoading = true;
    this.recipeService.addSubcategory(categoryId, subNameToAdd).subscribe({
      next: (response) => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: response.message });
        this.newSubcategoryNames[categoryId] = ''; // Réinitialiser le champ spécifique
        this.loadCategories(); // Recharger
        this.recipeService.clearAllCaches();
      },
      error: (err: HttpErrorResponse) => {
        console.error("Error adding subcategory:", err);
        const detail = err.error?.message || 'Une erreur est survenue lors de l\'ajout.';
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: detail });
        this.isLoading = false;
      }
    });
  }

  confirmDeleteCategory(categoryId: string): void {
    const categoryToDelete = this.categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return; // Sécurité

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete.name}" ? Cette action est irréversible et ne fonctionnera que si la catégorie est vide.`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui, supprimer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.deleteCategory(categoryId); // Appelle deleteCategory avec l'ID
      }
    });
  }

  private deleteCategory(categoryId: string): void {
    this.isLoading = true;
    // Appelle le service avec l'ID
    this.recipeService.deleteCategory(categoryId).subscribe({
      next: (response) => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: response.message });
        this.loadCategories(); // Recharger
        this.recipeService.clearAllCaches();
      },
      // ... gestion erreur ...
      error: (err: HttpErrorResponse) => { /* ... */ this.isLoading = false; }
    });
  }

  confirmDeleteSubcategory(categoryId: string, subcategoryName: string): void {
    const categoryParent = this.categories.find(c => c.id === categoryId);
    if (!categoryParent) return; // Sécurité

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer la sous-catégorie "<span class="math-inline">\{subcategoryName\}" dans "</span>{categoryParent.name}" ? Cette action est irréversible et ne fonctionnera que si la sous-catégorie est vide.`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui, supprimer',
      rejectLabel: 'Annuler',
      accept: () => {
        // Appelle deleteSubcategory avec l'ID et le nom
        this.deleteSubcategory(categoryId, subcategoryName);
      }
    });
  }

  private deleteSubcategory(categoryId: string, subcategoryName: string): void {
    this.isLoading = true;
    // Appelle le service avec l'ID et le nom
    this.recipeService.deleteSubcategory(categoryId, subcategoryName).subscribe({
      next: (response) => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: response.message });
        this.loadCategories(); // Recharger
        this.recipeService.clearAllCaches();
      },
      error: (err: HttpErrorResponse) => {
        console.error("Error deleting subcategory:", err);
        const detail = err.error?.message || 'Une erreur est survenue lors de la suppression.';
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: detail });
        this.isLoading = false;
      }
    });
  }
}