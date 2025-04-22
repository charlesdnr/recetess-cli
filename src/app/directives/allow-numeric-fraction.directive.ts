// src/app/directives/allow-numeric-fraction.directive.ts
import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appAllowNumericFraction]', // Le sélecteur d'attribut à utiliser dans le HTML
  standalone: true, // Rendre la directive standalone
})
export class AllowNumericFractionDirective {

  // Clés de contrôle toujours autorisées
  private allowedControlKeys: string[] = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'Home', 'End', 'ArrowLeft', 'ArrowRight', 'Clear', 'Copy', 'Paste'
  ];

  constructor(private el: ElementRef<HTMLInputElement>) {} // Injecter ElementRef

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const hostElement = this.el.nativeElement;
    const currentVal: string = hostElement.value;
    const key = event.key;

    // 1. Autoriser les touches de contrôle définies ci-dessus
    if (this.allowedControlKeys.includes(key) ||
       // Autoriser Ctrl+A, C, V, X (sélection, copier, coller, couper)
       ((key === 'a' || key === 'c' || key === 'v' || key === 'x') && (event.ctrlKey || event.metaKey)) // metaKey pour MacOS
      ) {
      return; // Laisser l'événement se produire
    }

    // 2. Vérifier les règles spécifiques aux caractères numériques, point, virgule, slash

    // Empêcher plusieurs points ou virgules
    if ((key === '.' || key === ',') && (currentVal.includes('.') || currentVal.includes(','))) {
      event.preventDefault();
      return;
    }

    // Empêcher plusieurs slashs
    if (key === '/' && currentVal.includes('/')) {
      event.preventDefault();
      return;
    }

    // Empêcher '.' ou ',' si un '/' existe déjà
    if ((key === '.' || key === ',') && currentVal.includes('/')) {
      event.preventDefault();
      return;
    }

    // Empêcher '/' si un '.' ou ',' existe déjà
    if (key === '/' && (currentVal.includes('.') || currentVal.includes(','))) {
      event.preventDefault();
      return;
    }

    // 3. Autoriser uniquement les chiffres (0-9), le point, la virgule, et le slash
    // Créer une regex pour tester si la touche est l'un des caractères autorisés
    const isAllowedChar = /^[0-9\.\,\/]$/.test(key);

    if (!isAllowedChar) {
      // Si la touche n'est ni une touche de contrôle autorisée, ni un caractère autorisé, bloquer la saisie
      event.preventDefault();
    }

    // Note: La gestion du 'coller' (Ctrl+V) peut nécessiter une logique supplémentaire
    // dans un listener 'paste' si l'on veut valider le texte collé entièrement.
    // Cette implémentation se concentre sur le blocage de la frappe.
  }

  // Optionnel: Gestion basique du 'coller' pour une meilleure robustesse
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
      const clipboardData = event.clipboardData;
      const pastedText = clipboardData?.getData('text');

      if (pastedText) {
          const hostElement = this.el.nativeElement;
          const currentVal = hostElement.value;
          // Prédiction simple de la valeur après collage
          const nextValue = currentVal.substring(0, hostElement.selectionStart ?? 0) +
                            pastedText +
                            currentVal.substring(hostElement.selectionEnd ?? 0);

           // Vérification simple : contient uniquement les caractères autorisés ?
           const allowedCharsRegex = /^[0-9\.\,\/]*$/;
           if (!allowedCharsRegex.test(nextValue)) {
                 console.warn("Pasted text contains invalid characters.");
                 event.preventDefault(); // Bloquer le collage si caractères invalides détectés
           }
           // Une validation plus poussée (format nombre OU format fraction) pourrait être ajoutée ici
      }
  }
}