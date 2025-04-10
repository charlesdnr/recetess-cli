import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { CategoryComponent } from './components/category/category.component';
import { RecipeDetailComponent } from './components/recipe-detail/recipe-detail.component';
import { RecipeFormComponent } from './components/recipe-form/recipe-form.component';
import { CategoryManagementComponent } from './components/category-management/category-management.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent, pathMatch: 'full' },
    { path: 'category/:category', component: CategoryComponent },
    { path: 'category/:category/:subcategory', component: CategoryComponent },
    { path: 'recipe/:id', component: RecipeDetailComponent },
    // Routes protégées
    {
        path: 'new-recipe',
        component: RecipeFormComponent,
        canActivate: [authGuard]
    },
    {
        path: 'edit-recipe/:id',
        component: RecipeFormComponent,
        canActivate: [authGuard]
    },
    {
        path: 'manage-categories',
        component: CategoryManagementComponent,
        canActivate: [authGuard]
    },
    { path: '**', redirectTo: '' }
];