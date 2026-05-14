const DEFAULT_MASTER_VOLUME = 0.28;
const STORAGE_KEY = 'tavlaSoundMuted';

export const DEFAULT_SOUND_FILES = {
  roll: 'assets/sounds/dice-roll.mp3',
  move: 'assets/sounds/checker-move.mp3',
  hit: 'assets/sounds/checker-hit.mp3',
  special: 'assets/sounds/special-roll.mp3',
  win: 'assets/sounds/win.mp3',
  lastChance: 'assets/sounds/last-chance.mp3',
};

const FALLBACK_TONES = {
  roll: { frequency: 180, type: 'sine', duration: 0.16, peak: 0.07 },
  move: { frequency: 330, type: 'sine', duration: 0.25, peak: 0.055 },
  hit: { frequency: 120, type: 'sawtooth', duration: 0.25, peak: 0.09 },
  win: { frequency: 520, type: 'sine', duration: 0.30, peak: 0.065, rampTo: 880 },
  click: { frequency: 260, type: 'sine', duration: 0.20, peak: 0.045 },
  swap: { frequency: 95, type: 'sawtooth', duration: 0.25, peak: 0.08 },
  special: { frequency: 420, type: 'triangle', duration: 0.28, peak: 0.052, rampTo: 700 },
  lastChance: { frequency: 150, type: 'triangle', duration: 0.32, peak: 0.055, rampTo: 210 },
};

function readMutedPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function writeMutedPreference(muted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
  } catch (e) {
    // Sound preferences are optional; private browsing/storage failures should not affect gameplay.
  }
}

export function createSoundManager({ files = DEFAULT_SOUND_FILES, masterVolume = DEFAULT_MASTER_VOLUME } = {}) {
  let audioCtx = null;
  let muted = readMutedPreference();
  const buffers = new Map();
  const failedFiles = new Set();

  function isMuted() {
    return muted;
  }

  function setMuted(nextMuted) {
    muted = !!nextMuted;
    writeMutedPreference(muted);
    return muted;
  }

  function toggleMuted() {
    return setMuted(!muted);
  }

  function getAudioContext() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  async function loadBuffer(type) {
    const url = files[type];
    if (!url || buffers.has(type) || failedFiles.has(type)) return buffers.get(type) || null;
    try {
      const ctx = getAudioContext();
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data);
      buffers.set(type, buffer);
      return buffer;
    } catch (e) {
      failedFiles.add(type);
      return null;
    }
  }

  function playFallback(type) {
    const tone = FALLBACK_TONES[type] || FALLBACK_TONES.click;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const peak = tone.peak * masterVolume;
      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      if (tone.rampTo) oscillator.frequency.exponentialRampToValueAtTime(tone.rampTo, now + tone.duration * 0.75);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + tone.duration + 0.05);
    } catch (e) {
      // Audio is enhancement-only. Never interrupt gameplay if the browser blocks or lacks Web Audio.
    }
  }

  async function playFile(type) {
    const buffer = await loadBuffer(type);
    if (!buffer || muted) return false;
    try {
      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = masterVolume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      return true;
    } catch (e) {
      failedFiles.add(type);
      return false;
    }
  }

  function play(type = 'move') {
    if (muted) return;
    if (files[type]) {
      playFile(type).then(played => {
        if (!played && !muted) playFallback(type);
      });
      return;
    }
    playFallback(type);
  }

  function preload(types = Object.keys(files)) {
    if (muted) return;
    types.forEach(type => loadBuffer(type));
  }

  return {
    isMuted,
    setMuted,
    toggleMuted,
    play,
    preload,
  };
}
