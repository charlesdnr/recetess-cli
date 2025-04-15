import {
  Component,
  input,
  output,
  viewChild,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [
    CommonModule,
    FileUploadModule,
    ButtonModule,
    BadgeModule,
    TooltipModule,
    FormsModule
  ],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
})
export class ImageUploadComponent implements OnInit {
  initialImageUrl = input<string | null>(null);
  label = input('Image');
  maxFileSize = input(100000000);
  accept = input('image/*');
  defaultImage = input('assets/images/default-recipe.jpg');

  fileSelected = output<File | null>();

  imageUploader = viewChild<FileUpload | undefined>('imageUploader');

  currentImageUrl = signal<string | null>(null);
  hasFile = signal<boolean>(false);

  ngOnInit() {
    // Initialiser l'image avec l'URL fournie ou l'image par défaut
    const initialUrl = this.initialImageUrl();
    if (initialUrl) {
      this.currentImageUrl.set(initialUrl);
      this.hasFile.set(true);
    } else {
      this.currentImageUrl.set(this.defaultImage());
      this.hasFile.set(false);
    }
  }

  onSelect(event: any) {
    if (event.files && event.files.length > 0) {
      const file = event.files[0];
      this.fileSelected.emit(file);

      // Créer URL pour prévisualiser l'image sélectionnée
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentImageUrl.set(e.target?.result as string);
        this.hasFile.set(true);
      };
      reader.readAsDataURL(file);
    }
  }

  onClear() {
    this.currentImageUrl.set(this.defaultImage());
    this.hasFile.set(false);
    this.fileSelected.emit(null);
  }

  removeImage() {
    this.onClear();
    if (this.imageUploader()) {
      this.imageUploader()!.clear();
    }
  }
}