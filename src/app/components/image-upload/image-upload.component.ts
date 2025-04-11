import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal, // Import signal
  ChangeDetectionStrategy, // Use OnPush
  input,
  output,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload, FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [
    CommonModule,
    FileUploadModule, // Import FileUploadModule instead of FileUpload directly
    ButtonModule,
    BadgeModule,
    TooltipModule
  ],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Enable OnPush
})
export class ImageUploadComponent implements OnInit, OnChanges {
  // Inputs remain the same
  initialImageUrl = input<string | null>(null);
  label = input('Image');
  maxFileSize = input(100000000);
  accept = input('image/*');
  defaultImage = input('assets/images/default-recipe.jpg');

  fileSelected = output<File | null>();

  imageUploader = viewChild<FileUpload | undefined>('imageUploader');

  // --- State using Signals ---
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | ArrayBuffer | null>(null);
  // -------------------------

  // No ChangeDetectorRef needed typically with signals + OnPush

  ngOnInit(): void {
    this.updatePreviewFromInitial();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update preview if initial URL changes AND no file is currently selected
    if (changes['initialImageUrl'] && !this.selectedFile()) {
      this.updatePreviewFromInitial();
    }
  }

  private updatePreviewFromInitial(): void {
    this.previewUrl.set(this.initialImageUrl() || this.defaultImage() || null);
  }

  onFileSelect(event: FileSelectEvent): void {
    if (event.currentFiles.length > 0) {
      const file = event.currentFiles[0];
      this.selectedFile.set(file);
      this.showPreview(file); // showPreview will update the previewUrl signal
      this.fileSelected.emit(file);
    }
  }

  clearSelection(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(this.defaultImage() || null); // Reset preview to default/null
    this.fileSelected.emit(null); // Inform parent
    this.imageUploader()?.clear(); // Reset PrimeNG component state
  }

  // Called if p-fileupload itself emits onClear (less likely with our custom button)
  onInternalClear(): void {
    if (this.selectedFile()) { // Only if we are actually clearing a selected file
      this.clearSelection();
    }
  }

  showPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl.set(e.target.result); // Set the signal value
    };
    reader.readAsDataURL(file);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) { return '0 Bytes'; }
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}