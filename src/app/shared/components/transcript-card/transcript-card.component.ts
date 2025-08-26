import { Component, Input, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Message } from '../../../../models/message.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-transcript-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transcript-card.component.html',
  styleUrls: ['./transcript-card.component.scss'],
})
export class TranscriptCardComponent implements OnInit {
  @Input() message!: Message;
  @Input() isLatest = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (this.isLatest && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.scrollToElement();
      }, 100);
    }
  }

  private scrollToElement(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const element = document.querySelector('.transcript-card.latest');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  }

  get isUser(): boolean {
    return this.message.role === 'user';
  }

  get isAssistant(): boolean {
    return this.message.role === 'assistant';
  }

  get timeString(): string {
    return this.message.timestamp.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get messageClasses(): string[] {
    const classes = ['transcript-card'];

    if (this.isUser) classes.push('user');
    if (this.isAssistant) classes.push('assistant');
    if (this.isLatest) classes.push('latest');
    if (this.message.isInterim) classes.push('interim');

    return classes;
  }
}
