export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isInterim?: boolean;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute(params: any): Promise<any>;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface ElevenLabsRequest {
  text: string;
  model_id: string;
  voice_settings: VoiceSettings;
}