import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { Category, Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';

// Imports PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { switchMap, of, finalize, Observable, throwError } from 'rxjs';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    FileUploadModule,
    ButtonModule,
    DividerModule,
    ToastModule,
    MessagesModule,
    MessageModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './recipe-form.component.html',
  styleUrls: ['./recipe-form.component.scss'],
})
export class RecipeFormComponent implements OnInit {
  recipeForm!: FormGroup;
  recipeId: string = '';
  isEditMode: boolean = false;
  categories: Category[] = [];
  categoryOptions: any[] = []; // Options pour le select
  selectedCategory: Category | null = null;
  subcategories: { label: string; value: string }[] = [];
  difficultyOptions = [
    { label: 'Très facile', value: 'Très facile' },
    { label: 'Facile', value: 'Facile' },
    { label: 'Moyen', value: 'Moyen' },
    { label: 'Difficile', value: 'Difficile' },
  ];
  loading: boolean = false;

  // Variable pour stocker les tags au lieu d'utiliser FormControl
  recipeTags: string[] = [];

  selectedImageFile: File | null = null; // Stocker le fichier sélectionné
  imagePreviewUrl: string | ArrayBuffer | null = null; // Pour l'aperçu
  isUploadingOrSaving: boolean = false; // Indicateur unique pour upload + save
  initialImageUrl: string = 'assets/images/default-recipe.jpg'; // Garder une trace de l'URL initiale

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();

