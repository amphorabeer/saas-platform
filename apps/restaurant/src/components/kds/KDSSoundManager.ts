/**
 * Web Audio API sound utility for KDS.
 * No mp3 files — simple oscillator beeps.
 */

export type SoundType = 'newOrder' | 'ready' | 'alert';

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (Ctx) audioContext = new Ctx();
  }
  return audioContext;
}

export function playSound(type: SoundType): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.25;
    if (type === 'newOrder') {
      osc.frequency.value = 800;
      osc.type = 'sine';
    } else if (type === 'ready') {
      osc.frequency.value = 600;
      osc.type = 'sine';
    } else {
      osc.frequency.value = 400;
      osc.type = 'sawtooth';
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (type === 'alert' ? 0.4 : 0.2));
  } catch {
    // ignore
  }
}
