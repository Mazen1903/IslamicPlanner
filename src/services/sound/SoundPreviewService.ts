import { Platform } from 'react-native';

export interface SoundPlaybackState {
  isPlaying: boolean;
  activeSoundId: string | null;
}

type StateListener = (state: SoundPlaybackState) => void;

class SoundPreviewService {
  private activeSoundId: string | null = null;
  private isPlaying = false;
  private listeners = new Set<StateListener>();
  private audioPlayer: any = null;

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ isPlaying: this.isPlaying, activeSoundId: this.activeSoundId });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ isPlaying: this.isPlaying, activeSoundId: this.activeSoundId });
    }
  }

  async playPreview(soundId: string, customUri?: string): Promise<void> {
    await this.stopPreview();

    this.activeSoundId = soundId;
    this.isPlaying = true;
    this.notify();

    try {
      // In native environments with expo-audio installed dynamically or mock
      // Try loading native audio player if available
      try {
        let expoAudio: any = null;
        try {
          // Dynamic evaluation avoids static bundler/TypeScript resolution errors when module is not present
          const req = typeof require !== 'undefined' ? require : null;
          if (req) {
            expoAudio = req('expo-audio');
          }
        } catch {
          // Module not present at runtime
        }
        if (expoAudio && expoAudio.createAudioPlayer) {
          const source = customUri ? { uri: customUri } : undefined;
          if (source) {
            this.audioPlayer = expoAudio.createAudioPlayer(source);
            this.audioPlayer.play();
          }
        }
      } catch {
        // Fallback or testing mock
      }

      // Simulate preview duration for UI feedback if native player doesn't manage lifecycle
      setTimeout(() => {
        if (this.activeSoundId === soundId) {
          this.stopPreview();
        }
      }, 3500);
    } catch {
      this.stopPreview();
    }
  }

  async stopPreview(): Promise<void> {
    if (this.audioPlayer) {
      try {
        if (typeof this.audioPlayer.pause === 'function') {
          this.audioPlayer.pause();
        }
        if (typeof this.audioPlayer.release === 'function') {
          this.audioPlayer.release();
        }
      } catch {
        // Safe cleanup
      }
      this.audioPlayer = null;
    }

    this.isPlaying = false;
    this.activeSoundId = null;
    this.notify();
  }

  getCurrentState(): SoundPlaybackState {
    return {
      isPlaying: this.isPlaying,
      activeSoundId: this.activeSoundId,
    };
  }
}

export const soundPreviewService = new SoundPreviewService();
