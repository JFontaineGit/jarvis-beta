import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mic-fab',
  standalone: true,
  imports: [FormsModule, CommonModule], 
  templateUrl: './mic-fab.component.html',
  styleUrls: ['./mic-fab.component.scss']
})
export class MicFabComponent {
  @Input() isListening: boolean = false;
  @Input() isProcessing: boolean = false;
  @Output() toggle = new EventEmitter<void>();
  @Output() manualInput = new EventEmitter<string>();

  showManualInput = false;
  manualText = '';

  onToggleClick(): void {
    this.toggle.emit();
  }

  onManualInputToggle(): void {
    this.showManualInput = !this.showManualInput;
    if (!this.showManualInput) {
      this.manualText = '';
    }
  }

  onManualSubmit(): void {
    if (this.manualText.trim()) {
      this.manualInput.emit(this.manualText.trim());
      this.manualText = '';
      this.showManualInput = false;
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onManualSubmit();
    }
  }
}