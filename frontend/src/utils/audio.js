// Procedural Space Synth Sound Effects (Native Web Audio API)
let audioCtx = null;
let isMuted = localStorage.getItem('nebula_sfx_muted') !== 'false'; // default to muted for respectful UX

function getAudioContext() {
  if (isMuted) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const audioSystem = {
  getMuteState: () => isMuted,
  setMuted: (muted) => {
    isMuted = muted;
    localStorage.setItem('nebula_sfx_muted', muted ? 'true' : 'false');
    if (!muted) {
      // Warm startup chime when unmuting
      setTimeout(() => {
        audioSystem.playSuccess();
      }, 50);
    }
  },

  // Soft high-frequency click for hover interactions
  playTick: () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },

  // Deep soft pop for button hovers
  playPop: () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  },

  // Celestial major chord chime for successes or action completes
  playSuccess: () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Harmonic resonance)
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = idx * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  },

  // Pitch-rising space engine spool up for "Nebula Warp" (1.4 seconds duration)
  playWarp: () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 1.4;

    // 1. Base engine tone (spooling triangle wave)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + duration);

    // Filter to sweep with the pitch for a juicy lowpass resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.Q.setValueAtTime(8, now);
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + duration);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + duration * 0.45);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);

    // 2. High sparkle sine glide overlay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, now);
    osc2.frequency.exponentialRampToValueAtTime(2200, now + duration);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.05, now + duration * 0.5);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    // Start synthesizers
    osc1.start(now);
    osc1.stop(now + duration + 0.1);
    
    osc2.start(now);
    osc2.stop(now + duration + 0.1);
  }
};
