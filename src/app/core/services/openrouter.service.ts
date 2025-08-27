import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Message } from '../../../models/message.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OpenRouterService {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private currentKeyIndex = 0;
  private conversationHistory: Message[] = [];

  constructor(private apiService: ApiService) {}

  sendMessage(message: string): Observable<Message> {
    const userMessage: Message = {
      id: this.generateId(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    this.conversationHistory.push(userMessage);

    const requestBody = {
      model: environment.openRouterModel,
      messages: this.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.7,
      max_tokens: 800
    };

    return this.makeRequest(requestBody).pipe(
      switchMap(response => {
        const assistantMessage: Message = {
          id: this.generateId(),
          role: 'assistant',
          content: response.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.',
          timestamp: new Date()
        };

        this.conversationHistory.push(assistantMessage);
        return [assistantMessage];
      }),
      catchError(error => {
        if (error.message.includes('Payment required') && this.canRotateKey()) {
          console.log('Rotating to next API key...');
          this.rotateApiKey();
          return this.sendMessage(message);
        }
        return throwError(() => error);
      })
    );
  }

  private makeRequest(body: any): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getCurrentApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jarvis-assistant.local',
      'X-Title': 'JARVIS Assistant'
    });

    return this.apiService.post(`${this.baseUrl}/chat/completions`, body, headers);
  }

  private getCurrentApiKey(): string {
    return environment.openRouterKeys[this.currentKeyIndex];
  }

  private canRotateKey(): boolean {
    return this.currentKeyIndex < environment.openRouterKeys.length - 1;
  }

  private rotateApiKey(): void {
    if (this.canRotateKey()) {
      this.currentKeyIndex++;
    }
  }

  clearConversation(): void {
    this.conversationHistory = [];
  }

  getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setSystemMessage(content: string): void {
    const systemMessage: Message = {
      id: this.generateId(),
      role: 'system',
      content,
      timestamp: new Date()
    };
    
    this.conversationHistory = [systemMessage, ...this.conversationHistory.filter(msg => msg.role !== 'system')];
  }
}