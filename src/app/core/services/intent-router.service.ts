import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OpenRouterService } from './openrouter.service';
import { Message } from '../../../models/message.interface';

@Injectable({
  providedIn: 'root'
})
export class IntentRouterService {
  private tools: Map<string, any> = new Map();

  constructor(private openRouterService: OpenRouterService) {
    this.initializeTools();
  }

  processMessage(message: string): Observable<Message> {
    const intent = this.detectIntent(message.toLowerCase());
    
    if (intent && this.tools.has(intent)) {
      return this.executeLocal(intent, message);
    }
    
    // Default to OpenRouter for general conversation
    return this.openRouterService.sendMessage(message);
  }

  private detectIntent(message: string): string | null {
    // Enhanced intent detection with regex patterns
    const intents = [
      {
        name: 'time',
        patterns: [/hora\b/, /tiempo\b/, /qué hora es\b/, /que hora es\b/, /hora actual\b/]
      },
      {
        name: 'weather',
        patterns: [/clima\b/, /tiempo (en|para)\b/, /temperatura\b/, /lluvia\b/, /pronóstico\b/]
      },
      {
        name: 'greeting',
        patterns: [/hola\b/, /buenos días\b/, /buenas tardes\b/, /buenas noches\b/, /hey jarvis\b/]
      }
    ];

    for (const intent of intents) {
      if (intent.patterns.some(pattern => pattern.test(message))) {
        return intent.name;
      }
    }

    return null;
  }

  private executeLocal(intent: string, message: string): Observable<Message> {
    const tool = this.tools.get(intent);
    if (tool) {
      const result = tool.execute(message);
      const response: Message = {
        id: `local_${Date.now()}`,
        role: 'assistant',
        content: result,
        timestamp: new Date()
      };
      return of(response);
    }

    return this.openRouterService.sendMessage(message);
  }

  private initializeTools(): void {
    // Time tool
    this.tools.set('time', {
      execute: (message: string) => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        return `La hora actual es ${timeString}.`;
      }
    });

    // Greeting tool
    this.tools.set('greeting', {
      execute: (message: string) => {
        const greetings = [
          'Hola, soy JARVIS. ¿En qué puedo ayudarte?',
          'Buenos días. Estoy aquí para asistirte.',
          '¡Hola! ¿Qué necesitas que haga por ti?'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
      }
    });

    // Weather tool (placeholder)
    this.tools.set('weather', {
      execute: (message: string) => {
        return 'Lo siento, la función del clima aún no está disponible. ¿Puedo ayudarte con algo más?';
      }
    });
  }

  registerTool(name: string, tool: any): void {
    this.tools.set(name, tool);
  }
}