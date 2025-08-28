import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, firstValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ElevenLabsRequest, VoiceSettings } from '../../../models/message.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ElevenLabsService {
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private isSpeaking$ = new BehaviorSubject<boolean>(false);
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get speaking$(): Observable<boolean> {
    return this.isSpeaking$.asObservable();
  }

  async speak(text: string, voiceId: string = environment.defaultVoiceId): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('TTS not supported on server');
      return;
    }

    if (this.isSpeaking$.value) {
      console.log('Already speaking, skipping new request...');
      return;
    }

    try {
      this.isSpeaking$.next(true);

      const headers = new HttpHeaders({
        'xi-api-key': environment.elevenLabsKey,
        'Content-Type': 'application/json'
      });

      const requestBody: ElevenLabsRequest = {
        text: this.sanitizeText(text),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      };

      const audioBlob = await firstValueFrom(
        this.apiService
          .postForBlob(`${this.baseUrl}/text-to-speech/${voiceId}`, requestBody, headers)
          .pipe(
            catchError((error) => {
              console.error('ElevenLabs TTS Error:', error.message || error);
              return throwError(() => new Error(error.message || 'TTS API error'));
            })
          )
      );

      if (audioBlob) {
        await this.playAudioBlob(audioBlob);
      }
    } catch (error: any) {
      console.error('Error in speak method:', error.message || error);
    } finally {
      this.isSpeaking$.next(false);
    }
  }

  private async playAudioBlob(blob: Blob): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Audio playback not supported on server');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const audioUrl = URL.createObjectURL(blob);
        this.currentAudio = new Audio(audioUrl);

        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        this.currentAudio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          console.error('Audio playback error:', error);
          reject(new Error('Audio playback failed'));
        };

        this.currentAudio.play().catch((error) => {
          console.error('Error playing audio:', error);
          reject(error);
        });
      } catch (error: any) {
        console.error('Error in playAudioBlob:', error.message || error);
        reject(error);
      }
    });
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/<[^>]*>/g, '') // HTML tags
      .replace(/\n{2,}/g, ' ') // Multiple line breaks
      .replace(/\s+/g, ' ') // Multiple spaces
      .trim();
  }

  stopSpeaking(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Stopping TTS not supported on server');
      return;
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isSpeaking$.next(false);
  }

  async getAvailableVoices(): Promise<any[]> {
    try {
      const headers = new HttpHeaders({
        'xi-api-key': environment.elevenLabsKey
      });

      return (
        (await firstValueFrom(
          this.apiService
            .get<any[]>(`${this.baseUrl}/voices`, headers)
            .pipe(
              catchError((error) => {
                console.error('Error fetching voices:', error.message || error);
                return throwError(() => new Error(error.message || 'Voices API error'));
              })
            )
        )) || []
      );
    } catch (error: any) {
      console.error('Error in getAvailableVoices:', error.message || error);
      return [];
    }
  }
}