    this.route.paramMap.subscribe((params) => {
      this.recipeId = params.get('id') || '';
      if (this.recipeId) {
        this.isEditMode = true;
        this.loadRecipe();
      }
    });
  }

  initForm(): void {
    this.recipeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: ['', Validators.required],
      subcategory: ['', Validators.required],
      prepTime: [null, [Validators.required, Validators.min(1)]],
      cookTime: [null, [Validators.required, Validators.min(0)]],
      servings: [null, [Validators.required, Validators.min(1)]],
      difficulty: ['', Validators.required],
      ingredients: this.fb.array([], Validators.required),
      steps: this.fb.array([], Validators.required),
      imageUrl: [this.initialImageUrl],
    });

    // Ajouter au moins un ingrédient et une étape vides par défaut
    this.addIngredient();
    this.addStep();

    // Surveiller les changements de catégorie
    this.recipeForm.get('category')?.valueChanges.subscribe((categoryName) => {
      this.updateSubcategories(categoryName);
    });
  }

  loadCategories(): void {
    this.recipeService.getCategories().subscribe((categories) => {
      this.categories = categories;
      // Créer les options pour le composant p-select
      this.categoryOptions = categories.map((cat) => ({
        label: cat.name,
        value: cat.name,
      }));
    });
  }

  loadRecipe(): void {
    this.loading = true;
    this.recipeService.getRecipe(this.recipeId).subscribe((recipe) => {
      if (recipe) {
        // Mettre à jour les sous-catégories d'abord
        this.updateSubcategories(recipe.category);

        // Remplir le formulaire
        this.recipeForm.patchValue({
          title: recipe.title,
          description: recipe.description,
          category: recipe.category,
          subcategory: recipe.subcategory,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          imageUrl: recipe.imageUrl,
        });

        // Mettre à jour les tags
        this.recipeTags = recipe.tags || [];
        this.initialImageUrl = recipe.imageUrl || this.initialImageUrl; // Stocker l'URL chargée
        this.updateImagePreview(this.initialImageUrl); // Mettre à jour l'aperçu
        this.loading = false;

        // Gérer les tableaux d'ingrédients et d'étapes
        this.clearFormArray(this.ingredients);
        recipe.ingredients.forEach((ingredient) => {
          this.ingredients.push(
            this.fb.control(ingredient, Validators.required)
          );
        });

        this.clearFormArray(this.steps);
        recipe.steps.forEach((step) => {
          this.steps.push(this.fb.control(step, Validators.required));
        });

        this.loading = false;
      }
    });
  }
  onFileSelect(event: any): void {
    // event.files contient les fichiers sélectionnés
    if (event.files && event.files.length > 0) {
      const file = event.files[0];
      this.selectedImageFile = file;
      console.log('Image sélectionnée:', this.selectedImageFile);

      // Lire le fichier pour l'aperçu local
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreviewUrl = reader.result;
      reader.readAsDataURL(file);

      // Note: event.clear() pourrait être utile pour vider la sélection
      // dans p-fileUpload si vous ne voulez pas que l'utilisateur
      // puisse cliquer sur "upload" (qui est caché)
    } else {
        this.selectedImageFile = null;
        this.updateImagePreview(this.recipeForm.get('imageUrl')?.value); // Remettre l'aperçu précédent si on désélectionne
    }
  }
  updateImagePreview(imageUrl: string | null | undefined): void {
    if (imageUrl && imageUrl !== 'assets/images/default-recipe.jpg') {
        // Construire l'URL absolue si elle est relative au backend
        this.imagePreviewUrl = imageUrl.startsWith('/uploads')
            ? `<span class="math-inline">\{this\.recipeService\.backendBaseUrl\}</span>{imageUrl}`
            : imageUrl;
    } else {
        this.imagePreviewUrl = null; // Pas d'aperçu pour l'image par défaut
    }
}

  updateSubcategories(categoryName: string): void {
    const category = this.categories.find((c) => c.name === categoryName);
    this.selectedCategory = category || null;

    if (
      category &&
      category.subcategories &&
      category.subcategories.length > 0
    ) {
      this.subcategories = category.subcategories.map((sub) => ({
        label: sub.name,
        value: sub.name,
      }));
      // On garde enable() pour s'assurer que la valeur est incluse dans form.value
      this.recipeForm.get('subcategory')?.enable();
    } else {
      this.subcategories = [];
      // On garde disable() pour s'assurer que la valeur est exclue
      this.recipeForm.get('subcategory')?.disable();
      this.recipeForm.get('subcategory')?.setValue('');
    }
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  get steps(): FormArray {
    return this.recipeForm.get('steps') as FormArray;
  }

  addIngredient(): void {
    this.ingredients.push(this.fb.control('', Validators.required));
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Une recette doit avoir au moins un ingrédient',
      });
    }
  }

  addStep(): void {
    this.steps.push(this.fb.control('', Validators.required));
  }

  removeStep(index: number): void {
    if (this.steps.length > 1) {
      this.steps.removeAt(index);
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Une recette doit avoir au moins une étape',
      });
    }
  }

  clearFormArray(formArray: FormArray): void {
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  // Gérer le changement des tags
  onTagChange(event: any): void {
    this.recipeTags = event;
  }

  // Dans src/app/components/recipe-form/recipe-form.component.ts

  onSubmit(): void {
    if (this.recipeForm.invalid) {
      this.markFormGroupTouched(this.recipeForm);
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Formulaire invalide.' });
      return;
    }

    // Démarrer l'indicateur AVANT toute opération asynchrone
    this.isUploadingOrSaving = true;

    // 1. Observable pour l'upload ou l'URL existante
    const imageResult$: Observable<{ imageUrl: string }> = this.selectedImageFile
      ? this.recipeService.uploadImage(this.selectedImageFile) // Tente l'upload
      : of({ imageUrl: this.recipeForm.get('imageUrl')?.value || this.initialImageUrl }); // Utilise l'URL existante/initiale

    imageResult$.pipe(
      // Pas de finalize ici, on le mettra à la toute fin

      // 2. Enchaîner avec la sauvegarde de la recette via switchMap
      switchMap(uploadResponse => {
        // Vérifier si on a tenté un upload et s'il a réussi
        if (this.selectedImageFile && (!uploadResponse || !uploadResponse.imageUrl)) {
          console.error("Échec de l'upload de l'image. Annulation de la sauvegarde.");
          this.messageService.add({ severity: 'error', summary: 'Échec Upload', detail: 'Impossible d\'uploader l\'image. La recette n\'a pas été sauvegardée.' });
          // Arrêter le flux en retournant une erreur pour déclencher le bloc 'error' du subscribe
          return throwError(() => new Error('Image upload failed'));
        }

        // L'upload est réussi (ou non nécessaire), préparer le payload final
        const finalImageUrl = uploadResponse.imageUrl || this.initialImageUrl; // Prend l'URL uploadée ou l'initiale
        const payloadToSend: Partial<Recipe> = {
          ...this.recipeForm.value,
          tags: this.recipeTags || [],
          imageUrl: finalImageUrl
        };

        if (this.isEditMode) {
          payloadToSend.id = this.recipeId;
        }

        console.log("Payload prêt pour sauvegarde/màj:", payloadToSend);
        // Retourner l'observable de sauvegarde pour l'enchaînement
        return this.recipeService.saveRecipe(payloadToSend as Recipe);
      }),

      // 3. Finalize s'exécute APRÈS que toute la chaîne (upload + save) soit terminée ou ait échoué
      finalize(() => {
        this.isUploadingOrSaving = false; // Arrêter l'indicateur à la fin
        console.log("Opération onSubmit terminée (succès ou erreur).");
      })

    ).subscribe({ // 4. Gérer le résultat final ou l'erreur
      next: (savedRecipe) => {
        // Ce bloc n'est atteint que si TOUT a réussi (upload + save)
        if (savedRecipe && savedRecipe.id) {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Recette ${this.isEditMode ? 'mise à jour' : 'créée'} (ID: ${savedRecipe.id})` });
          this.selectedImageFile = null;
          this.imagePreviewUrl = null;
          this.recipeForm.reset(); // Optionnel: vider le formulaire après succès
          setTimeout(() => { this.router.navigate(['/recipe', savedRecipe.id]); }, 1500);
        } else {
          console.error("Réponse invalide après sauvegarde.", savedRecipe);
          this.messageService.add({ severity: 'warn', summary: 'Réponse invalide', detail: 'Sauvegarde réussie mais réponse serveur incorrecte.' });
        }
      },
      error: (err) => {
        // Gère les erreurs venant de throwError (échec upload) ou de saveRecipe
        console.error("Erreur lors du processus de sauvegarde global:", err);
        // Le message d'erreur spécifique à l'upload est déjà géré dans switchMap
        if (err && err.message !== 'Image upload failed') {
             this.messageService.add({ severity: 'error', summary: 'Erreur Sauvegarde', detail: 'Impossible d\'enregistrer la recette.' });
        }
        // Si l'erreur vient de l'upload, un message a déjà été affiché.
      }
    });
  }

  cancel(): void {
    this.confirmationService.confirm({
      message:
        'Êtes-vous sûr de vouloir annuler ? Toutes les modifications seront perdues.',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (this.isEditMode) {
          this.router.navigate(['/recipe', this.recipeId]);
        } else {
          this.router.navigate(['/']);
        }
      },
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((c) => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          } else {
            c.markAsTouched();
          }
        });
      }
    });
  }

  generateId(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString(36)
    );
  }

  onImageUpload(event: any): void {
    // Dans une application réelle, vous implémenterez ici la logique pour charger une image
    // Pour cette démo, nous utiliserons simplement une URL fixe
    this.messageService.add({
      severity: 'info',
      summary: 'Image téléchargée',
      detail:
        "Dans une application réelle, l'image serait chargée sur le serveur",
    });
  }


}
