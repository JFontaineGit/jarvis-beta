import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

// Interfaz Particle (mantenida, pero con más propiedades para animaciones insanas)
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number; // Agregado para más variedad
}

@Component({
  selector: 'app-animated-circle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animated-circle.component.html',
  styleUrls: ['./animated-circle.component.scss']
})
export class AnimatedCircleComponent implements OnInit, OnDestroy {
  @Input() volume: number = 0;
  @Input() isListening: boolean = false;
  @Input() isSpeaking: boolean = false;
  @ViewChild('circleContainer', { static: true }) circleContainer!: ElementRef;

  public particles: Particle[] = [];
  private animationFrame: number | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    this.initializeParticles();
    if (isPlatformBrowser(this.platformId)) {
      this.animate();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrame && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private initializeParticles(): void {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.5 + 0.1,
        delay: Math.random() * 8 // Agregado para delays random
      });
    }
  }

  trackParticle(index: number, particle: Particle): number {
    return particle.id;
  }

  private animate(): void {
    if (isPlatformBrowser(this.platformId) && this.circleContainer?.nativeElement) {
      const element = this.circleContainer.nativeElement;
      element.style.setProperty('--volume', this.volume.toString());
      element.style.setProperty('--listening', this.isListening ? '1' : '0');
      element.style.setProperty('--speaking', this.isSpeaking ? '1' : '0');
    }

    if (isPlatformBrowser(this.platformId)) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    }
  }

  getCircleClasses(): string[] {
    const classes = ['animated-circle'];
    
    if (this.isListening) {
      classes.push('listening');
    }
    
    if (this.isSpeaking) {
      classes.push('speaking');
    }
    
    if (this.volume > 0.3) {
      classes.push('high-volume');
    }

    return classes;
  }
}