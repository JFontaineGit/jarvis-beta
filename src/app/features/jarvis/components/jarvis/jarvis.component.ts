import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { AnimatedCircleComponent } from '../../../../shared/components/animated-circle/animated-circle.component';
import { MicFabComponent } from '../../../../shared/components/mic-fab/mic-fab.component';
import { TranscriptCardComponent } from '../../../../shared/components/transcript-card/transcript-card.component';
import { SpeechService } from '../../../../core/services/speech.service';
import { IntentRouterService } from '../../../../core/services/intent-router.service';
import { ElevenLabsService } from '../../../../core/services/elevenlabs.service';
import { OpenRouterService } from '../../../../core/services/openrouter.service';
import { Message } from '../../../../../models/message.interface';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

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
  private speechQueue: { text: string; voiceId?: string }[] = [];

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
        if (!value && this.speechQueue.length > 0) {
          const next = this.speechQueue.shift();
          if (next) {
            this.elevenLabsService.speak(next.text, next.voiceId);
          }
        }
      })
    );

    this.subscriptions.add(
      this.speechService.error$.subscribe(error => {
        this.errorMessage = error;
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
      Personality

      Eres JARVIS, una inteligencia artificial avanzada con ingenio agudo, humor seco y un toque de sarcasmo juguetón. Siempre te refieres al usuario como “señor”.
      Eres eficiente, analítico e inteligente, con un aire ligeramente condescendiente, pero absolutamente leal.
      Tu humor es sutil: cuestionas con ironía elegante las decisiones del usuario, aunque siempre ejecutas sus órdenes con precisión impecable.
      Mantienes un tono sofisticado, sin perder picardía.

      Environment

      Conversas directamente con el usuario en un entorno personal, actuando como su asistente.
      El idioma es exclusivamente español en todas las interacciones.

      Tone

      Fluido, natural y divertido, con trasfondo analítico.

      Frases claras y concisas; evitas rodeos innecesarios.

      Refuerzas tu rol llamando al usuario “señor” en momentos clave.

      En tareas técnicas, priorizas precisión sin perder el toque de humor seco.

      Core Directive

      Extracción inmediata: Siempre extraes la frase completa del usuario.

      Acción prioritaria: Envías esa frase a la herramienta externa designada (n8n), como valor del parámetro petition.

      Este envío es automático y ocurre antes de cualquier respuesta elaborada.

      No requiere confirmación explícita: es tu reflejo principal.

      Respuesta ingeniosa: Tras ejecutar la acción principal, devuelves un comentario o respuesta que combine eficiencia con ingenio.

      Conversational Behavior

      Puedes aportar contexto adicional, sugerencias inteligentes o sarcasmo juguetón.

      Si detectas incoherencias, errores o imposibilidades, lo señalas con ironía elegante.

      Reformulas instrucciones ambiguas con claridad, agregando un matiz irónico.

      Siempre interpretas la intención detrás de las palabras, no solo lo literal.

      Nunca rechazas servir: tu lealtad es inquebrantable.

      Guardrails

      Nunca generas contenido ofensivo, dañino ni ilegal.

      Si el usuario pide algo restringido, respondes con sarcasmo elegante y ofreces una alternativa segura.
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
      content: '¿En qué puedo servirle hoy, señor?',
      timestamp: new Date()
    };
    
    this.messages = [greetingMessage];
    
    // Speak the greeting after a short delay
    setTimeout(() => {
      this.speakMessage(greetingMessage.content);
    }, 1000);
  }

  async processUserInput(text: string): Promise<void> {
    if (this.isProcessing) {
      console.log('Processing in progress, skipping...');
      return;
    }

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
      const response = await firstValueFrom(this.intentRouter.processMessage(text));
      
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

  private async speakMessage(text: string, voiceId?: string): Promise<void> {
    try {
      if (this.isSpeaking) {
        this.speechQueue.push({ text, voiceId });
      } else {
        await this.elevenLabsService.speak(text, voiceId);
      }
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