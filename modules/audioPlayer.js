/**
 * audioPlayer.js - Web Audio API sound synthesis with reverb
 * 16 sound presets optimized for small speakers (laptop/phone)
 *
 * Key technique: "Psychoacoustic bass" - low notes use harmonics
 * to create perceived pitch without actual bass frequencies that
 * small speakers can't reproduce. All sounds use harmonic enhancement
 * for consistent volume across the frequency range.
 */
(function() {
  'use strict';

  let audioContext = null;
  let masterGain = null;
  let dryGain = null;
  let wetGain = null;
  let reverbNode = null;
  let currentSoundMode = 'none';

  // Minimum playback frequency - below this we use harmonics only
  const MIN_SPEAKER_FREQ = 200;

  // Create algorithmic reverb impulse response
  function createReverbNode(ctx) {
    const convolver = ctx.createConvolver();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2.0; // 2s reverb tail
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with random reflections
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  // Initialize audio context (lazy, on first user interaction)
  function init() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Master gain
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.4;

      // Dry/wet routing for reverb
      dryGain = audioContext.createGain();
      wetGain = audioContext.createGain();
      dryGain.gain.value = 0.65;
      wetGain.gain.value = 0.35;

      reverbNode = createReverbNode(audioContext);

      // Routing: master -> dry -> destination
      //          master -> reverb -> wet -> destination
      masterGain.connect(dryGain);
      masterGain.connect(reverbNode);
      reverbNode.connect(wetGain);
      dryGain.connect(audioContext.destination);
      wetGain.connect(audioContext.destination);
    }

    // Resume if suspended (iOS requirement)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  /**
   * Frequency compensation for small speakers
   * Returns adjusted frequency and gain boost for low notes
   * Uses psychoacoustic principle: harmonics create perceived fundamental
   */
  function compensateFrequency(freq) {
    if (freq >= MIN_SPEAKER_FREQ) {
      return { freq, gainBoost: 1.0, useHarmonics: false };
    }

    // For low frequencies, calculate how much to boost
    // and whether to shift to harmonics
    const ratio = freq / MIN_SPEAKER_FREQ;
    const gainBoost = 1.0 + (1.0 - ratio) * 0.5; // Up to 1.5x boost

    return {
      freq,
      gainBoost: Math.min(gainBoost, 1.5),
      useHarmonics: freq < 120 // Very low notes need harmonic enhancement
    };
  }

  /**
   * Create harmonic-enhanced oscillator for low frequency clarity
   * Adds 2nd and 3rd harmonics to make low notes audible on small speakers
   */
  function createHarmonicOsc(ctx, baseFreq, destination, gainValue, duration) {
    const now = ctx.currentTime;
    const comp = compensateFrequency(baseFreq);

    // Harmonic mix ratios (fundamental, 2nd, 3rd, 4th)
    // For low notes: reduce fundamental, boost harmonics
    let harmonics;
    if (comp.useHarmonics) {
      harmonics = [
        { ratio: 1, gain: 0.3 },   // Reduced fundamental
        { ratio: 2, gain: 0.5 },   // Strong 2nd harmonic (octave up)
        { ratio: 3, gain: 0.35 },  // 3rd harmonic
        { ratio: 4, gain: 0.2 }    // 4th harmonic
      ];
    } else if (baseFreq < MIN_SPEAKER_FREQ) {
      harmonics = [
        { ratio: 1, gain: 0.5 },
        { ratio: 2, gain: 0.35 },
        { ratio: 3, gain: 0.2 }
      ];
    } else {
      harmonics = [
        { ratio: 1, gain: 0.7 },
        { ratio: 2, gain: 0.2 },
        { ratio: 3, gain: 0.1 }
      ];
    }

    const masterOscGain = ctx.createGain();
    masterOscGain.gain.setValueAtTime(gainValue * comp.gainBoost, now);
    masterOscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    masterOscGain.connect(destination);

    harmonics.forEach(h => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * h.ratio;
      oscGain.gain.value = h.gain;
      osc.connect(oscGain);
      oscGain.connect(masterOscGain);
      osc.start(now);
      osc.stop(now + duration);
    });

    return masterOscGain;
  }

  // Sound generators - all optimized for small speakers
  const soundGenerators = {

    // === ORIGINAL 6 SOUNDS (enhanced) ===

    // Soft Bell - meditation bell with harmonic clarity
    softBell: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4 * comp.gainBoost, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.6);
      gain.connect(destination);

      // Bell harmonics (inharmonic for realistic bell sound)
      const bellHarmonics = [1, 2.0, 3.0, 4.2, 5.4];
      bellHarmonics.forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        // Shift very low frequencies up
        const f = Math.max(frequency * ratio, MIN_SPEAKER_FREQ * 0.8);
        osc.frequency.value = f;
        oscGain.gain.value = 0.3 / (i + 1);
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 1.6);
      });
    },

    // Marimba - wooden mallet, warm tone
    marimba: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);

      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.value = Math.max(frequency * 5, 800);
      filter.Q.value = 0.8;

      gain.gain.setValueAtTime(0.5 * comp.gainBoost, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      filter.connect(gain);
      gain.connect(destination);

      // Marimba uses triangle wave with harmonics
      [1, 2, 3].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = Math.max(frequency * ratio, 100);
        oscGain.gain.value = (i === 0 ? 0.6 : 0.25) / (i + 1);
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    },

    // Vibes - metallic vibraphone shimmer
    vibes: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const baseFreq = Math.max(frequency, 100);

      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.value = baseFreq;

      modulator.type = 'sine';
      modulator.frequency.value = baseFreq * 3.5;
      modGain.gain.value = baseFreq * 1.2;

      gain.gain.setValueAtTime(0.35 * comp.gainBoost, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gain);
      gain.connect(destination);

      // Add octave-up harmonic for low note clarity
      if (frequency < MIN_SPEAKER_FREQ) {
        const harm = ctx.createOscillator();
        const harmGain = ctx.createGain();
        harm.type = 'sine';
        harm.frequency.value = frequency * 2;
        harmGain.gain.value = 0.25;
        harm.connect(harmGain);
        harmGain.connect(gain);
        harm.start(now);
        harm.stop(now + 1.2);
      }

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + 1.2);
      modulator.stop(now + 1.2);
    },

    // Glass - crystalline shimmer
    glass: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Glass harmonics (high partials for shimmer)
      const ratios = [1, 2.4, 4.1, 5.9, 7.2];
      ratios.forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = Math.max(frequency * ratio, 200);
        oscGain.gain.value = (0.3 / (i + 1)) * comp.gainBoost;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 0.9);
      });

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      gain.connect(destination);
    },

    // Pluck - nylon string
    pluck: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const effectiveFreq = Math.max(frequency, 80);

      const bufferSize = Math.round(ctx.sampleRate / effectiveFreq);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize * 0.4);
      }

      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;

      filter.type = 'lowpass';
      filter.frequency.value = Math.max(frequency * 4, 600);
      filter.Q.value = 0.4;

      gain.gain.setValueAtTime(0.5 * comp.gainBoost, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      source.start(now);
      source.stop(now + 0.6);
    },

    // Chime - wind chime
    chime: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Detuned oscillators for shimmer
      [-6, -2, 2, 6].forEach(detune => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = Math.max(frequency, 150);
        osc.detune.value = detune;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 1.8);
      });

      // Add harmonic for low note clarity
      if (frequency < MIN_SPEAKER_FREQ) {
        const harm = ctx.createOscillator();
        harm.type = 'sine';
        harm.frequency.value = frequency * 2;
        harm.connect(gain);
        harm.start(now);
        harm.stop(now + 1.8);
      }

      gain.gain.setValueAtTime(0.25 * comp.gainBoost, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);
      gain.connect(destination);
    },

    // === 10 NEW SOUNDS ===

    // Kalimba - African thumb piano, bright and clear
    kalimba: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Kalimba has strong fundamental and quick decay
      const harmonics = [1, 2, 3, 5.2, 6.3];
      harmonics.forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = Math.max(frequency * ratio, 180);
        // Quick attack, medium decay
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime((0.4 / (i + 1)) * comp.gainBoost, now + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8 - i * 0.1);
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 0.8);
      });

      gain.connect(destination);
    },

    // Glockenspiel - bright orchestral bells
    glockenspiel: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Glockenspiel: bright, metallic, high harmonics
      // Use harmonics for brightness instead of octave jump
      const baseFreq = frequency;

      [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * ratio;
        oscGain.gain.value = (0.35 / (i + 1)) * comp.gainBoost;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 1.0);
      });

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      gain.connect(destination);
    },

    // Harp - plucked string with resonance
    harp: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.max(frequency * 8, 1000), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(frequency * 2, 400), now + 1.5);
      filter.Q.value = 0.5;

      // Harp harmonics - decaying series
      [1, 2, 3, 4, 5, 6].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = Math.max(frequency * ratio, 100);
        oscGain.gain.value = (0.35 / (i + 1)) * comp.gainBoost;
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        osc.stop(now + 1.5);
      });

      filter.connect(gain);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      gain.connect(destination);
    },

    // Flute - soft wind tone
    flute: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const baseFreq = Math.max(frequency, 200);

      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = baseFreq;
      filter.Q.value = 2;

      // Breathy attack with noise
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      noise.buffer = noiseBuffer;
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      noise.connect(noiseGain);
      noiseGain.connect(filter);
      noise.start(now);

      // Main tone - mostly fundamental
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = baseFreq;
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.4 * comp.gainBoost, now + 0.08);
      oscGain.gain.setValueAtTime(0.35 * comp.gainBoost, now + 0.15);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start(now);
      osc.stop(now + 1.0);

      // Slight octave for low notes
      if (frequency < MIN_SPEAKER_FREQ) {
        const harm = ctx.createOscillator();
        const harmGain = ctx.createGain();
        harm.type = 'sine';
        harm.frequency.value = frequency * 2;
        harmGain.gain.value = 0.2;
        harm.connect(harmGain);
        harmGain.connect(gain);
        harm.start(now);
        harm.stop(now + 1.0);
      }

      filter.connect(gain);
      gain.connect(destination);
    },

    // Pad - sustained synth, ambient
    pad: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.value = Math.max(frequency * 3, 500);
      filter.Q.value = 0.7;

      // Detuned oscillators for richness
      [-7, -3, 0, 3, 7].forEach(detune => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = Math.max(frequency, 100);
        osc.detune.value = detune;
        oscGain.gain.value = 0.1 * comp.gainBoost;
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        osc.stop(now + 1.5);
      });

      filter.connect(gain);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
      gain.gain.setValueAtTime(0.3, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      gain.connect(destination);
    },

    // Celesta - orchestral bell keyboard
    celesta: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Celesta: piano-like attack with bell harmonics
      // Use harmonics for clarity instead of octave jump
      const baseFreq = frequency;

      [1, 2.0, 3.0, 4.0, 5.0].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * ratio;
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime((0.3 / (i + 1)) * comp.gainBoost, now + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2 - i * 0.15);
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 1.2);
      });

      gain.connect(destination);
    },

    // Music Box - delicate, mechanical
    musicBox: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Music box: high pitched, quick decay, slightly metallic
      // Use higher harmonic ratios for brightness instead of octave jump
      const baseFreq = frequency;

      [1, 2.5, 4.0].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * ratio;
        oscGain.gain.value = (0.4 / (i + 1)) * comp.gainBoost;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 0.7);
      });

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      gain.connect(destination);
    },

    // Steel Drum - Caribbean pan
    steelDrum: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Steel drum: inharmonic overtones, quick attack
      const drumHarmonics = [1, 2.0, 2.4, 3.2, 4.1, 5.18];
      drumHarmonics.forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = Math.max(frequency * ratio, 150);
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime((0.35 / (i + 1)) * comp.gainBoost, now + 0.005);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8 - i * 0.08);
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 0.8);
      });

      gain.connect(destination);
    },

    // Bowls - Tibetan singing bowl
    bowls: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();

      // Singing bowl: slow attack, long sustain, beating frequencies
      const baseFreq = Math.max(frequency, 120);

      // Main tone with subtle beating
      [0, 1.5, -1.5].forEach(detune => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = baseFreq;
        osc.detune.value = detune;
        oscGain.gain.value = 0.25 * comp.gainBoost;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 2.5);
      });

      // Harmonics
      [2, 3, 4.2].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * ratio;
        oscGain.gain.value = (0.15 / (i + 1)) * comp.gainBoost;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(now);
        osc.stop(now + 2.5);
      });

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
      gain.gain.setValueAtTime(0.35, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
      gain.connect(destination);
    },

    // Woodblock - percussive, pitched
    woodblock: (ctx, frequency, destination) => {
      const now = ctx.currentTime;
      const comp = compensateFrequency(frequency);
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Woodblock: very short, percussive
      const baseFreq = Math.max(frequency, 200);

      filter.type = 'bandpass';
      filter.frequency.value = baseFreq * 2;
      filter.Q.value = 10;

      // Noise burst through resonant filter
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      // Pitched component
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = baseFreq;
      oscGain.gain.value = 0.4 * comp.gainBoost;
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start(now);
      osc.stop(now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      noise.start(now);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      gain.connect(destination);
    }
  };

  // Convert note name and octave to frequency
  function noteToFrequency(noteName, octave) {
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = NOTES.indexOf(noteName);
    if (noteIndex === -1) return 440; // Default to A4

    // MIDI note: (octave + 1) * 12 + noteIndex
    const midiNote = (octave + 1) * 12 + noteIndex;
    // A4 = MIDI 69 = 440 Hz
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  // Play note with current sound mode
  function playNote(noteName, octave) {
    if (currentSoundMode === 'none') return;

    init(); // Ensure audio context is ready

    const generator = soundGenerators[currentSoundMode];
    if (!generator) return;

    const effectiveOctave = octave || 3;
    const frequency = noteToFrequency(noteName, effectiveOctave);

    // Debug logging - helps catch intermittent sound bugs
    console.log(`🎵 ${noteName}${effectiveOctave} → ${Math.round(frequency)}Hz`);

    generator(audioContext, frequency, masterGain);
  }

  // Set sound mode
  function setSoundMode(mode) {
    currentSoundMode = mode;
    if (mode !== 'none') {
      init(); // Pre-initialize on sound selection
    }
  }

  // Get current sound mode
  function getSoundMode() {
    return currentSoundMode;
  }

  // Get list of available sounds
  function getSoundList() {
    return Object.keys(soundGenerators);
  }

  // Public API
  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.AudioPlayer = {
    playNote,
    setSoundMode,
    getSoundMode,
    getSoundList
  };
})();
