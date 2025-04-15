// src/app/components/recipe-form/recipe-form.component.ts
import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  computed,
  ChangeDetectorRef,
  NgZone
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
  FormControl,
  AbstractControl // Importer AbstractControl
} from '@angular/forms';
import { Category, Recipe, Ingredient } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';

// --- CDK Drag and Drop Imports ---
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
// ---------------------------------

// PrimeNG Imports (OrderListModule enlevé)
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
// import { OrderListModule } from 'primeng/orderlist'; // <-- Supprimé

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
    ImageUploadComponent,
    DragDropModule
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
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  // --- Form Definition (remains ReactiveFormsModule) ---
  recipeForm!: FormGroup;

  // --- State using Signals ---
  recipeId = signal<string>('');
  isEditMode = signal<boolean>(false);
  loading = signal<boolean>(false);
  isUploadingOrSaving = signal<boolean>(false);
  loadedRecipeImageUrl = signal<string | null>(null);
  selectedImageFile = signal<File | null>(null);
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
  initialImageUrlForChild = computed(() => this.loadedRecipeImageUrl() || 'assets/images/default-recipe.jpg');

  // Helpers pour le typage dans le template (peuvent être gardés)
  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }
  asFormControl(control: AbstractControl): FormControl {
      return control as FormControl;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();

    // --- Load Recipe Data ---
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id') || '';
      this.recipeId.set(id);
      this.isEditMode.set(!!id);

      if (this.isEditMode()) {
        this.loading.set(true);
        try {
          const recipe = await lastValueFrom(this.recipeService.getRecipe(id));
          if (recipe) {
            this.populateForm(recipe);
          } else {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Recette non trouvée.' });
            this.router.navigate(['/']);
          }
        } catch (err) {
          console.error("Error loading recipe for edit:", err);
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la recette.' });
          this.router.navigate(['/']);
        } finally {
          this.loading.set(false);
          this.cdr.detectChanges();
        }
      } else {
        this.loadedRecipeImageUrl.set(null);
        this.selectedImageFile.set(null);
        // S'assurer qu'il y a au moins un champ vide au départ pour nouveau formulaire
        if (this.ingredients.length === 0) this.addIngredient();
        if (this.instructions.length === 0) this.addInstruction();
      }
    });

    // --- Category -> Subcategory Logic ---
    this.recipeForm.get('category')?.valueChanges.subscribe((categoryName) => {
      this.updateSubcategories(categoryName);
      if (!this.subcategories.some(sub => sub.value === this.recipeForm.get('subcategory')?.value)) {
        this.recipeForm.get('subcategory')?.setValue('', { emitEvent: false });
      }
      this.cdr.detectChanges();
    });
  }

  initForm(): void {
    this.recipeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: ['', Validators.required],
      subcategory: [{ value: '', disabled: true }],
      prepTime: [null, [Validators.required, Validators.min(0)]], // Min 0 autorisé
      cookTime: [null, [Validators.required, Validators.min(0)]], // Min 0 autorisé
      servings: [null, [Validators.required, Validators.min(1)]],
      difficulty: ['', Validators.required],
      ingredients: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      instructions: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      imageUrl: [null as string | null],
      tags: [[]], // Remplacé AutoComplete par Chips plus tard si besoin
    });

    // Ne PAS ajouter d'ingrédient/instruction ici si on le fait dans ngOnInit pour nouveau form
    // if (!this.isEditMode()) { ... }
  }

  createIngredientGroup(ingredient: Ingredient | null = null): FormGroup {
    return this.fb.group({
      quantity: [ingredient?.quantity || ''],
      unit: [ingredient?.unit || ''],
      name: [ingredient?.name || '', Validators.required]
    });
  }

  createInstructionControl(instruction: string | null = null): FormControl {
      return this.fb.control(instruction || '', Validators.required);
  }

  loadCategories(): void {
    this.recipeService.getCategories().subscribe({
      next: categories => {
        this.categories = categories;
        this.categoryOptions = categories.map((cat) => ({
          label: cat.name,
          value: cat.name,
        })).sort((a, b) => a.label.localeCompare(b.label));

        if (this.recipeForm.get('category')?.value) {
          this.updateSubcategories(this.recipeForm.get('category')?.value);
          const currentSubcategory = this.recipeForm.get('subcategory')?.value;
          if (currentSubcategory && !this.subcategories.some(sub => sub.value === currentSubcategory)) {
             this.recipeForm.get('subcategory')?.setValue('', { emitEvent: false });
          } else if (currentSubcategory && this.recipeForm.get('subcategory')?.disabled) {
             this.recipeForm.get('subcategory')?.enable({ emitEvent: false });
          }
        }
        this.cdr.detectChanges();
      },
      error: err => {
        console.error("Error loading categories:", err);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les catégories.' });
        this.cdr.detectChanges();
      }
    });
  }

  populateForm(recipe: Recipe): void {
    console.log("Populating form with:", recipe);

    this.clearFormArray(this.ingredients);
    this.clearFormArray(this.instructions);

    this.recipeForm.patchValue({
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      subcategory: recipe.subcategory || '',
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      imageUrl: recipe.imageUrl,
      tags: recipe.tags || [],
    });

    this.loadedRecipeImageUrl.set(recipe.imageUrl || null);

    if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ing => this.ingredients.push(this.createIngredientGroup(ing)));
    } else {
        this.addIngredient(); // Ajouter un champ vide si la recette chargée n'en a pas
    }

    if (recipe.instructions && recipe.instructions.length > 0) {
        recipe.instructions.forEach(inst => this.instructions.push(this.createInstructionControl(inst)));
    } else {
        this.addInstruction(); // Ajouter un champ vide
    }

    this.updateSubcategories(recipe.category);
    if (recipe.subcategory) {
        this.recipeForm.get('subcategory')?.setValue(recipe.subcategory, { emitEvent: false });
    } else {
         this.recipeForm.get('subcategory')?.setValue('', { emitEvent: false });
    }

    this.selectedImageFile.set(null);
    this.recipeForm.markAsPristine();
    this.cdr.detectChanges();
  }


  updateSubcategories(categoryName: string | null): void {
    const subcategoryControl = this.recipeForm.get('subcategory');
    if (!categoryName) {
      this.subcategories = [];
      subcategoryControl?.disable({ emitEvent: false });
      subcategoryControl?.setValue('', { emitEvent: false });
      this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }

  // --- Form Array Getters ---
  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }
  get instructions(): FormArray {
    return this.recipeForm.get('instructions') as FormArray;
  }
  // ---------------------------

  // --- Add/Remove Methods ---
  addIngredient(): void {
    this.ingredients.push(this.createIngredientGroup());
    this.cdr.detectChanges(); // Important pour que le template se mette à jour
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
      this.recipeForm.markAsDirty();
      this.cdr.detectChanges();
    } else {
      this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Au moins un ingrédient est requis' });
    }
  }

  addInstruction(): void {
    this.instructions.push(this.createInstructionControl());
    this.cdr.detectChanges(); // Important
  }

  removeInstruction(index: number): void {
    if (this.instructions.length > 1) {
      this.instructions.removeAt(index);
      this.recipeForm.markAsDirty();
      this.cdr.detectChanges();
    } else {
       this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Au moins une étape est requise' });
    }
  }
  // --------------------------

  // --- Image Handling ---
  onImageSelected(file: File | null): void {
    this.selectedImageFile.set(file);
    this.recipeForm.markAsDirty();
    if (file === null) {
      // Si l'utilisateur supprime l'image via le composant enfant,
      // mettre à jour la valeur dans le formulaire aussi.
      this.recipeForm.get('imageUrl')?.setValue('');
    }
    this.cdr.detectChanges();
  }
  // --------------------

  filterTags(event: { query: string }): void { /* ... Tag logic (si p-chips est utilisé) ... */ }

  // --- CDK Drop Methods ---
  dropIngredient(event: CdkDragDrop<AbstractControl[]>) {
    // Vérifie si le drop a eu lieu dans le même conteneur
    if (event.previousContainer === event.container) {
      // Réordonne les contrôles dans le FormArray
      moveItemInArray(this.ingredients.controls, event.previousIndex, event.currentIndex);
      // Important: Mettre à jour la validité et l'état pour que le formulaire reflète le changement
      this.ingredients.updateValueAndValidity();
      this.recipeForm.markAsDirty();
      this.cdr.detectChanges(); // Notifier Angular
    }
  }

  dropInstruction(event: CdkDragDrop<AbstractControl[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.instructions.controls, event.previousIndex, event.currentIndex);
      this.instructions.updateValueAndValidity();
      this.recipeForm.markAsDirty();
      this.cdr.detectChanges();
    }
  }
  // -----------------------

  // --- Submit Logic ---
  async onSubmit(): Promise<void> {
    if (this.recipeForm.invalid) {
      this.markFormGroupTouched(this.recipeForm);
      this.messageService.add({ severity: 'error', summary: 'Formulaire Invalide', detail: 'Veuillez corriger les erreurs avant de soumettre.' });
      console.warn('Form invalid:', this.getFormValidationErrors(this.recipeForm));
      this.cdr.detectChanges();
      return;
    }

    this.isUploadingOrSaving.set(true);
    this.cdr.detectChanges();

    let finalImageUrl: string | null = this.recipeForm.get('imageUrl')?.value;

    try {
      const imageFileToUpload = this.selectedImageFile();

      if (imageFileToUpload) {
        console.log('Uploading new image...');
        const uploadResult = await lastValueFrom(this.recipeService.uploadImage(imageFileToUpload));
        finalImageUrl = uploadResult.imageUrl;
        // Pas besoin de patcher le form ici, on utilise finalImageUrl directement dans le payload
      }
      // Si l'image a été supprimée (file=null et imageUrl=''), finalImageUrl sera ''

      console.log('Final Image URL to save:', finalImageUrl);

      const formValue = this.recipeForm.getRawValue(); // getRawValue inclut les champs désactivés (pas pertinent ici mais bonne pratique)

      const finalIngredients = (formValue.ingredients || [])
        .map((ing: any) => ({
          quantity: typeof ing.quantity === 'number' ? ing.quantity.toString() : (ing.quantity || ''),
          unit: ing.unit?.trim() ?? '',
          name: ing.name?.trim() ?? '',
        }))
        .filter((ing: Ingredient) => ing.name); // Ne garder que ceux avec un nom

      const finalInstructions = (formValue.instructions || [])
        .map((inst: string) => inst?.trim() ?? '')
        .filter((inst: string) => inst); // Ne garder que les non vides

      const finalSubcategory = formValue.subcategory || null;
      const finalTags = (formValue.tags || [])
        .map((tag: any) => typeof tag === 'string' ? tag.trim() : (tag?.name || '')) // Adapter si p-chips renvoie des objets
        .filter((tag: string | null): tag is string => tag !== null && tag !== '');


      const payloadToSend: Partial<Recipe> = {
        ...(this.isEditMode() && this.recipeId() ? { id: this.recipeId() } : {}),
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
        imageUrl: finalImageUrl ?? '' // Assurer une chaîne vide si null/undefined
      };

      console.log('Payload to send:', payloadToSend);

      const savedRecipe = await lastValueFrom(this.recipeService.saveRecipe(payloadToSend as Recipe));

      if (savedRecipe && savedRecipe.id) {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Recette ${this.isEditMode() ? 'mise à jour' : 'créée'} !`,
        });
        this.recipeService.clearAllCaches();
        // Ne pas reset ici pour voir le message, reset implicite par navigation
        // this.resetFormAndSignals();
        this.recipeForm.markAsPristine(); // Marquer comme non modifié après sauvegarde
        setTimeout(() => {
          this.zone.run(() => {
            this.router.navigate(['/recipe', savedRecipe.id], { replaceUrl: true });
          });
        }, 1000);
      } else {
         // Gérer le cas où la sauvegarde réussit mais ne renvoie pas d'ID (peu probable)
        this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Réponse serveur inattendue après sauvegarde.' });
      }

    } catch (err: any) {
      console.error("Erreur lors de l'upload ou de la sauvegarde:", err);
      const detail = err?.error?.message || err.message || 'Une erreur est survenue.';
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: detail });
    } finally {
      this.isUploadingOrSaving.set(false);
      this.cdr.detectChanges();
    }
  }
  // --------------------

  // --- Cancel & Navigation ---
  cancel(): void {
     if (this.recipeForm.dirty && !this.isUploadingOrSaving()) { // Ne pas demander si en cours de sauvegarde
        this.confirmationService.confirm({
            message: 'Voulez-vous annuler les modifications non enregistrées ?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Oui',
            rejectLabel: 'Non',
            accept: () => {
                this.navigateToOrigin();
            }
            // reject: () => {} // Ne rien faire si l'utilisateur refuse
        });
     } else if (!this.isUploadingOrSaving()) { // Naviguer directement si pas modifié ou pas en sauvegarde
         this.navigateToOrigin();
     }
  }

  private navigateToOrigin(): void {
    if (this.isEditMode() && this.recipeId()) {
      this.router.navigate(['/recipe', this.recipeId()]);
    } else {
      this.router.navigate(['/']);
    }
  }
  // -------------------------

  // --- Reset & Helpers ---
  resetFormAndSignals(): void {
    // Cette fonction peut être appelée si on reste sur la page après création
    // mais la navigation actuelle la rend moins utile.
    const defaultValues = { /* ... valeurs par défaut ... */ };
    this.recipeForm.reset(defaultValues);
    this.clearFormArray(this.ingredients); this.addIngredient();
    this.clearFormArray(this.instructions); this.addInstruction();
    this.selectedImageFile.set(null);
    this.loadedRecipeImageUrl.set(null);
    this.recipeForm.get('subcategory')?.disable({ emitEvent: false });
    this.subcategories = [];
    this.recipeForm.markAsPristine();
    this.recipeForm.markAsUntouched();
    this.cdr.detectChanges();
  }

  clearFormArray(formArray: FormArray): void {
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach((control: AbstractControl) => {
      control.markAsTouched();
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control as FormGroup | FormArray);
      }
    });
     this.cdr.detectChanges(); // Force la MAJ pour afficher les erreurs de validation
  }

  getFormValidationErrors(form: FormGroup | FormArray): any {
    // ... (inchangé) ...
    const errors: any = {};
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control instanceof FormControl) {
        if (control.errors) { errors[key] = control.errors; }
      } else if (control instanceof FormGroup || control instanceof FormArray) {
        const nestedErrors = this.getFormValidationErrors(control);
        if (Object.keys(nestedErrors).length > 0) { errors[key] = nestedErrors; }
      }
    });
    if (form.errors) {
        errors['formLevelErrors'] = form.errors;
    }
    return errors;
  }
}