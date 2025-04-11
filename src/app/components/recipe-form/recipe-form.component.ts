// src/app/components/recipe-form/recipe-form.component.ts
import {
  Component,
  OnInit,
  inject, // Use inject
  signal, // Use signal
  ChangeDetectionStrategy, // Use OnPush
  computed // Optional: for derived state
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  FormControl
} from '@angular/forms';
import { Category, Recipe, Ingredient } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';

// PrimeNG Imports (unchanged)
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

import { lastValueFrom } from 'rxjs'; // Import lastValueFrom

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
    ButtonModule,
    DividerModule,
    BadgeModule,
    AutoCompleteModule,
    ToastModule,
    MessagesModule,
    MessageModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TooltipModule,
    InputGroupModule,
    InputGroupAddonModule,
    ImageUploadComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './recipe-form.component.html',
  styleUrls: ['./recipe-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Enable OnPush
})
export class RecipeFormComponent implements OnInit {

  // --- Injected Services ---
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recipeService = inject(RecipeService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  // No ChangeDetectorRef needed usually

  // --- Form Definition (remains ReactiveFormsModule) ---
  recipeForm!: FormGroup;

  // --- State using Signals ---
  recipeId = signal<string>('');
  isEditMode = signal<boolean>(false);
  loading = signal<boolean>(false);
  isUploadingOrSaving = signal<boolean>(false);
  loadedRecipeImageUrl = signal<string | null>(null); // Store initially loaded URL
  selectedImageFile = signal<File | null>(null); // Store the selected file
  // -------------------------

  // --- Data for Selects (can remain simple arrays) ---
  categories: Category[] = [];
  categoryOptions: { label: string, value: string }[] = [];
  subcategories: { label: string; value: string }[] = [];
  difficultyOptions = [
    { label: 'Très facile', value: 'Très facile' },
    { label: 'Facile', value: 'Facile' },
    { label: 'Moyen', value: 'Moyen' },
    { label: 'Difficile', value: 'Difficile' },
  ];
  filteredTags: string[] = [];
  // ---------------------------------------------------

  // Computed signal for the initial image URL passed to the child
  // It prioritizes the URL from the loaded recipe if available, otherwise default
  initialImageUrlForChild = computed(() => this.loadedRecipeImageUrl() || 'assets/images/default-recipe.jpg');


  ngOnInit(): void {
    this.initForm();
    this.loadCategories(); // Load categories async

    // --- Load Recipe Data ---
    this.route.paramMap.subscribe(async params => { // Keep subscribe for paramMap or use route signals if available
      const id = params.get('id') || '';
      this.recipeId.set(id);
      this.isEditMode.set(!!id);

      if (this.isEditMode()) {
        this.loading.set(true);
        try {
          // Use lastValueFrom for async/await style fetching
          const recipe = await lastValueFrom(this.recipeService.getRecipe(id));
          if (recipe) {
            this.populateForm(recipe);
          } else {
             this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Recette non trouvée.' });
             this.router.navigate(['/']); // Redirect if not found
          }
        } catch (err) {
          console.error("Error loading recipe for edit:", err);
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la recette.' });
          this.router.navigate(['/']); // Redirect on error
        } finally {
          this.loading.set(false);
        }
      } else {
         // Reset potentially loaded URL if navigating from edit to new
         this.loadedRecipeImageUrl.set(null);
         this.selectedImageFile.set(null); // Ensure file signal is reset too
         // Form is already initialized, no loading needed
      }
    });

    // --- Category -> Subcategory Logic (keep valueChanges or use effect) ---
    // Using valueChanges is often fine with forms
    this.recipeForm.get('category')?.valueChanges.subscribe((categoryName) => {
      this.updateSubcategories(categoryName);
      // Ensure subcategory value is reset if category changes and it's no longer valid
      if (!this.subcategories.some(sub => sub.value === this.recipeForm.get('subcategory')?.value)) {
          this.recipeForm.get('subcategory')?.setValue('', { emitEvent: false });
      }
    });
  }

  // initForm, createIngredientGroup, ingredients getter, add/remove Ingredient/Instruction remain largely the same

  initForm(): void {
    this.recipeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: ['', Validators.required],
      subcategory: [{ value: '', disabled: true }, Validators.required],
      prepTime: [null, [Validators.required, Validators.min(1)]],
      cookTime: [null, [Validators.required, Validators.min(0)]],
      servings: [null, [Validators.required, Validators.min(1)]],
      difficulty: ['', Validators.required],
      ingredients: this.fb.array([this.createIngredientGroup()], Validators.required),
      instructions: this.fb.array([this.fb.control('', Validators.required)], Validators.required),
      imageUrl: [null as string | null], // Stores the *final* URL after potential upload/clear
      tags: [[]],
    });
  }

   createIngredientGroup(ingredient: Ingredient | null = null): FormGroup {
     return this.fb.group({
       quantity: [ingredient?.quantity ?? ''],
       unit: [ingredient?.unit ?? ''],
       name: [ingredient?.name ?? '', Validators.required]
     });
   }

  loadCategories(): void {
    // Keep async loading, update local arrays
    this.recipeService.getCategories().subscribe({
      next: categories => {
        this.categories = categories;
        this.categoryOptions = categories.map((cat) => ({
          label: cat.name,
          value: cat.name,
        })).sort((a, b) => a.label.localeCompare(b.label));

        // Re-check subcategories if categories load after form population
        if (this.isEditMode() && this.recipeForm.get('category')?.value) {
          this.updateSubcategories(this.recipeForm.get('category')?.value);
          const currentSubcategory = this.recipeForm.get('subcategory')?.value;
           if (currentSubcategory && !this.subcategories.some(sub => sub.value === currentSubcategory)) {
              this.recipeForm.get('subcategory')?.setValue('', { emitEvent: false });
           } else if (currentSubcategory) {
               this.recipeForm.get('subcategory')?.enable({ emitEvent: false }); // Ensure enabled if valid
           }
        }
      },
      error: err => {
        console.error("Error loading categories:", err);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les catégories.' });
      }
    });
  }

  populateForm(recipe: Recipe): void {
    this.recipeForm.patchValue({
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      subcategory: recipe.subcategory || '',
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      imageUrl: recipe.imageUrl, // Set the form control value
      tags: recipe.tags || [],
    });

    this.loadedRecipeImageUrl.set(recipe.imageUrl || null); // Update the signal for initial display

    // Handle FormArrays (unchanged logic)
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

    // Enable/disable subcategory based on loaded data
    this.updateSubcategories(recipe.category);
    if (!recipe.subcategory) {
         this.recipeForm.get('subcategory')?.disable({ emitEvent: false });
    } else {
         this.recipeForm.get('subcategory')?.enable({ emitEvent: false });
    }

    this.selectedImageFile.set(null); // Reset any selected file when populating
    this.loading.set(false); // Already handled in ngOnInit's finally block, but safe to keep
  }

  updateSubcategories(categoryName: string | null): void {
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


  // --- Form Array Getters/Methods (Unchanged) ---
  get ingredients(): FormArray { return this.recipeForm.get('ingredients') as FormArray; }
  getIngredientGroup(index: number): FormGroup { return this.ingredients.at(index) as FormGroup; }
  addIngredient(): void { this.ingredients.push(this.createIngredientGroup()); }
  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) this.ingredients.removeAt(index);
    else this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Au moins un ingrédient requis.' });
  }
  get instructions(): FormArray { return this.recipeForm.get('instructions') as FormArray; }
  addInstruction(): void { this.instructions.push(this.fb.control('', Validators.required)); }
  removeInstruction(index: number): void {
    if (this.instructions.length > 1) this.instructions.removeAt(index);
    else this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Au moins une étape requise.' });
  }
  // -------------------------------------------

  // --- Image Handling ---
  onImageSelected(file: File | null): void {
    this.selectedImageFile.set(file); // Update the signal

    // If the user cleared the image, update the form control immediately
    // This signals the intent to save without an image if no *new* image is chosen
    if (file === null) {
      this.recipeForm.get('imageUrl')?.setValue(''); // Use empty string or null
    }
  }
  // --------------------

  filterTags(event: { query: string }): void { /* ... Tag logic ... */ }

  // --- Submit Logic using async/await ---
  async onSubmit(): Promise<void> {
    if (this.recipeForm.invalid) {
      this.markFormGroupTouched(this.recipeForm);
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Formulaire invalide.' });
      console.warn('Form invalid:', this.getFormValidationErrors(this.recipeForm));
      return;
    }

    this.isUploadingOrSaving.set(true);
    // Get the URL currently in the form (could be original, or '' if cleared)
    let finalImageUrl: string | null = this.recipeForm.get('imageUrl')?.value;

    try {
      const imageFileToUpload = this.selectedImageFile(); // Read the signal

      // 1. Upload image *only if* a new file was selected
      if (imageFileToUpload) {
        console.log('Uploading new image...');
        const uploadResult = await lastValueFrom(this.recipeService.uploadImage(imageFileToUpload));
        finalImageUrl = uploadResult.imageUrl; // Update the URL with the uploaded one
        this.recipeForm.get('imageUrl')?.setValue(finalImageUrl, { emitEvent: false }); // Update form silently
      }
      // If imageFileToUpload is null, finalImageUrl already holds the original URL or '' (if cleared via onImageSelected)

      console.log('Final Image URL to save:', finalImageUrl);

      // 2. Prepare Payload
      const formValue = this.recipeForm.getRawValue();
      const finalIngredients = (formValue.ingredients || [])
          .map((ing: any) => ({
            quantity: ing.quantity,
            unit: ing.unit?.trim() ?? '',
            name: ing.name?.trim() ?? '',
          }))
          .filter((ing: Ingredient) => ing.name);

      const finalInstructions = (formValue.instructions || [])
          .map((inst: string) => inst?.trim() ?? '')
          .filter((inst: string) => inst);

      const finalSubcategory = formValue.subcategory || null;
      const finalTags = (formValue.tags || [])
          .map((tag: string) => tag?.trim())
          .filter((tag: string | null): tag is string => tag !== null && tag !== '');


      const payloadToSend: Partial<Recipe> = {
        ...(this.isEditMode() && this.recipeId() ? { id: this.recipeId() } : {}), // Use signals
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
        tags: finalTags,
        imageUrl: finalImageUrl ?? '' // Use the determined final URL
      };

      console.log('Payload to send:', payloadToSend);

      // 3. Save Recipe
      const savedRecipe = await lastValueFrom(this.recipeService.saveRecipe(payloadToSend as Recipe));

      if (savedRecipe && savedRecipe.id) {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Recette ${this.isEditMode() ? 'mise à jour' : 'créée'} !`,
        });
        this.resetFormAndSignals(); // Reset state
        setTimeout(() => { this.router.navigate(['/recipe', savedRecipe.id]); }, 1000);
      } else {
          // Should not happen if saveRecipe throws error on failure
          this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Réponse serveur inattendue après sauvegarde.' });
      }

    } catch (err: any) {
      console.error("Erreur lors de l'upload ou de la sauvegarde:", err);
      const detail = err?.error?.message || err.message || 'Une erreur est survenue.';
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: detail });
    } finally {
      this.isUploadingOrSaving.set(false); // Ensure loader stops
    }
  }
  // --------------------------------------

  cancel(): void {
    this.confirmationService.confirm({
      message: 'Annuler les modifications ?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui',
      rejectLabel: 'Non',
      accept: () => {
        if (this.isEditMode() && this.recipeId()) {
          this.router.navigate(['/recipe', this.recipeId()]);
        } else {
          this.router.navigate(['/']);
        }
      }
    });
  }

  resetFormAndSignals(): void {
    const defaultValues = {
        title: '', description: '', category: '', subcategory: '',
        prepTime: null, cookTime: null, servings: null, difficulty: '',
        imageUrl: null, tags: []
    };
    this.recipeForm.reset(defaultValues);

    this.clearFormArray(this.ingredients); this.addIngredient();
    this.clearFormArray(this.instructions); this.addInstruction();

    this.selectedImageFile.set(null);
    this.loadedRecipeImageUrl.set(null); // Reset loaded URL too
    this.isEditMode.set(false);
    this.recipeId.set('');

    // Explicitly disable subcategory after reset
    this.recipeForm.get('subcategory')?.disable({ emitEvent: false });
    this.subcategories = []; // Clear subcategory options
}


  // --- Helpers (Unchanged) ---
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
  // --------------------------
}