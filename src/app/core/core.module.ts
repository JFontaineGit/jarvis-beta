import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { SpeechService } from './services/speech.service';
import { ApiService } from './services/api.service';
import { OpenRouterService } from './services/openrouter.service';
import { ElevenLabsService } from './services/elevenlabs.service';
import { IntentRouterService } from './services/intent-router.service';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers: [
    SpeechService,
    ApiService,
    OpenRouterService,
    ElevenLabsService,
    IntentRouterService
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in the AppModule only');
    }
  }
}