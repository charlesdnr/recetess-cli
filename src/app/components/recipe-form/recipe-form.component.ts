import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import {
  FormsModule, // Garder si d'autres ngModel sont utilisés (mais pas pour les tags)
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  FormControl // Importer FormControl explicitement
} from '@angular/forms';
// !! Assurez-vous que le modèle Recipe et Ingredient sont corrects !!
import { Category, Recipe, Ingredient } from '../../models/recipe.model';
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
// import { ChipModule } from 'primeng/chip'; // <-- SUPPRIMER ChipModule
import { AutoCompleteModule } from 'primeng/autocomplete'; // <-- AJOUTER AutoCompleteModule
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

import { Observable, of, throwError } from 'rxjs';
import { switchMap, finalize, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // Pour FormGroup, FormControlName etc.
    RouterLink,
    CardModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    FileUploadModule,
    ButtonModule,
    DividerModule,
    // ChipModule, // <-- SUPPRIMÉ
    AutoCompleteModule, // <-- AJOUTÉ
    ToastModule,
    MessagesModule,
    MessageModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TooltipModule,
    InputGroupModule,
    InputGroupAddonModule
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
  categoryOptions: {label: string, value: string}[] = [];
  subcategories: { label: string; value: string }[] = [];
  difficultyOptions = [
    { label: 'Très facile', value: 'Très facile' },
    { label: 'Facile', value: 'Facile' },
    { label: 'Moyen', value: 'Moyen' },
    { label: 'Difficile', value: 'Difficile' },
  ];
  loading: boolean = false;

  // // Pour les tags (géré avec ngModel sur p-chips) <-- SUPPRIMER cette ligne
  // recipeTags: string[] = []; <-- SUPPRIMER cette ligne

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  isUploadingOrSaving: boolean = false;
  initialImageUrl: string = 'assets/images/default-recipe.jpg';

  // Pour p-autoComplete - suggestions simples basées sur ce qui est déjà entré
  filteredTags: string[] = [];

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

    // ... (le reste de ngOnInit reste identique) ...
     this.route.paramMap.pipe(
      switchMap(params => {
          this.recipeId = params.get('id') || '';
          if (this.recipeId) {
              this.isEditMode = true;
              this.loading = true;
              return this.recipeService.getRecipe(this.recipeId);
          } else {
              this.isEditMode = false;
              return of(null);
          }
      })
    ).subscribe({
        next: recipe => {
            if (this.isEditMode && recipe) {
                this.populateForm(recipe);
            }
             // Le loading est désactivé dans populateForm ou ici si nouvelle recette
             if (!this.isEditMode) {
                 this.loading = false;
            }
        },
        error: err => {
            console.error("Error loading recipe for edit:", err);
            this.loading = false;
            this.messageService.add({severity:'error', summary: 'Erreur', detail: 'Impossible de charger la recette à modifier.'});
            this.router.navigate(['/']); // Rediriger si erreur de chargement
        }
    });
  }

  // Créer un FormGroup pour un ingrédient individuel
  createIngredientGroup(ingredient: Ingredient | null = null): FormGroup {
    return this.fb.group({
      quantity: [ingredient?.quantity ?? ''],
      unit: [ingredient?.unit ?? ''],
      name: [ingredient?.name ?? '', Validators.required]
    });
  }

  initForm(): void {
    this.recipeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: ['', Validators.required],
      subcategory: [{ value: '', disabled: true }, Validators.required], // Garder la logique d'activation/désactivation
      prepTime: [null, [Validators.required, Validators.min(1)]],
      cookTime: [null, [Validators.required, Validators.min(0)]],
      servings: [null, [Validators.required, Validators.min(1)]],
      difficulty: ['', Validators.required],
      ingredients: this.fb.array([this.createIngredientGroup()], Validators.required),
      instructions: this.fb.array([this.fb.control('', Validators.required)], Validators.required),
      imageUrl: [this.initialImageUrl],
      tags: [[]], // <-- AJOUTER : Initialiser comme un tableau vide
    });

    // Surveiller les changements de catégorie
    this.recipeForm.get('category')?.valueChanges.subscribe((categoryName) => {
      this.updateSubcategories(categoryName);
    });
  }

  loadCategories(): void {
    this.recipeService.getCategories().subscribe({
        next: categories => {
            this.categories = categories; // Stocker les catégories complètes si besoin ailleurs
            this.categoryOptions = categories.map((cat) => ({
                label: cat.name,
                value: cat.name,
            })).sort((a, b) => a.label.localeCompare(b.label)); // Tri alphabétique des options

            // Retester la valeur actuelle au cas où les catégories arrivent après populateForm
             if (this.isEditMode && this.recipeForm.get('category')?.value) {
                 this.updateSubcategories(this.recipeForm.get('category')?.value);
                 const currentSubcategory = this.recipeForm.get('subcategory')?.value;
                 if(currentSubcategory) {
                     // Vérifier si l'option existe toujours avant de la remettre
                     if (this.subcategories.some(sub => sub.value === currentSubcategory)) {
                          this.recipeForm.get('subcategory')?.setValue(currentSubcategory, {emitEvent: false});
                     } else {
                          this.recipeForm.get('subcategory')?.setValue('', {emitEvent: false}); // Vider si l'option n'existe plus
                     }
                 }
             }
        },
        error: err => {
            console.error("Error loading categories:", err);
            this.messageService.add({severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les catégories.'});
        }
    });
  }

  // Remplir le formulaire en mode édition
  populateForm(recipe: Recipe): void {
    console.log("Populating form with recipe:", recipe);

    this.recipeForm.patchValue({
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      subcategory: recipe.subcategory || '',
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      imageUrl: recipe.imageUrl || this.initialImageUrl,
      tags: recipe.tags || [], // <-- AJOUTER : Remplir le control 'tags'
    });

    // Gérer les FormArrays (inchangé)
    this.clearFormArray(this.ingredients);
    (recipe.ingredients || []).forEach(ingredient => {
      this.ingredients.push(this.createIngredientGroup(ingredient));
    });
    if (this.ingredients.length === 0) this.addIngredient();

    this.clearFormArray(this.instructions);
    (recipe.instructions || []).forEach(instruction => {
      this.instructions.push(this.fb.control(instruction, Validators.required));
    });
    if (this.instructions.length === 0) this.addInstruction();

    // // Gérer les tags <-- SUPPRIMER cette ligne
    // this.recipeTags = recipe.tags || []; <-- SUPPRIMER cette ligne

    // Gérer l'image (inchangé)
    this.initialImageUrl = recipe.imageUrl || this.initialImageUrl;
    this.updateImagePreview(this.initialImageUrl);
    this.loading = false;
  }

  updateSubcategories(categoryName: string | null): void {
    // ... (logique inchangée) ...
      const subcategoryControl = this.recipeForm.get('subcategory');
      if (!categoryName) {
          this.subcategories = [];
          subcategoryControl?.disable({ emitEvent: false });
          subcategoryControl?.setValue('', { emitEvent: false });
          return;
      }

      const category = this.categories.find((c) => c.name === categoryName);
      if (category && category.subcategories && category.subcategories.length > 0) {
          this.subcategories = category.subcategories
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(sub => ({ label: sub.name, value: sub.name }));
          subcategoryControl?.enable({ emitEvent: false });
      } else {
          this.subcategories = [];
          subcategoryControl?.disable({ emitEvent: false });
          subcategoryControl?.setValue('', { emitEvent: false });
      }
  }


  // --- Gestion du FormArray d'ingrédients --- (inchangé)
  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }
  getIngredientGroup(index: number): FormGroup {
     return this.ingredients.at(index) as FormGroup;
  }
  addIngredient(): void {
    this.ingredients.push(this.createIngredientGroup());
  }
  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    } else {
      this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Une recette doit avoir au moins un ingrédient.' });
    }
  }

  // --- Gestion du FormArray d'instructions --- (inchangé)
  get instructions(): FormArray {
    return this.recipeForm.get('instructions') as FormArray;
  }
  addInstruction(): void {
    this.instructions.push(this.fb.control('', Validators.required));
  }
  removeInstruction(index: number): void {
    if (this.instructions.length > 1) {
      this.instructions.removeAt(index);
    } else {
       this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Une recette doit avoir au moins une étape.' });
    }
  }

  // --- Gestion Image --- (inchangé)
  onFileSelect(event: any): void {
      const file = event.currentFiles?.[0];
      if (file) {
          this.selectedImageFile = file;
          console.log('Image sélectionnée:', this.selectedImageFile?.name);
          const reader = new FileReader();
          reader.onload = (e) => this.imagePreviewUrl = reader.result;
          reader.readAsDataURL(file);
      } else {
          this.selectedImageFile = null;
          this.updateImagePreview(this.recipeForm.get('imageUrl')?.value);
      }
  }

  updateImagePreview(imageUrl: string | null | undefined): void {
     const defaultImg = 'assets/images/default-recipe.jpg';
     if (imageUrl && imageUrl !== defaultImg && imageUrl.startsWith('https://storage.googleapis.com/')) {
        this.imagePreviewUrl = imageUrl;
     } else {
        this.imagePreviewUrl = null; // Pas d'aperçu pour défaut ou null/undefined
     }
  }

  // --- AJOUT: Méthode pour filtrer les tags pour l'auto-complétion ---
  filterTags(event: { query: string }): void {
    const query = event.query.toLowerCase();
    // Ici, une logique de suggestion plus avancée pourrait être implémentée
    // (ex: appeler un service pour obtenir des tags populaires).
    // Pour l'instant, on ne filtre rien, on permet juste l'ajout libre.
    this.filteredTags = []; // Ou suggérer les tags déjà présents:
    // const currentTags = this.recipeForm.get('tags')?.value || [];
    // this.filteredTags = currentTags.filter((tag: string) => tag.toLowerCase().includes(query));
  }


  // --- Soumission / Annulation ---
  onSubmit(): void {
    if (this.recipeForm.invalid) {
      this.markFormGroupTouched(this.recipeForm);
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Formulaire invalide. Veuillez corriger les erreurs.' });
      console.warn('Form invalid:', this.getFormValidationErrors(this.recipeForm));
      return;
    }

    this.isUploadingOrSaving = true;

    const imageResult$: Observable<{ imageUrl: string }> = this.selectedImageFile
      ? this.recipeService.uploadImage(this.selectedImageFile).pipe(
         catchError(err => {
            console.error("Image upload failed, continuing without new image:", err);
            this.messageService.add({ severity: 'error', summary: 'Échec Upload', detail: 'Impossible d\'uploader la nouvelle image. L\'ancienne image sera conservée si elle existe.' });
            return of({ imageUrl: this.recipeForm.get('imageUrl')?.value || this.initialImageUrl });
          }))
      : of({ imageUrl: this.recipeForm.get('imageUrl')?.value || this.initialImageUrl });

    imageResult$.pipe(
      switchMap(uploadResponse => {
        const formValue = this.recipeForm.getRawValue(); // getRawValue inclut les champs désactivés

        // Nettoyer les ingrédients et instructions vides avant l'envoi (inchangé)
        const finalIngredients = formValue.ingredients
             .map((ing: any) => ({
                 quantity: ing.quantity,
                 unit: ing.unit?.trim() ?? '',
                 name: ing.name?.trim() ?? ''
             }))
             .filter((ing: Ingredient) => ing.name);

        const finalInstructions = formValue.instructions
             .map((inst: string) => inst?.trim() ?? '')
             .filter((inst: string) => inst);

         // Gérer subcategory si désactivé (inchangé)
         const finalSubcategory = formValue.subcategory || null;

        // Nettoyer les tags (supprimer les espaces superflus et les tags vides)
        const finalTags = (formValue.tags || [])
          .map((tag: string) => tag?.trim())
          .filter((tag: string | null): tag is string => tag !== null && tag !== ''); // Garde seulement les strings non vides

        const payloadToSend: Partial<Recipe> = {
          ...(this.isEditMode && this.recipeId ? { id: this.recipeId } : {}),
          title: formValue.title.trim(),
          description: formValue.description?.trim() ?? '',
          category: formValue.category,
          subcategory: finalSubcategory,
          prepTime: formValue.prepTime,
          cookTime: formValue.cookTime,
          servings: formValue.servings,
          difficulty: formValue.difficulty,
          ingredients: finalIngredients,
          instructions: finalInstructions,
          tags: finalTags, // <-- MODIFIER : Utiliser les tags du formulaire nettoyés
          imageUrl: uploadResponse.imageUrl
        };

        console.log("Payload prêt pour sauvegarde/màj:", payloadToSend);
        return this.recipeService.saveRecipe(payloadToSend as Recipe);
      }),
      finalize(() => {
        this.isUploadingOrSaving = false;
        console.log("Opération onSubmit terminée.");
      })
    ).subscribe({
      next: (savedRecipe) => {
        if (savedRecipe && savedRecipe.id) {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Recette ${this.isEditMode ? 'mise à jour' : 'créée'} !` });
          // Réinitialisation
          this.recipeForm.reset({ // Réinitialise avec des valeurs par défaut si besoin
            imageUrl: this.initialImageUrl, // Garde l'image par défaut
            ingredients: [], // Sera géré par addIngredient
            instructions: [], // Sera géré par addInstruction
            tags: [] // Réinitialise les tags
          });
          // this.recipeTags = []; // <-- SUPPRIMER
          this.clearFormArray(this.ingredients); this.addIngredient();
          this.clearFormArray(this.instructions); this.addInstruction();
          this.selectedImageFile = null;
          this.updateImagePreview(this.initialImageUrl);
          this.isEditMode = false;
          this.recipeId = '';

          setTimeout(() => { this.router.navigate(['/recipe', savedRecipe.id]); }, 1000);
        } else {
           this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Sauvegarde réussie mais réponse serveur inattendue.' });
        }
      },
      error: (err) => {
        console.error("Erreur lors de la sauvegarde de la recette:", err);
        this.messageService.add({ severity: 'error', summary: 'Erreur Sauvegarde', detail: err?.error?.message || 'Impossible d\'enregistrer la recette.' });
      }
    });
  }


  cancel(): void {
     this.confirmationService.confirm({
        message: 'Êtes-vous sûr de vouloir annuler ? Toutes les modifications non enregistrées seront perdues.',
        header: 'Confirmation d\'annulation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Oui, annuler',
        rejectLabel: 'Non',
        accept: () => {
            if (this.isEditMode && this.recipeId) {
                this.router.navigate(['/recipe', this.recipeId]);
            } else {
                this.router.navigate(['/']);
            }
        }
    });
  }

  // --- Helpers --- (inchangés)
  clearFormArray(formArray: FormArray): void {
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach((control: any) => {
      control.markAsTouched();
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

   // Helper pour debugger les erreurs de validation (inchangé)
  getFormValidationErrors(form: FormGroup | FormArray): any {
    const errors: any = {};
    Object.keys(form.controls).forEach(key => {
        const control = form.get(key);
        if (control instanceof FormControl) {
            if (control.errors != null) { errors[key] = control.errors; }
        } else if (control instanceof FormGroup || control instanceof FormArray) {
            const nestedErrors = this.getFormValidationErrors(control);
            if (Object.keys(nestedErrors).length > 0) { errors[key] = nestedErrors; }
        }
    });
    return errors;
  }
}