import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private recognition: any;
  private isListening$ = new BehaviorSubject<boolean>(false);
  private interimTranscript$ = new Subject<string>();
  private finalTranscript$ = new Subject<string>();
  private volumeLevel$ = new BehaviorSubject<number>(0);
  private error = new Subject<string>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: any;
  private animationFrame: number | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeSpeechRecognition();
    }
  }

  get listening$(): Observable<boolean> {
    return this.isListening$.asObservable();
  }

  get interimText$(): Observable<string> {
    return this.interimTranscript$.asObservable();
  }

  get finalText$(): Observable<string> {
    return this.finalTranscript$.asObservable();
  }

  get volume$(): Observable<number> {
    return this.volumeLevel$.asObservable();
  }

  get error$(): Observable<string> {
    return this.error.asObservable();
  }

  private initializeSpeechRecognition(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Speech Recognition not supported on server');
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech Recognition not supported in this browser');
      this.error.next('Reconocimiento de voz no soportado en este navegador.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES';

    this.recognition.onstart = () => {
      this.isListening$.next(true);
      this.startVolumeAnalysis();
    };

    this.recognition.onend = () => {
      this.isListening$.next(false);
      this.stopVolumeAnalysis();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMsg = 'Error en el reconocimiento de voz.';
      if (event.error === 'no-speech') {
        errorMsg = 'No se detectó voz. Intenta hablar más claro.';
      } else if (event.error === 'audio-capture') {
        errorMsg = 'No se detectó micrófono. Verifique permisos.';
      } else if (event.error === 'not-allowed') {
        errorMsg = 'Permiso para micrófono denegado. Verifique configuración.';
      }
      this.error.next(errorMsg);
      this.isListening$.next(false);
      this.stopVolumeAnalysis();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        this.interimTranscript$.next(interimTranscript);
      }

      if (finalTranscript) {
        this.finalTranscript$.next(finalTranscript);
      }
    };
  }

  startListening(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Cannot start listening on server');
      return;
    }

    if (!this.recognition) {
      this.error.next('Reconocimiento de voz no disponible.');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.error.next('Error al iniciar el reconocimiento de voz. Verifique permisos de micrófono.');
    }
  }

  stopListening(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.recognition && this.isListening$.value) {
      this.recognition.stop();
    }
  }


  toggleListening(): void {
    if (this.isListening$.value) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

 private async startVolumeAnalysis(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Volume analysis not supported on server');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.microphone.connect(this.analyser);
      this.updateVolume();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.error.next('No se detectó micrófono. Verifique permisos.');
    }
  }

  private updateVolume(): void {
    if (!isPlatformBrowser(this.platformId) || !this.analyser || !this.dataArray) {
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    const sum = this.dataArray.reduce((acc: number, value: number) => acc + value, 0);
    const average = sum / this.dataArray.length;
    const normalizedVolume = Math.min(average / 128, 1);
    
    this.volumeLevel$.next(normalizedVolume);
    
    this.animationFrame = requestAnimationFrame(() => this.updateVolume());
  }

  private stopVolumeAnalysis(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.volumeLevel$.next(0);
  }

  isSupported(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  }
}