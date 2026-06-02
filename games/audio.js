(function () {
  // ---------------------------------------------------------------------------
  // Note-frequency table (A4 = 440 Hz)
  // ---------------------------------------------------------------------------
  var NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function noteFreq(name) {
    // e.g. 'C4', 'A#3', 'F#5'
    var m = name.match(/^([A-G]#?)(\d)$/);
    if (!m) return 0;
    var semi = NOTE_NAMES.indexOf(m[1]);
    var oct  = parseInt(m[2], 10);
    // MIDI note: C0 = 12
    var midi = (oct + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Short alias
  var n = noteFreq;

  // ---------------------------------------------------------------------------
  // Track definitions  —  { tempo (BPM), wave, notes: [[freq|null, beats], ...] }
  // ---------------------------------------------------------------------------
  var TRACKS = {

    // --- MENU  — upbeat arcade jingle in C major, bouncy feel
    menu: {
      tempo: 160, wave: 'square',
      notes: [
        [n('C5'),0.5],[n('E5'),0.5],[n('G5'),0.5],[n('C6'),1],
        [n('B4'),0.5],[n('G4'),0.5],[n('E4'),0.5],[n('G4'),0.5],
        [n('A4'),0.5],[n('C5'),0.5],[n('E5'),0.5],[n('A5'),1],
        [n('G5'),0.5],[n('E5'),0.5],[n('D5'),0.5],[n('C5'),1],
        [n('E5'),0.5],[n('G5'),0.5],[n('A5'),0.5],[n('G5'),0.5],
        [n('F5'),0.5],[n('E5'),0.5],[n('D5'),0.5],[n('C5'),0.5],
        [n('E4'),0.5],[n('G4'),0.5],[n('C5'),1.5],[null,0.5],
        [n('G4'),0.5],[n('E4'),0.5],[n('C4'),2]
      ]
    },

    // --- SNAKE  — nimble, ascending/descending runs in D major
    snake: {
      tempo: 140, wave: 'square',
      notes: [
        [n('D4'),0.5],[n('E4'),0.5],[n('F#4'),0.5],[n('A4'),0.5],
        [n('B4'),0.5],[n('A4'),0.5],[n('F#4'),0.5],[n('D4'),0.5],
        [n('E4'),0.5],[n('G4'),0.5],[n('A4'),0.5],[n('B4'),0.5],
        [n('A4'),1],[n('G4'),0.5],[n('E4'),0.5],
        [n('F#4'),0.5],[n('A4'),0.5],[n('D5'),1],[n('A4'),0.5],[n('F#4'),0.5],
        [n('E4'),0.5],[n('D4'),0.5],[n('E4'),0.5],[n('F#4'),0.5],
        [n('G4'),1],[n('F#4'),0.5],[n('E4'),0.5],
        [n('D4'),2]
      ]
    },

    // --- PONG  — cool, electronic groove in A minor, pulsing quarter notes
    pong: {
      tempo: 128, wave: 'sawtooth',
      notes: [
        [n('A3'),1],[n('C4'),1],[n('E4'),1],[n('A4'),1],
        [n('G4'),0.5],[n('E4'),0.5],[n('C4'),1],[n('D4'),1],
        [n('E4'),1],[n('G4'),1],[n('A4'),1],[n('G4'),1],
        [n('F4'),0.5],[n('E4'),0.5],[n('D4'),1],[n('C4'),1],
        [n('A3'),1],[n('E4'),1],[n('C4'),1],[n('A3'),1],
        [n('B3'),0.5],[n('D4'),0.5],[n('E4'),1],[n('G4'),1],
        [n('F4'),0.5],[n('E4'),0.5],[n('D4'),0.5],[n('C4'),0.5],[n('B3'),1],
        [n('A3'),2]
      ]
    },

    // --- TICTACTOE  — playful, light staccato in G major
    tictactoe: {
      tempo: 120, wave: 'triangle',
      notes: [
        [n('G4'),0.5],[null,0.5],[n('B4'),0.5],[null,0.5],
        [n('D5'),0.5],[null,0.5],[n('G5'),0.5],[null,0.5],
        [n('E5'),0.5],[null,0.5],[n('C5'),0.5],[null,0.5],
        [n('D5'),1],[null,1],
        [n('B4'),0.5],[null,0.5],[n('G4'),0.5],[null,0.5],
        [n('A4'),0.5],[null,0.5],[n('B4'),0.5],[null,0.5],
        [n('C5'),0.5],[n('D5'),0.5],[n('E5'),0.5],[n('D5'),0.5],
        [n('G4'),2]
      ]
    },

    // --- MEMORY  — dreamy, gentle arpeggios in E minor
    memory: {
      tempo: 100, wave: 'triangle',
      notes: [
        [n('E4'),1],[n('G4'),1],[n('B4'),1],[n('E5'),1],
        [n('D5'),1],[n('B4'),1],[n('G4'),1],[n('A4'),1],
        [n('C5'),1],[n('E5'),1],[n('D5'),1],[n('B4'),1],
        [n('G4'),1],[n('A4'),1],[n('B4'),1],[n('G4'),1],
        [n('E4'),1],[n('B4'),1],[n('G4'),1],[n('E4'),1],
        [n('F#4'),1],[n('A4'),1],[n('D5'),1],[n('C#5'),1],
        [n('B4'),1],[n('A4'),1],[n('G4'),1],[n('F#4'),1],
        [n('E4'),2],[null,2]
      ]
    },

    // --- FLAPPY  — light and airy, E major, staccato hops
    flappy: {
      tempo: 150, wave: 'triangle',
      notes: [
        [n('E5'),0.5],[null,0.5],[n('G#5'),0.5],[null,0.5],
        [n('B5'),0.5],[null,0.5],[n('E6'),0.5],[null,0.5],
        [n('D#6'),0.5],[n('B5'),0.5],[n('G#5'),0.5],[n('E5'),0.5],
        [n('F#5'),1],[null,1],
        [n('G#5'),0.5],[null,0.5],[n('B5'),0.5],[null,0.5],
        [n('C#6'),0.5],[n('B5'),0.5],[n('G#5'),0.5],[n('F#5'),0.5],
        [n('E5'),0.5],[n('F#5'),0.5],[n('G#5'),0.5],[n('A5'),0.5],
        [n('B5'),2]
      ]
    },

    // --- BREAKOUT  — energetic, punchy rock rhythm in D major
    breakout: {
      tempo: 170, wave: 'sawtooth',
      notes: [
        [n('D4'),0.5],[n('D4'),0.5],[n('F#4'),0.5],[null,0.5],
        [n('A4'),0.5],[n('A4'),0.5],[n('D5'),0.5],[null,0.5],
        [n('C#5'),0.5],[n('B4'),0.5],[n('A4'),0.5],[n('G4'),0.5],
        [n('F#4'),1],[n('E4'),0.5],[n('D4'),0.5],
        [n('E4'),0.5],[n('E4'),0.5],[n('G4'),0.5],[null,0.5],
        [n('A4'),0.5],[n('A4'),0.5],[n('C#5'),0.5],[null,0.5],
        [n('D5'),0.5],[n('C#5'),0.5],[n('B4'),0.5],[n('A4'),0.5],
        [n('D4'),2]
      ]
    },

    // --- 2048  — methodical, minimalist, steady pulse in C major
    '2048': {
      tempo: 110, wave: 'triangle',
      notes: [
        [n('C4'),1],[n('E4'),1],[n('G4'),1],[n('C5'),1],
        [null,0.5],[n('B4'),0.5],[n('A4'),0.5],[n('G4'),0.5],[n('F4'),1],
        [n('E4'),1],[n('F4'),1],[n('G4'),1],[n('E4'),1],
        [n('D4'),1],[n('C4'),1],[null,2],
        [n('G4'),1],[n('A4'),1],[n('B4'),1],[n('C5'),1],
        [n('D5'),0.5],[n('C5'),0.5],[n('B4'),0.5],[n('A4'),0.5],[n('G4'),1],
        [n('F4'),0.5],[n('E4'),0.5],[n('D4'),0.5],[n('C4'),0.5],[n('E4'),1],
        [n('C4'),2]
      ]
    },

    // --- WHACK  — manic, frenetic in B minor, lots of rests
    whack: {
      tempo: 190, wave: 'square',
      notes: [
        [n('B4'),0.25],[null,0.25],[n('D5'),0.25],[null,0.25],
        [n('F#5'),0.25],[null,0.25],[n('B5'),0.5],
        [null,0.5],[n('A5'),0.25],[null,0.25],[n('G5'),0.25],[null,0.25],
        [n('F#5'),0.5],[n('E5'),0.5],
        [n('D5'),0.25],[null,0.25],[n('E5'),0.25],[null,0.25],
        [n('F#5'),0.25],[n('G5'),0.25],[n('A5'),0.25],[n('B5'),0.25],
        [n('C#5'),0.5],[null,0.5],[n('B4'),0.5],[null,0.5],
        [n('F#4'),1],[null,1],
        [n('B4'),0.25],[n('D5'),0.25],[n('F#5'),0.25],[n('A5'),0.25],
        [n('G5'),0.5],[n('E5'),0.5],
        [n('D5'),0.25],[null,0.25],[n('F#5'),0.25],[null,0.25],
        [n('A5'),0.5],[n('B5'),0.25],[null,0.75],
        [n('B4'),2]
      ]
    },

    // --- DINO  — driving, relentless 8-bit run in A major
    dino: {
      tempo: 175, wave: 'square',
      notes: [
        [n('A4'),0.5],[n('C#5'),0.5],[n('E5'),0.5],[n('A5'),0.5],
        [n('G#5'),0.5],[n('E5'),0.5],[n('C#5'),0.5],[n('A4'),0.5],
        [n('B4'),0.5],[n('D5'),0.5],[n('E5'),0.5],[n('G#5'),0.5],
        [n('A5'),1],[n('E5'),0.5],[n('C#5'),0.5],
        [n('D5'),0.5],[n('F#5'),0.5],[n('A5'),0.5],[n('D6'),0.5],
        [n('C#6'),0.5],[n('A5'),0.5],[n('F#5'),0.5],[n('D5'),0.5],
        [n('E5'),0.5],[n('C#5'),0.5],[n('B4'),0.5],[n('E5'),0.5],
        [n('A4'),2]
      ]
    },

    // --- TETRIS  — original folk-inspired minor melody (NOT Korobeiniki; D natural minor)
    tetris: {
      tempo: 145, wave: 'square',
      notes: [
        [n('D5'),1],[n('C5'),0.5],[n('A#4'),0.5],
        [n('A4'),0.5],[n('A#4'),0.5],[n('C5'),0.5],[n('D5'),0.5],
        [n('C5'),0.5],[n('A#4'),0.5],[n('A4'),1],
        [null,0.5],[n('A4'),0.5],[n('C5'),0.5],[n('E5'),0.5],
        [n('F5'),0.5],[n('E5'),0.5],[n('D5'),1],
        [n('C5'),0.5],[n('D5'),0.5],[n('E5'),0.5],[n('C5'),0.5],
        [n('A#4'),0.5],[n('A4'),0.5],[n('G4'),1],
        [n('A4'),0.5],[n('A#4'),0.5],[n('C5'),0.5],[n('A#4'),0.5],
        [n('A4'),1],[n('G4'),0.5],[n('A4'),0.5],
        [n('A#4'),0.5],[n('A4'),0.5],[n('G4'),0.5],[n('F4'),0.5],
        [n('D4'),1],[null,1]
      ]
    },

    // --- INVADERS  — ominous, march-like in F minor, descending
    invaders: {
      tempo: 120, wave: 'sawtooth',
      notes: [
        [n('F4'),0.5],[n('F4'),0.5],[n('G#4'),0.5],[n('A#4'),0.5],
        [n('C5'),0.5],[n('A#4'),0.5],[n('G#4'),0.5],[n('F4'),0.5],
        [n('D#4'),0.5],[n('F4'),0.5],[n('G4'),0.5],[n('D#4'),0.5],
        [n('C4'),1],[null,1],
        [n('F4'),0.5],[n('G#4'),0.5],[n('A#4'),0.5],[n('C5'),0.5],
        [n('D5'),0.5],[n('C5'),0.5],[n('A#4'),0.5],[n('G4'),0.5],
        [n('F4'),0.5],[n('D#4'),0.5],[n('C4'),0.5],[n('D4'),0.5],
        [n('F4'),2]
      ]
    },

    // --- ASTEROIDS  — sparse, spacey, slow drifting in C# minor
    asteroids: {
      tempo: 88, wave: 'sawtooth',
      notes: [
        [n('C#4'),2],[null,1],[n('G#4'),1],
        [n('E4'),1.5],[null,0.5],[n('B3'),1.5],[null,0.5],
        [n('F#4'),2],[null,1],[n('C#4'),1],
        [n('D#4'),1],[n('C#4'),1],[n('B3'),2],
        [null,1],[n('A3'),1.5],[n('B3'),0.5],
        [n('C#4'),1.5],[n('E4'),0.5],[n('G#4'),1],[null,1],
        [n('F#4'),1],[n('E4'),1],[n('D#4'),1],[n('C#4'),1],
        [null,4]
      ]
    },

    // --- PACMAN  — bouncy, major-pentatonic, bright and cheerful in G major
    pacman: {
      tempo: 155, wave: 'square',
      notes: [
        [n('G4'),0.5],[n('A4'),0.5],[n('B4'),0.5],[n('D5'),0.5],
        [n('E5'),1],[n('D5'),0.5],[n('B4'),0.5],
        [n('C5'),0.5],[n('D5'),0.5],[n('E5'),0.5],[n('G5'),0.5],
        [n('A5'),1],[null,1],
        [n('G5'),0.5],[n('E5'),0.5],[n('D5'),0.5],[n('B4'),0.5],
        [n('C5'),0.5],[n('B4'),0.5],[n('A4'),0.5],[n('G4'),0.5],
        [n('A4'),0.5],[n('B4'),0.5],[n('A4'),0.5],[n('G4'),0.5],
        [n('D5'),1],[n('G4'),1],
        [n('B4'),0.5],[n('D5'),0.5],[n('G5'),0.5],[n('B5'),0.5],
        [n('A5'),0.5],[n('G5'),0.5],[n('E5'),0.5],[n('D5'),0.5],
        [n('C5'),0.5],[n('B4'),0.5],[n('A4'),0.5],[n('G4'),0.5],
        [n('G4'),2]
      ]
    }
  };

  // ---------------------------------------------------------------------------
  // Engine state
  // ---------------------------------------------------------------------------
  var audioCtx      = null;
  var masterGain    = null;
  var unlocked      = false;
  var masterVolume  = 0.25;
  var muted         = false;
  var currentTrack  = null;   // track name string
  var schedulerInterval = null;
  var nextNoteTime  = 0;      // audioCtx time of next note
  var noteIndex     = 0;      // index into current track's notes array
  var LOOKAHEAD_MS  = 100;    // schedule notes within this window
  var SCHEDULE_MS   = 25;     // how often to run scheduler

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------
  function createContext() {
    if (audioCtx) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx  = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : masterVolume;
    masterGain.connect(audioCtx.destination);
  }

  function scheduleNote(freq, duration, startTime) {
    if (!audioCtx) return;
    if (!freq) return; // rest — just advance time

    var osc  = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = TRACKS[currentTrack] ? TRACKS[currentTrack].wave : 'square';
    osc.frequency.value = freq;

    // Quick attack + short decay envelope to avoid clicks
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + 0.005);
    gain.gain.setValueAtTime(1, startTime + duration * 0.75);
    gain.gain.linearRampToValueAtTime(0, startTime + duration - 0.005);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
    // Oscillator and gain node auto-GC after osc.stop fires
  }

  function stopScheduler() {
    if (schedulerInterval !== null) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    noteIndex    = 0;
    nextNoteTime = 0;
  }

  function startScheduler(trackName) {
    stopScheduler(); // clear any previous scheduler first — critical for no leaks

    currentTrack = trackName;
    var track    = TRACKS[trackName];
    if (!track || !audioCtx) return;

    var beatDur = 60 / track.tempo; // seconds per beat
    nextNoteTime = audioCtx.currentTime + 0.05; // small initial delay
    noteIndex    = 0;

    schedulerInterval = setInterval(function () {
      if (!audioCtx) return;
      var lookaheadEnd = audioCtx.currentTime + LOOKAHEAD_MS / 1000;

      while (nextNoteTime < lookaheadEnd) {
        var note     = track.notes[noteIndex];
        var freq     = note[0];
        var beats    = note[1];
        var duration = beats * beatDur;

        scheduleNote(freq, duration, nextNoteTime);

        nextNoteTime += duration;
        noteIndex++;
        if (noteIndex >= track.notes.length) {
          noteIndex = 0; // loop
        }
      }
    }, SCHEDULE_MS);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  function unlock() {
    createContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!unlocked) {
      unlocked = true;
      // If a track was requested before unlock, start it now
      if (currentTrack && schedulerInterval === null) {
        startScheduler(currentTrack);
      }
    }
  }

  function play(trackName) {
    stopScheduler(); // always stop first — prevents stacked voices / leaked intervals

    if (!TRACKS[trackName]) {
      // Unknown track — just silence
      currentTrack = null;
      return;
    }

    currentTrack = trackName;

    if (!unlocked) {
      // Remember the track; scheduler will start when unlock() is called
      return;
    }
    if (!audioCtx) {
      // Shouldn't happen if unlocked, but guard anyway
      return;
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    startScheduler(trackName);
  }

  function stop() {
    stopScheduler();
    currentTrack = null;
  }

  function toggleMute() {
    muted = !muted;
    setMuted(muted);
    return muted;
  }

  function setMuted(bool) {
    muted = !!bool;
    if (masterGain) {
      masterGain.gain.cancelScheduledValues(0);
      masterGain.gain.value = muted ? 0 : masterVolume;
    }
  }

  function isMuted() {
    return muted;
  }

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------
  window.MiniGames = window.MiniGames || {};
  window.MiniGames.audio = { unlock: unlock, play: play, stop: stop, toggleMute: toggleMute, setMuted: setMuted, isMuted: isMuted };
})();
