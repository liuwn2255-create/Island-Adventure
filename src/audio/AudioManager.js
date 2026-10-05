import { AUDIO_CONFIG, SFX_NAMES } from './audioConfig.js';

const MUSIC_NOTES = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
const SFX_NOTES = Object.freeze({
  collect: [880],
  discover: [523.25, 659.25, 783.99],
  openGuide: [440, 554.37],
  questComplete: [523.25, 659.25, 783.99, 1046.5],
  badgeUnlock: [659.25, 783.99, 987.77, 1318.51],
});

/** Owns all generated audio and exposes channels independently of gameplay systems. */
export class AudioManager {
  constructor({ app, config = AUDIO_CONFIG } = {}) {
    this.app = app;
    if (this.app) this.app.dataset.audioReady = 'false';
    this.config = config;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.environmentGain = null;
    this.sfxGain = null;
    this.volumes = { ...config.defaultVolumes };
    this.isMuted = false;
    this.musicRequested = false;
    this.environmentRequested = false;
    this.musicTimer = null;
    this.musicIndex = 0;
    this.environmentNodes = [];
    this.pendingSfx = [];
    this.activeVoices = new Set();
    this.lastSfxAt = new Map();
    this.isDisposed = false;

  }

  mount() {
    if (this.button || !this.app) return;
    this.button = document.createElement('button');
    this.button.className = 'audio-toggle';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', '靜音');
    this.button.setAttribute('aria-pressed', 'false');
    this.button.dataset.audioReady = 'false';
    this.button.title = '靜音';
    this.button.textContent = '🔊';
    this.onToggleMute = () => {
      this.toggleMute();
    };
    this.button.addEventListener('click', this.onToggleMute);
    this.updateButton();
    // Keep the global control outside #app so route-level replaceChildren() calls
    // cannot detach it when the active theme changes.
    const mountTarget = this.app.ownerDocument?.body ?? this.app;
    mountTarget.append(this.button);
  }

  async activate() {
    if (this.isDisposed) return false;
    try {
      this.ensureContext();
      if (this.context.state !== 'running') await this.context.resume();
      if (this.context.state !== 'running') return false;
      if (this.button) this.button.dataset.audioReady = 'true';
      if (this.app) this.app.dataset.audioReady = 'true';
      this.applyVolumes();
      if (this.isMuted) return true;
      if (this.musicRequested) this.scheduleMusicNote();
      if (this.environmentRequested && this.environmentNodes.length === 0) this.startEnvironmentNodes();
      const queued = this.pendingSfx.splice(0);
      for (const name of queued) this.renderSfx(name);
      return true;
    } catch {
      // Browsers can reject resume outside a user gesture; audio stays unavailable without an error.
      return false;
    }
  }

  ensureContext() {
    if (this.context) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API is unavailable');
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.environmentGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain.connect(this.masterGain);
    this.environmentGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    this.applyVolumes();
  }

  startGameAudio() {
    this.playMusic();
    this.playEnvironment();
    void this.activate();
  }

  playMusic() {
    this.musicRequested = true;
    if (this.isMuted) return;
    if (this.context?.state === 'running') this.scheduleMusicNote();
    else void this.activate();
  }

  scheduleMusicNote() {
    if (this.isMuted || !this.musicRequested || !this.context || this.context.state !== 'running' || this.musicTimer !== null) return;
    const frequency = MUSIC_NOTES[this.musicIndex % MUSIC_NOTES.length];
    this.musicIndex += 1;
    this.playEnvelope(this.musicGain, frequency, this.context.currentTime, 2.7, 0.11, 'sine');
    this.musicTimer = window.setTimeout(() => {
      this.musicTimer = null;
      this.scheduleMusicNote();
    }, 3100);
  }

  stopMusic() {
    this.musicRequested = false;
    window.clearTimeout(this.musicTimer);
    this.musicTimer = null;
    for (const voice of [...this.activeVoices]) {
      if (voice.channel === this.musicGain) this.stopVoice(voice);
    }
  }

  playEnvironment() {
    this.environmentRequested = true;
    if (this.isMuted) return;
    if (this.context?.state === 'running' && this.environmentNodes.length === 0) this.startEnvironmentNodes();
    else if (!this.context || this.context.state !== 'running') void this.activate();
  }

