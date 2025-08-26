import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { AnimatedCircleComponent } from '../../../../shared/components/animated-circle/animated-circle.component';
import { MicFabComponent } from '../../../../shared/components/mic-fab/mic-fab.component';
import { TranscriptCardComponent } from '../../../../shared/components/transcript-card/transcript-card.component';
// Services
import { SpeechService } from '../../../../core/services/speech.service';
import { IntentRouterService } from '../../../../core/services/intent-router.service';
import { ElevenLabsService } from '../../../../core/services/elevenlabs.service';
import { OpenRouterService } from '../../../../core/services/openrouter.service';

// Models
import { Message } from '../../../../../models/message.interface';
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-jarvis',
  standalone: true,
  imports: [
    AnimatedCircleComponent,
    MicFabComponent,
    TranscriptCardComponent,
    CommonModule
  ],
  templateUrl: './jarvis.component.html',
  styleUrls: ['./jarvis.component.scss']
})
export class JarvisComponent implements OnInit, OnDestroy {
  private speechService = inject(SpeechService);
  private intentRouter = inject(IntentRouterService);
  private elevenLabsService = inject(ElevenLabsService);
  private openRouterService = inject(OpenRouterService);

  // Estados no observables para evitar null del async pipe
  isListening = false;
  volume = 0;
  isSpeaking = false;

  // Component state
  messages: Message[] = [];
  currentInterimText = '';
  isProcessing = false;
  errorMessage = '';

  private subscriptions = new Subscription();

  ngOnInit(): void {
    // Suscripciones a los observables para asignar valores
    this.subscriptions.add(
      this.speechService.listening$.subscribe(value => {
        this.isListening = value ?? false;
      })
    );

    this.subscriptions.add(
      this.speechService.volume$.subscribe(value => {
        this.volume = value ?? 0;
      })
    );

    this.subscriptions.add(
      this.elevenLabsService.speaking$.subscribe(value => {
        this.isSpeaking = value ?? false;
      })
    );

    this.initializeJarvis();
    this.setupSpeechListeners();
    this.setupInitialGreeting();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeJarvis(): void {
    // Set system message for JARVIS persona
    this.openRouterService.setSystemMessage(`
      Eres JARVIS, el asistente virtual inteligente de Tony Stark. 
      Responde de manera concisa, inteligente y con un toque de sofisticación.
      Mantén las respuestas breves pero informativas.
      Usa un tono profesional pero amigable.
      Responde en español a menos que te soliciten otro idioma.
    `);
  }

  private setupSpeechListeners(): void {
    // Listen for interim text (real-time transcription)
    this.subscriptions.add(
      this.speechService.interimText$
        .pipe(distinctUntilChanged())
        .subscribe(text => {
          this.currentInterimText = text;
        })
    );

    // Listen for final transcription
    this.subscriptions.add(
      this.speechService.finalText$
        .pipe(
          filter(text => text.trim().length > 0),
          debounceTime(500)
        )
        .subscribe(text => {
          this.processUserInput(text.trim());
          this.currentInterimText = '';
        })
    );
  }

  private setupInitialGreeting(): void {
    // Add initial greeting message
    const greetingMessage: Message = {
      id: 'greeting_' + Date.now(),
      role: 'assistant',
      content: 'Hola, soy JARVIS. ¿En qué puedo asistirte hoy?',
      timestamp: new Date()
    };
    
    this.messages = [greetingMessage];
    
    // Speak the greeting after a short delay
    setTimeout(() => {
      this.speakMessage(greetingMessage.content);
    }, 1000);
  }

  async processUserInput(text: string): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.errorMessage = '';

    // Add user message
    const userMessage: Message = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    this.messages = [...this.messages, userMessage];

    try {
      // Process through intent router
      const response = await this.intentRouter.processMessage(text).toPromise();
      
      if (response) {
        this.messages = [...this.messages, response];
        
        // Speak the response
        await this.speakMessage(response.content);
      }
    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async speakMessage(text: string): Promise<void> {
    try {
      await this.elevenLabsService.speak(text);
    } catch (error) {
      console.error('Error speaking message:', error);
    }
  }

  onMicToggle(): void {
    if (this.speechService.isSupported()) {
      this.speechService.toggleListening();
    } else {
      this.errorMessage = 'Speech recognition is not supported in this browser.';
    }
  }

  onManualInput(text: string): void {
    if (text.trim()) {
      this.processUserInput(text.trim());
    }
  }

  clearConversation(): void {
    this.messages = [];
    this.openRouterService.clearConversation();
    this.setupInitialGreeting();
  }

  private handleError(error: any): void {
    console.error('JARVIS Error:', error);
    
    let errorText = 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.';
    
    if (error.message?.includes('Payment required')) {
      errorText = 'Error de API: límite de créditos alcanzado.';
    } else if (error.message?.includes('Unauthorized')) {
      errorText = 'Error de autenticación con la API.';
    } else if (error.message?.includes('Rate limit')) {
      errorText = 'Demasiadas solicitudes. Por favor, espera un momento.';
    }

    const errorMessage: Message = {
      id: 'error_' + Date.now(),
      role: 'assistant',
      content: errorText,
      timestamp: new Date()
    };
    
    this.messages = [...this.messages, errorMessage];
    this.errorMessage = errorText;
  }

  trackByMessage(index: number, message: Message): string {
    return message.id;
  }
}