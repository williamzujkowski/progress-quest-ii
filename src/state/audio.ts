// Web Audio API Synthesizer (Ponytail: native browser API, zero audio file dependencies)

import { diagnostics } from './diagnostics';

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
export type AudioFailureCode = 'audio_unsupported' | 'audio_initialize_failed' | 'audio_resume_failed' | 'audio_play_failed';
export interface AudioFailure {
  code: AudioFailureCode;
  operation: 'initialize' | 'resume' | 'play';
  error?: unknown;
}
type AudioFailureResult = { ok: false; code: AudioFailureCode; message: string };
export type AudioResult = { ok: true } | AudioFailureResult;

const AUDIO_FAILURE_MESSAGE = 'Sound effects are unavailable. Questing will continue in dignified silence.';

function createBrowserAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  return AudioCtx ? new AudioCtx() : null;
}

function recordAudioFailure({ code, operation, error }: AudioFailure): void {
  diagnostics.record({ code, severity: 'warning', subsystem: 'audio', operation, outcome: 'failed', source: 'audio-engine', error });
}

export class SoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private readonly reportedFailures = new Set<AudioFailureCode>();
  private readonly listeners = new Set<(message: string) => void>();
  private readonly contextFactory: () => AudioContext | null;
  private readonly reportFailure: (failure: AudioFailure) => void;

  public constructor(
    contextFactory: () => AudioContext | null = createBrowserAudioContext,
    reportFailure: (failure: AudioFailure) => void = recordAudioFailure,
  ) {
    this.contextFactory = contextFactory;
    this.reportFailure = reportFailure;
  }

  private fail(failure: AudioFailure): AudioFailureResult {
    this.isMuted = true;
    if (!this.reportedFailures.has(failure.code)) {
      this.reportedFailures.add(failure.code);
      this.reportFailure(failure);
    }
    for (const listener of this.listeners) listener(AUDIO_FAILURE_MESSAGE);
    return { ok: false, code: failure.code, message: AUDIO_FAILURE_MESSAGE };
  }

  private async readyContext(): Promise<{ ok: true; context: AudioContext } | AudioFailureResult> {
    try {
      this.ctx ??= this.contextFactory();
    } catch (error) {
      return this.fail({ code: 'audio_initialize_failed', operation: 'initialize', error });
    }
    if (!this.ctx) return this.fail({ code: 'audio_unsupported', operation: 'initialize' });
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (error) {
        return this.fail({ code: 'audio_resume_failed', operation: 'resume', error });
      }
    }
    return { ok: true, context: this.ctx };
  }

  private async play(effect: (context: AudioContext) => void): Promise<AudioResult> {
    if (this.isMuted) return { ok: true };
    const ready = await this.readyContext();
    if (!ready.ok) return ready;
    try {
      effect(ready.context);
      return { ok: true };
    } catch (error) {
      return this.fail({ code: 'audio_play_failed', operation: 'play', error });
    }
  }

  private probePlayback(context: AudioContext): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.001);
  }

  public subscribe(listener: (message: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async prepare(): Promise<AudioResult> {
    const ready = await this.readyContext();
    if (!ready.ok) return ready;
    try {
      this.probePlayback(ready.context);
      return { ok: true };
    } catch (error) {
      return this.fail({ code: 'audio_play_failed', operation: 'play', error });
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playLevelUp(): Promise<AudioResult> {
    return this.play((ctx) => {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
      });
    });
  }

  public playQuestComplete(): Promise<AudioResult> {
    return this.play((ctx) => {
      const notes = [440, 554.37, 659.25]; // A4, C#5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
      });
    });
  }

  public playSellLoot(): Promise<AudioResult> {
    return this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.06); // E6

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    });
  }
}

export const soundFX = new SoundFX();
