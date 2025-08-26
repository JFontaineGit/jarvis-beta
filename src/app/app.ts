import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

// Modules
import { CoreModule } from './core/core.module';
import { JarvisComponent } from './features/jarvis/components/jarvis/jarvis.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    JarvisComponent
  ],
  templateUrl: './app.html' ,
  styleUrls: ['./app.scss']
})
export class App implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    // Initialize any global app settings
    this.initializeApp();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeApp(): void {
    // Solo ejecutar operaciones del DOM si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      // Set theme CSS variables
      document.documentElement.classList.add('jarvis-theme');
      
      // Disable context menu for production feel
      document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }
}