  startEnvironmentNodes() {
    if (this.isMuted || !this.context || this.environmentNodes.length > 0) return;
    const sampleRate = this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(1, sampleRate * 2, sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;

    const wind = this.context.createBufferSource();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    const windFilter = this.context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 360;
    const windGain = this.context.createGain();
    windGain.gain.value = 0.12;
    wind.connect(windFilter).connect(windGain).connect(this.environmentGain);
    wind.start();

    const surf = this.context.createBufferSource();
    surf.buffer = noiseBuffer;
    surf.loop = true;
    const surfFilter = this.context.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.value = 740;
    const surfGain = this.context.createGain();
    surfGain.gain.value = 0.035;
    const swell = this.context.createOscillator();
    const swellDepth = this.context.createGain();
    swell.frequency.value = 0.12;
    swellDepth.gain.value = 0.018;
    swell.connect(swellDepth).connect(surfGain.gain);
    surf.connect(surfFilter).connect(surfGain).connect(this.environmentGain);
    surf.start();
    swell.start();
    this.environmentNodes.push(wind, surf, swell);
  }

  stopEnvironment() {
    this.environmentRequested = false;
    this.stopEnvironmentNodes();
  }

  stopEnvironmentNodes() {
    for (const node of this.environmentNodes) {
      try { node.stop(); } catch { /* already stopped */ }
      node.disconnect();
    }
    this.environmentNodes = [];
  }

  playSfx(name) {
    if (!SFX_NAMES.includes(name) || this.isDisposed || this.isMuted) return false;
    const now = performance.now();
    if (now - (this.lastSfxAt.get(name) ?? -Infinity) < 90) return false;
    this.lastSfxAt.set(name, now);
    if (!this.context || this.context.state !== 'running') {
      if (this.pendingSfx.length < SFX_NAMES.length && !this.pendingSfx.includes(name)) this.pendingSfx.push(name);
      void this.activate();
      return true;
    }
    this.renderSfx(name);
    return true;
  }

  renderSfx(name) {
    const notes = SFX_NOTES[name];
    if (!notes || !this.context || this.context.state !== 'running') return;
    const spacing = name === 'collect' ? 0 : 0.105;
    notes.forEach((frequency, index) => {
      this.playEnvelope(this.sfxGain, frequency, this.context.currentTime + index * spacing, 0.24, 0.2, 'triangle');
    });
  }

  playEnvelope(channel, frequency, startAt, duration, peak, waveform) {
    if (!this.context || !channel || this.activeVoices.size >= 24) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope).connect(channel);
    const voice = { oscillator, envelope, channel };
    this.activeVoices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.activeVoices.delete(voice);
    };
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  stopVoice(voice) {
    try { voice.oscillator.stop(); } catch { /* already stopped */ }
    voice.oscillator.disconnect();
    voice.envelope.disconnect();
    this.activeVoices.delete(voice);
  }

  setMasterVolume(volume) { this.setVolume('master', volume); }
  setMusicVolume(volume) { this.setVolume('music', volume); }
  setEnvironmentVolume(volume) { this.setVolume('environment', volume); }
  setSfxVolume(volume) { this.setVolume('sfx', volume); }

  setVolume(channel, volume) {
    if (!(channel in this.volumes) || !Number.isFinite(volume)) return;
    this.volumes[channel] = Math.max(0, Math.min(1, volume));
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumes.master, now);
    this.musicGain.gain.setTargetAtTime(this.volumes.music, now, 0.025);
    this.environmentGain.gain.setTargetAtTime(this.volumes.environment, now, 0.025);
    this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, now, 0.025);
  }

  mute() {
    this.setMuted(true);
  }

  unmute() {
    this.setMuted(false);
  }

  setMuted(value) {
    const nextMuted = Boolean(value);
    if (this.isMuted === nextMuted) return this.isMuted;
    this.isMuted = nextMuted;
    if (this.isMuted) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
      this.pendingSfx.length = 0;
      for (const voice of [...this.activeVoices]) this.stopVoice(voice);
      this.stopEnvironmentNodes();
    }
    this.applyVolumes();
    this.updateButton();
    if (!this.isMuted) void this.activate();
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  updateButton() {
    if (!this.button) return;
    const icon = this.isMuted ? '🔇' : '🔊';
    const label = this.isMuted ? '取消靜音' : '靜音';
    this.button.textContent = icon;
    this.button.setAttribute('aria-label', label);
    this.button.setAttribute('aria-pressed', String(this.isMuted));
    this.button.title = label;
  }

  getAudioState() {
    return {
      isMuted: this.isMuted,
      contextState: this.context?.state ?? 'uninitialized',
      masterGain: this.masterGain?.gain.value ?? null,
      musicRequested: this.musicRequested,
      environmentRequested: this.environmentRequested,
      activeVoices: this.activeVoices.size,
      environmentNodes: this.environmentNodes.length,
      musicTimerScheduled: this.musicTimer !== null,
      pendingSfx: this.pendingSfx.length,
    };
  }

  dispose() {
    this.isDisposed = true;
    this.stopMusic();
    this.stopEnvironment();
    for (const voice of [...this.activeVoices]) this.stopVoice(voice);
    this.button?.removeEventListener('click', this.onToggleMute);
    this.button?.remove();
    void this.context?.close().catch(() => {});
  }
}
