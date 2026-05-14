const DEFAULT_MASTER_VOLUME = 0.28;
const STORAGE_KEY = 'tavlaSoundMuted';

export const DEFAULT_SOUND_FILES = {
  roll: {
    variants: [
      'assets/sounds/dice-roll-1.mp3',
      'assets/sounds/dice-roll-2.mp3',
      'assets/sounds/dice-roll-3.mp3',
    ],
    fallback: 'assets/sounds/dice-roll.mp3',
  },
  move: 'assets/sounds/checker-move.mp3',
  hit: 'assets/sounds/checker-hit.mp3',
  special: 'assets/sounds/special-roll.mp3',
  win: 'assets/sounds/win.mp3',
  lastChance: 'assets/sounds/last-chance.mp3',
};

let soundPickCounter = 0;

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

function soundConfigUrls(config) {
  if (!config) return [];
  if (typeof config === 'string') return [config];
  if (Array.isArray(config)) return config;
  return [...(config.variants || []), ...(config.fallback ? [config.fallback] : [])];
}

function randomIndex(length) {
  if (length <= 1) return 0;
  if (window.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(1);
    window.crypto.getRandomValues(randomValues);
    return randomValues[0] % length;
  }
  soundPickCounter += 1;
  return (Date.now() + soundPickCounter) % length;
}

function pickSoundUrl(config) {
  const urls = soundConfigUrls(config);
  return urls[randomIndex(urls.length)] || null;
}

function pickLoadedSoundUrl(config, buffers) {
  const urls = soundConfigUrls(config).filter(url => buffers.has(url));
  return urls[randomIndex(urls.length)] || null;
}

export function createSoundManager({ files = DEFAULT_SOUND_FILES, masterVolume = DEFAULT_MASTER_VOLUME } = {}) {
  let audioCtx = null;
  let muted = readMutedPreference();
  const buffers = new Map();
  const failedFiles = new Set();
  const pendingLoads = new Map();

  function isMuted() {
    return muted;
  }

  function setMuted(nextMuted) {
    muted = !!nextMuted;
    writeMutedPreference(muted);
    if (!muted) preload(['roll']);
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

  async function loadBufferFromUrl(url) {
    if (!url || buffers.has(url) || failedFiles.has(url)) return buffers.get(url) || null;
    if (pendingLoads.has(url)) return pendingLoads.get(url);

    const loadPromise = (async () => {
      try {
        const ctx = getAudioContext();
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(data);
        buffers.set(url, buffer);
        return buffer;
      } catch (e) {
        failedFiles.add(url);
        return null;
      } finally {
        pendingLoads.delete(url);
      }
    })();

    pendingLoads.set(url, loadPromise);
    return loadPromise;
  }

  function preload(types = Object.keys(files)) {
    if (muted) return;
    try {
      getAudioContext();
    } catch (e) {
      return;
    }
    types.forEach(type => soundConfigUrls(files[type]).forEach(url => loadBufferFromUrl(url)));
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

  function playBuffer(url) {
    const buffer = buffers.get(url);
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
      failedFiles.add(url);
      buffers.delete(url);
      return false;
    }
  }

  function playFile(type) {
    const config = files[type];
    const preferredUrl = pickSoundUrl(config);
    if (playBuffer(preferredUrl)) return true;

    const loadedUrl = pickLoadedSoundUrl(config, buffers);
    if (playBuffer(loadedUrl)) return true;

    preload([type]);
    return false;
  }

  function play(type = 'move') {
    if (muted) return;
    if (files[type]) {
      const played = playFile(type);
      if (!played && !muted) playFallback(type);
      return;
    }
    playFallback(type);
  }

  return {
    isMuted,
    setMuted,
    toggleMuted,
    play,
    preload,
  };
}
