export interface AppearanceConfig {
  background_url: string;
  background_type: 'video' | 'image' | 'color';
  ui_opacity: number;
  bubble_color_mia: string;
  bubble_color_user: string;
  theme_hue: string;
}

export interface ProviderConfig {
  display_name: string;
  model_id: string;
  api_key: string;
  protocol: string;
  base_url: string;
  purpose: string;
  cost_label: string;
  is_active: boolean;
  is_default: boolean;
  latency: number;
  health_ok: number;
  health_fail: number;
}

export interface MIAConfig {
  bot_name: string;
  bot_age: number;
  bot_persona: string;
  appearance: AppearanceConfig;
  providers: Record<string, ProviderConfig>;
  tts_engine: string;
  openai_api_key?: string;
  elevenlabs_api_key?: string;
  elevenlabs_voice_id?: string;
}
