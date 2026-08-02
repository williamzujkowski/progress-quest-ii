import { describe, expect, it } from 'vitest';
import { soundFX } from '../../engine/audio';

describe('Web Audio Synthesizer', () => {
  it('toggles mute state correctly', () => {
    const initialMuted = soundFX.getMuted();
    const toggled = soundFX.toggleMute();
    expect(toggled).toBe(!initialMuted);

    const toggledBack = soundFX.toggleMute();
    expect(toggledBack).toBe(initialMuted);
  });

  it('safely handles audio triggers when muted or unmuted without throwing errors', () => {
    expect(() => soundFX.playLevelUp()).not.toThrow();
    expect(() => soundFX.playQuestComplete()).not.toThrow();
    expect(() => soundFX.playSellLoot()).not.toThrow();
  });
});
