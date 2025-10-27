import { Injectable } from '@angular/core';
import { Observable, of, isObservable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { OpenRouterService } from './openrouter.service';
import { Message } from '../../../models/message.interface';
import { WeatherService } from './weather.service';

@Injectable({
  providedIn: 'root'
})
export class IntentRouterService {
  private tools: Map<string, any> = new Map();

  constructor(
    private openRouterService: OpenRouterService,
    private weatherService: WeatherService
  ) {
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
      const result: string | Observable<string> | Promise<string> = tool.execute(message);
      const createResponse = (content: string): Message => ({
        id: `local_${Date.now()}`,
        role: 'assistant',
        content: typeof content === 'string' ? content : JSON.stringify(content),
        timestamp: new Date()
      });

      if (isObservable(result)) {
        return result.pipe(map(response => createResponse(response)));
      }

      if (result instanceof Promise) {
        return from(result).pipe(map(response => createResponse(response)));
      }

      return of(createResponse(result));
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

    // Weather tool using MCP integration
    this.tools.set('weather', {
      execute: (message: string) => this.weatherService.getWeather(message)
    });
  }

  registerTool(name: string, tool: any): void {
    this.tools.set(name, tool);
  }
}
