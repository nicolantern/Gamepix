(function () {
  // ===========================================================================
  // Gamepix audio engine — synthesized, futuristic melodic-electronic loops.
  // Layered voices (sub bass + arp + detuned-saw lead + drums) routed through a
  // master gain and a feedback-delay send for space. No files, no libraries.
  // Public API is unchanged: unlock, play, stop, toggleMute, setMuted, isMuted.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Note-frequency helper (A4 = 440 Hz)
  // ---------------------------------------------------------------------------
  var NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function noteFreq(name) {
    var m = name.match(/^([A-G]#?)(\d)$/);
    if (!m) return 0;
    var semi = NOTE_NAMES.indexOf(m[1]);
    var oct  = parseInt(m[2], 10);
    var midi = (oct + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  var n = noteFreq;
  // chord helper → [bassFreq, [toneFreqs...]]
  function C(bass, tones) { return [n(bass), tones.map(n)]; }

  // ---------------------------------------------------------------------------
  // Tracks. Each: { tempo, chords:[[bassFreq,[tones]]...], lead:[[freq|null,beats]],
  //                 drums:true|'soft'|false, arp:bool, pad:bool, bass:bool }
  // Loop length = chords.length bars × 4 beats. Lead runs in parallel over the loop.
  // Uplifting "Sky High"-style progressions (vi–IV–I–V and relatives), original melodies.
  // ---------------------------------------------------------------------------
  var TRACKS = {

    // MENU — bright uplifting anthem, C major, Am–F–C–G ×2
    menu: {
      tempo: 128, drums: true, arp: true, pad: true,
      chords: [
        C('A2',['A3','C4','E4']), C('F2',['F3','A3','C4']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4']),
        C('A2',['A3','C4','E4']), C('F2',['F3','A3','C4']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4'])
      ],
      lead: [
        [n('E5'),1],[n('G5'),1],[n('A5'),1.5],[n('G5'),0.5],
        [n('E5'),1],[n('C5'),1],[n('D5'),2],
        [n('C5'),1],[n('E5'),1],[n('G5'),1.5],[n('A5'),0.5],
        [n('G5'),1],[n('E5'),1],[n('D5'),1],[null,1],
        [n('A5'),1],[n('G5'),1],[n('E5'),1.5],[n('D5'),0.5],
        [n('C5'),1],[n('D5'),1],[n('E5'),2],
        [n('G5'),1],[n('A5'),1],[n('B5'),1.5],[n('A5'),0.5],
        [n('G5'),1],[n('E5'),1],[n('C5'),2]
      ]
    },

    // SNAKE — nimble, D major, Bm–G–D–A
    snake: {
      tempo: 132, drums: true, arp: true, pad: true,
      chords: [
        C('B2',['B3','D4','F#4']), C('G2',['G3','B3','D4']), C('D2',['D3','F#3','A3']), C('A2',['A3','C#4','E4']),
        C('B2',['B3','D4','F#4']), C('G2',['G3','B3','D4']), C('D2',['D3','F#3','A3']), C('A2',['A3','C#4','E4'])
      ],
      lead: [
        [n('F#5'),0.5],[n('A5'),0.5],[n('B5'),1],[n('A5'),0.5],[n('F#5'),0.5],[n('D5'),1],
        [n('G5'),0.5],[n('B5'),0.5],[n('D6'),1],[n('B5'),1],
        [n('A5'),0.5],[n('F#5'),0.5],[n('D5'),1],[n('E5'),0.5],[n('F#5'),0.5],[n('A5'),1],
        [n('F#5'),0.5],[n('E5'),0.5],[n('C#5'),1],[null,1],
        [n('F#5'),0.5],[n('A5'),0.5],[n('B5'),1],[n('A5'),0.5],[n('F#5'),0.5],[n('D5'),1],
        [n('G5'),0.5],[n('B5'),0.5],[n('D6'),1.5],[n('B5'),0.5],
        [n('A5'),1],[n('F#5'),1],[n('E5'),0.5],[n('F#5'),0.5],[n('E5'),0.5],[n('C#5'),0.5],
        [n('D5'),2],[null,2]
      ]
    },

    // PONG — cool, A minor, Am–F–C–G
    pong: {
      tempo: 124, drums: true, arp: true, pad: true,
      chords: [
        C('A2',['A3','C4','E4']), C('F2',['F3','A3','C4']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4']),
        C('A2',['A3','C4','E4']), C('F2',['F3','A3','C4']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4'])
      ],
      lead: [
        [n('A4'),1],[n('C5'),1],[n('E5'),1],[n('A5'),1],
        [n('G5'),1.5],[n('E5'),0.5],[n('C5'),2],
        [n('F5'),1],[n('A5'),1],[n('G5'),1],[n('E5'),1],
        [n('D5'),1.5],[n('C5'),0.5],[n('B4'),2],
        [n('E5'),1],[n('A5'),1],[n('C6'),1.5],[n('B5'),0.5],
        [n('A5'),1],[n('G5'),1],[n('E5'),2],
        [n('G5'),1],[n('B5'),1],[n('D6'),1],[n('B5'),1],
        [n('A5'),2],[null,2]
      ]
    },

    // TICTACTOE — light, G major, Em–C–G–D
    tictactoe: {
      tempo: 118, drums: 'soft', arp: true, pad: true,
      chords: [
        C('E2',['E3','G3','B3']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4']), C('D2',['D3','F#3','A3']),
        C('E2',['E3','G3','B3']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4']), C('D2',['D3','F#3','A3'])
      ],
      lead: [
        [n('B4'),1],[n('D5'),1],[n('G5'),1.5],[n('D5'),0.5],
        [n('E5'),1],[n('G5'),1],[n('B5'),2],
        [n('A5'),1],[n('G5'),1],[n('D5'),1],[n('B4'),1],
        [n('C5'),1],[n('E5'),1],[n('D5'),2],
        [n('G5'),1],[n('B5'),1],[n('A5'),1.5],[n('G5'),0.5],
        [n('E5'),1],[n('D5'),1],[n('G5'),2],
        [n('B5'),1],[n('A5'),1],[n('F#5'),1.5],[n('A5'),0.5],
        [n('G5'),2],[null,2]
      ]
    },

    // MEMORY — dreamy, E minor, Em–C–G–D, pad-led, soft drums
    memory: {
      tempo: 100, drums: 'soft', arp: true, pad: true,
      chords: [
        C('E2',['E3','G3','B3']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4']), C('D2',['D3','F#3','A3']),
        C('E2',['E3','G3','B3']), C('C2',['C3','E3','G3']), C('A2',['A3','C4','E4']), C('B2',['B3','D4','F#4'])
      ],
      lead: [
        [n('E5'),2],[n('G5'),1],[n('B5'),1],
        [n('A5'),2],[n('G5'),1],[n('E5'),1],
        [n('D5'),2],[n('E5'),1],[n('G5'),1],
        [n('F#5'),2],[n('D5'),2],
        [n('E5'),2],[n('B5'),1],[n('C6'),1],
        [n('B5'),2],[n('G5'),2],
        [n('A5'),2],[n('C6'),1],[n('B5'),1],
        [n('F#5'),2],[null,2]
      ]
    },

    // FLAPPY — airy, E major, C#m–A–E–B
    flappy: {
      tempo: 140, drums: true, arp: true, pad: true,
      chords: [
        C('C#2',['C#4','E4','G#4']), C('A2',['A3','C#4','E4']), C('E2',['E3','G#3','B3']), C('B2',['B3','D#4','F#4']),
        C('C#2',['C#4','E4','G#4']), C('A2',['A3','C#4','E4']), C('E2',['E3','G#3','B3']), C('B2',['B3','D#4','F#4'])
      ],
      lead: [
        [n('G#5'),0.5],[n('B5'),0.5],[n('E6'),1],[n('B5'),0.5],[n('G#5'),0.5],[n('E5'),1],
        [n('A5'),0.5],[n('C#6'),0.5],[n('E6'),1.5],[n('C#6'),0.5],
        [n('B5'),0.5],[n('G#5'),0.5],[n('E5'),1],[n('F#5'),0.5],[n('G#5'),0.5],[n('B5'),1],
        [n('D#6'),0.5],[n('B5'),0.5],[n('F#5'),1],[null,1],
        [n('G#5'),0.5],[n('B5'),0.5],[n('E6'),1],[n('B5'),0.5],[n('G#5'),0.5],[n('E5'),1],
        [n('A5'),0.5],[n('C#6'),0.5],[n('E6'),1.5],[n('C#6'),0.5],
        [n('B5'),1],[n('G#5'),1],[n('F#5'),0.5],[n('G#5'),0.5],[n('F#5'),0.5],[n('D#5'),0.5],
        [n('E5'),2],[null,2]
      ]
    },

    // BREAKOUT — punchy, D major, Bm–G–D–A, driving
    breakout: {
      tempo: 142, drums: true, arp: true, pad: true,
      chords: [
        C('B2',['B3','D4','F#4']), C('G2',['G3','B3','D4']), C('D2',['D3','F#3','A3']), C('A2',['A3','C#4','E4']),
        C('B2',['B3','D4','F#4']), C('G2',['G3','B3','D4']), C('D2',['D3','F#3','A3']), C('A2',['A3','C#4','E4'])
      ],
      lead: [
        [n('D5'),0.5],[n('F#5'),0.5],[n('A5'),0.5],[n('D6'),0.5],[n('C#6'),0.5],[n('A5'),0.5],[n('F#5'),1],
        [n('G5'),0.5],[n('B5'),0.5],[n('D6'),1],[n('B5'),1],
        [n('A5'),0.5],[n('D6'),0.5],[n('C#6'),0.5],[n('A5'),0.5],[n('F#5'),0.5],[n('E5'),0.5],[n('D5'),1],
        [n('E5'),0.5],[n('F#5'),0.5],[n('A5'),1],[null,1],
        [n('D5'),0.5],[n('F#5'),0.5],[n('A5'),0.5],[n('D6'),0.5],[n('C#6'),0.5],[n('A5'),0.5],[n('F#5'),1],
        [n('G5'),0.5],[n('B5'),0.5],[n('D6'),1.5],[n('B5'),0.5],
        [n('A5'),1],[n('F#5'),1],[n('E5'),0.5],[n('D5'),0.5],[n('E5'),0.5],[n('C#5'),0.5],
        [n('D5'),2],[null,2]
      ]
    },

    // 2048 — methodical, C major, Am–F–C–G, soft beat
    '2048': {
      tempo: 112, drums: 'soft', arp: true, pad: true,
      chords: [
        C('A2',['A3','C4','E4']), C('F2',['F3','A3','C4']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4']),
        C('A2',['A3','C4','E4']), C('F2',['F3','A3','C4']), C('C2',['C3','E3','G3']), C('G2',['G3','B3','D4'])
      ],
      lead: [
        [n('C5'),1],[n('E5'),1],[n('G5'),2],
        [n('A5'),1],[n('G5'),1],[n('E5'),2],
        [n('F5'),1],[n('A5'),1],[n('G5'),1],[n('E5'),1],
        [n('D5'),2],[n('C5'),2],
        [n('E5'),1],[n('G5'),1],[n('C6'),2],
        [n('B5'),1],[n('A5'),1],[n('G5'),2],
        [n('A5'),1],[n('G5'),1],[n('E5'),1],[n('D5'),1],
        [n('C5'),2],[null,2]
      ]
    },

    // WHACK — manic, B minor, Bm–G–Em–F#, fast
    whack: {
      tempo: 150, drums: true, arp: true, pad: true,
      chords: [
        C('B2',['B3','D4','F#4']), C('G2',['G3','B3','D4']), C('E2',['E3','G3','B3']), C('F#2',['F#3','A#3','C#4']),
        C('B2',['B3','D4','F#4']), C('G2',['G3','B3','D4']), C('E2',['E3','G3','B3']), C('F#2',['F#3','A#3','C#4'])
      ],
      lead: [
        [n('B5'),0.5],[n('F#5'),0.5],[n('B5'),0.5],[n('D6'),0.5],[n('B5'),0.5],[n('F#5'),0.5],[n('D5'),1],
        [n('G5'),0.5],[n('D5'),0.5],[n('G5'),0.5],[n('B5'),0.5],[n('A5'),0.5],[n('G5'),0.5],[n('D5'),1],
        [n('E5'),0.5],[n('B5'),0.5],[n('E6'),0.5],[n('B5'),0.5],[n('G5'),0.5],[n('E5'),0.5],[n('B4'),1],
        [n('F#5'),0.5],[n('A#5'),0.5],[n('C#6'),1],[null,1],
        [n('B5'),0.5],[n('D6'),0.5],[n('F#6'),0.5],[n('D6'),0.5],[n('B5'),0.5],[n('F#5'),0.5],[n('D5'),1],
        [n('G5'),0.5],[n('B5'),0.5],[n('D6'),1.5],[n('B5'),0.5],
        [n('E6'),0.5],[n('B5'),0.5],[n('G5'),0.5],[n('E5'),0.5],[n('F#5'),0.5],[n('A#5'),0.5],[n('C#6'),1],
        [n('B5'),2]
      ]
    },

    // DINO — driving, A major, F#m–D–A–E
    dino: {
      tempo: 144, drums: true, arp: true, pad: true,
      chords: [
        C('F#2',['F#3','A3','C#4']), C('D2',['D3','F#3','A3']), C('A2',['A3','C#4','E4']), C('E2',['E3','G#3','B3']),
        C('F#2',['F#3','A3','C#4']), C('D2',['D3','F#3','A3']), C('A2',['A3','C#4','E4']), C('E2',['E3','G#3','B3'])
      ],
      lead: [
        [n('F#5'),0.5],[n('A5'),0.5],[n('C#6'),1],[n('A5'),0.5],[n('F#5'),0.5],[n('C#5'),1],
        [n('D5'),0.5],[n('F#5'),0.5],[n('A5'),1],[n('F#5'),1],
        [n('C#6'),0.5],[n('A5'),0.5],[n('E5'),1],[n('A5'),0.5],[n('C#6'),0.5],[n('E6'),1],
        [n('B5'),0.5],[n('G#5'),0.5],[n('E5'),1],[null,1],
        [n('F#5'),0.5],[n('A5'),0.5],[n('C#6'),1],[n('A5'),0.5],[n('F#5'),0.5],[n('C#5'),1],
        [n('D5'),0.5],[n('F#5'),0.5],[n('A5'),1.5],[n('F#5'),0.5],
        [n('E6'),1],[n('C#6'),1],[n('B5'),0.5],[n('G#5'),0.5],[n('B5'),0.5],[n('E5'),0.5],
        [n('A5'),2],[null,2]
      ]
    },

    // TETRIS — driving minor, D minor, Dm–Bb–F–C / Dm–A
    tetris: {
      tempo: 140, drums: true, arp: true, pad: true,
      chords: [
        C('D2',['D3','F3','A3']), C('A2',['A3','C#4','E4']), C('D2',['D3','F3','A3']), C('A2',['A3','C#4','E4']),
        C('A#2',['A#3','D4','F4']), C('F2',['F3','A3','C4']), C('C2',['C3','E3','G3']), C('A2',['A3','C#4','E4'])
      ],
      lead: [
        [n('D5'),1],[n('A4'),0.5],[n('A#4'),0.5],[n('C5'),1],[n('A4'),1],
        [n('A#4'),0.5],[n('C5'),0.5],[n('D5'),1],[n('A4'),1],[null,1],
        [n('C5'),1],[n('E5'),0.5],[n('F5'),0.5],[n('E5'),1],[n('C5'),1],
        [n('A4'),1],[n('A#4'),0.5],[n('A4'),0.5],[n('G4'),1],[null,1],
        [n('F5'),1],[n('E5'),0.5],[n('D5'),0.5],[n('A4'),1],[n('D5'),1],
        [n('E5'),0.5],[n('F5'),0.5],[n('G5'),1],[n('A5'),1],[n('F5'),1],
        [n('E5'),1],[n('D5'),0.5],[n('C5'),0.5],[n('A#4'),1],[n('A4'),1],
        [n('D5'),2],[null,2]
      ]
    },

    // INVADERS — ominous, F minor, Fm–Db–Ab–Eb
    invaders: {
      tempo: 124, drums: true, arp: true, pad: true,
      chords: [
        C('F2',['F3','G#3','C4']), C('C#2',['C#3','F3','G#3']), C('G#2',['G#3','C4','D#4']), C('D#2',['D#3','G3','A#3']),
        C('F2',['F3','G#3','C4']), C('C#2',['C#3','F3','G#3']), C('G#2',['G#3','C4','D#4']), C('C2',['C3','E3','G3'])
      ],
      lead: [
        [n('F5'),1],[n('G#5'),0.5],[n('C6'),0.5],[n('A#5'),1],[n('G#5'),1],
        [n('F5'),1],[n('D#5'),0.5],[n('F5'),0.5],[n('C5'),2],
        [n('G#5'),1],[n('C6'),0.5],[n('D#6'),0.5],[n('C6'),1],[n('A#5'),1],
        [n('G#5'),1],[n('F5'),1],[n('D#5'),2],
        [n('F5'),1],[n('G#5'),0.5],[n('C6'),0.5],[n('A#5'),1],[n('C6'),1],
        [n('D#6'),1],[n('C6'),0.5],[n('A#5'),0.5],[n('G#5'),2],
        [n('C6'),1],[n('A#5'),1],[n('G#5'),0.5],[n('G5'),0.5],[n('F5'),1],
        [n('F5'),2],[null,2]
      ]
    },

    // ASTEROIDS — spacey, C# minor, C#m–A–E–B, sparse lead, soft drums, big delay
    asteroids: {
      tempo: 110, drums: 'soft', arp: true, pad: true,
      chords: [
        C('C#2',['C#3','E3','G#3']), C('A1',['A2','C#3','E3']), C('E2',['E3','G#3','B3']), C('B1',['B2','D#3','F#3']),
        C('C#2',['C#3','E3','G#3']), C('A1',['A2','C#3','E3']), C('E2',['E3','G#3','B3']), C('B1',['B2','D#3','F#3'])
      ],
      lead: [
        [n('G#5'),2],[n('E5'),2],
        [n('C#5'),3],[n('E5'),1],
        [n('B4'),2],[n('G#4'),2],
        [n('F#4'),3],[null,1],
        [n('G#5'),2],[n('B5'),2],
        [n('E5'),3],[n('C#5'),1],
        [n('D#5'),2],[n('C#5'),1],[n('B4'),1],
        [n('C#5'),3],[null,1]
      ]
    },

    // PACMAN — bouncy, G major, G–Em–C–D
    pacman: {
      tempo: 150, drums: true, arp: true, pad: true,
      chords: [
        C('G2',['G3','B3','D4']), C('E2',['E3','G3','B3']), C('C2',['C3','E3','G3']), C('D2',['D3','F#3','A3']),
        C('G2',['G3','B3','D4']), C('E2',['E3','G3','B3']), C('C2',['C3','E3','G3']), C('D2',['D3','F#3','A3'])
      ],
      lead: [
        [n('G5'),0.5],[n('B5'),0.5],[n('D6'),1],[n('B5'),0.5],[n('G5'),0.5],[n('D5'),1],
        [n('E5'),0.5],[n('G5'),0.5],[n('B5'),1],[n('G5'),1],
        [n('C6'),0.5],[n('B5'),0.5],[n('G5'),1],[n('A5'),0.5],[n('B5'),0.5],[n('C6'),1],
        [n('B5'),0.5],[n('A5'),0.5],[n('F#5'),1],[null,1],
        [n('G5'),0.5],[n('B5'),0.5],[n('D6'),1],[n('B5'),0.5],[n('G5'),0.5],[n('D5'),1],
        [n('E5'),0.5],[n('G5'),0.5],[n('B5'),1.5],[n('G5'),0.5],
        [n('A5'),1],[n('B5'),1],[n('A5'),0.5],[n('G5'),0.5],[n('F#5'),0.5],[n('A5'),0.5],
        [n('G5'),2],[null,2]
      ]
    }
  };

  // ---------------------------------------------------------------------------
  // MENU — the showcase: a long, multi-section original anthem in that uplifting
  // melodic-future style (intro → build → DROP → breakdown → final drop, ~60s).
  // Built programmatically so the 32-bar arrangement stays readable.
  // ---------------------------------------------------------------------------
  (function buildMenuAnthem() {
    var prog = [
      C('D2',  ['D3','F3','A3']),    // vi  (Dm)
      C('A#2', ['A#3','D4','F4']),   // IV  (Bb)
      C('F2',  ['F3','A3','C4']),    // I   (F)
      C('C2',  ['C3','E3','G3'])     // V   (C)
    ];
    var chords = [];
    for (var r = 0; r < 8; r++) chords = chords.concat(prog); // 32 bars

    var arr = [];
    function section(from, to, cfg) { for (var b = from; b <= to; b++) arr[b] = cfg; }
    section(0,  3,  { pad: true });                                                   // intro: pad only
    section(4,  7,  { pad: true, arp: true, drums: 'soft' });                         // intro: + arp, soft kick
    section(8,  11, { pad: true, arp: true, bass: true, drums: true, lead: true });   // build A
    section(12, 15, { pad: true, arp: true, bass: true, drums: true, lead: true });   // build B (riser at 15)
    section(16, 23, { pad: true, arp: true, bass: true, drums: true, lead: true, big: true }); // DROP
    section(24, 27, { pad: true, arp: true, lead: true, drums: 'soft' });             // breakdown
    section(28, 31, { pad: true, arp: true, bass: true, drums: true, lead: true, big: true }); // final drop

    var lead = [
      // bars 0-7 — intro, no lead
      [null, 32],
      // bars 8-15 — build melody (32 beats)
      [n('A4'),1],[n('C5'),1],[n('D5'),1.5],[n('C5'),0.5],
      [n('A4'),1],[n('F4'),1],[n('G4'),2],
      [n('F4'),1],[n('A4'),1],[n('C5'),1.5],[n('D5'),0.5],
      [n('C5'),1],[n('A4'),1],[n('G4'),2],
      [n('A4'),1],[n('C5'),1],[n('F5'),1.5],[n('E5'),0.5],
      [n('D5'),1],[n('C5'),1],[n('A4'),2],
      [n('A4'),1],[n('C5'),1],[n('D5'),1],[n('C5'),1],
      [n('A4'),2],[null,2],
      // bars 16-23 — DROP hook (32 beats), soaring
      [n('D5'),1],[n('F5'),1],[n('A5'),1.5],[n('F5'),0.5],
      [n('D5'),1],[n('C5'),1],[n('A4'),2],
      [n('C5'),1],[n('F5'),1],[n('G5'),1.5],[n('F5'),0.5],
      [n('D5'),1],[n('C5'),1],[n('A4'),2],
      [n('A5'),1],[n('G5'),1],[n('F5'),1.5],[n('D5'),0.5],
      [n('C5'),1],[n('D5'),1],[n('F5'),2],
      [n('G5'),1],[n('F5'),1],[n('D5'),1],[n('C5'),1],
      [n('D5'),2],[null,2],
      // bars 24-31 — breakdown (lower) then final drop (32 beats)
      [n('F4'),2],[n('A4'),2],
      [n('G4'),2],[n('C5'),2],
      [n('A4'),2],[n('D5'),2],
      [n('C5'),1],[n('A4'),1],[n('G4'),2],
      [n('D5'),1],[n('F5'),1],[n('A5'),1.5],[n('F5'),0.5],
      [n('G5'),1],[n('F5'),1],[n('D5'),2],
      [n('C5'),1],[n('D5'),1],[n('F5'),2],
      [n('D5'),1],[n('C5'),1],[n('A4'),1],[n('F4'),1]
    ];

    TRACKS.menu = { tempo: 128, chords: chords, arrangement: arr, risers: [15, 27], lead: lead };
  })();

  // ---------------------------------------------------------------------------
  // Engine state
  // ---------------------------------------------------------------------------
  var audioCtx = null, masterGain = null, duckGain = null, delaySend = null, noiseBuf = null;
  var unlocked = false, muted = false, masterVolume = 0.20;
  var currentTrack = null;
  var schedulerInterval = null;
  var trackEvents = [], loopDur = 0, loopStartTime = 0, evIndex = 0;
  var LOOKAHEAD_MS = 120, SCHEDULE_MS = 25;

  // ---------------------------------------------------------------------------
  // Context + shared nodes
  // ---------------------------------------------------------------------------
  function createContext() {
    if (audioCtx) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : masterVolume;
    masterGain.connect(audioCtx.destination);

    // Sidechain "pump" bus: the melodic layers (pad/bass/arp/lead) run through
    // duckGain, which is ducked on every kick and rebounds — the breathing motion
    // that makes a track read as modern EDM instead of flat/retro. Drums bypass it.
    duckGain = audioCtx.createGain();
    duckGain.gain.value = 1;
    duckGain.connect(masterGain);

    // Feedback delay send → spacious reverb-like wash (post-duck so the tail blooms)
    var delay = audioCtx.createDelay(1.0);
    delay.delayTime.value = 0.26;
    var feedback = audioCtx.createGain();
    feedback.gain.value = 0.38;
    delaySend = audioCtx.createGain();
    delaySend.gain.value = 0.42;
    delaySend.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(masterGain);

    // White-noise buffer for hi-hats
    var len = audioCtx.sampleRate * 0.4;
    noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  // ---------------------------------------------------------------------------
  // Voices — each schedules a short-lived node graph that stops itself (auto-GC)
  // ---------------------------------------------------------------------------
  function sawStack(t, freq, dur, detunes, target) {
    for (var i = 0; i < detunes.length; i++) {
      var o = audioCtx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detunes[i];
      o.connect(target);
      o.start(t);
      o.stop(t + dur);
    }
  }

  function playLead(t, freq, dur) {
    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(2300, t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(1000, t + dur);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.03);
    g.gain.setValueAtTime(0.2, t + Math.max(0.05, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // 5-voice supersaw for a smoother, wider (less bleepy) lead
    sawStack(t, freq, dur, [-12, -5, 0, 5, 12], lp);
    lp.connect(g);
    g.connect(duckGain);
    g.connect(delaySend);
  }

  // Big "drop" lead — 5-voice supersaw + an octave-up shimmer layer
  function playLeadBig(t, freq, dur) {
    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2.5;
    lp.frequency.setValueAtTime(1100, t);
    lp.frequency.linearRampToValueAtTime(3000, t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(1300, t + dur);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.03);
    g.gain.setValueAtTime(0.2, t + Math.max(0.05, dur * 0.62));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sawStack(t, freq, dur, [-16, -9, -3, 3, 9, 16], lp); // 6-voice supersaw
    sawStack(t, freq * 2, dur, [-7, 7], lp);             // octave-up shimmer
    lp.connect(g);
    g.connect(duckGain);
    g.connect(delaySend);
  }

  // White-noise riser sweeping up into a drop
  function playRiser(t, dur) {
    if (!noiseBuf) return;
    var src = audioCtx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(300, t);
    hp.frequency.exponentialRampToValueAtTime(8000, t + dur);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + dur * 0.92);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(hp); hp.connect(g); g.connect(masterGain);
    src.start(t); src.stop(t + dur + 0.05);
  }

  function playBass(t, freq, dur) {
    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 1;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // saw body + sine sub
    var saw = audioCtx.createOscillator();
    saw.type = 'sawtooth'; saw.frequency.value = freq;
    saw.connect(lp);
    var sub = audioCtx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = freq;
    sub.connect(lp);
    lp.connect(g); g.connect(duckGain);
    saw.start(t); saw.stop(t + dur);
    sub.start(t); sub.stop(t + dur);
  }

  function playArp(t, freq, dur) {
    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(2000, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
    // triangle = mellower, less buzzy/retro pluck than a raw saw
    var o = audioCtx.createOscillator();
    o.type = 'triangle'; o.frequency.value = freq;
    o.connect(lp); lp.connect(g);
    g.connect(duckGain); g.connect(delaySend);
    o.start(t); o.stop(t + dur);
  }

  function playPad(t, tones, dur) {
    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 0.7;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.25);
    g.gain.setValueAtTime(0.05, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (var i = 0; i < tones.length; i++) sawStack(t, tones[i], dur, [-6, 6], lp);
    lp.connect(g); g.connect(duckGain);
  }

  function playKick(t) {
    var o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(masterGain); // kick bypasses the pump bus
    o.start(t); o.stop(t + 0.2);
    // Sidechain pump: duck the melodic bus on the kick, then let it rebound
    if (duckGain) {
      duckGain.gain.cancelScheduledValues(t);
      duckGain.gain.setValueAtTime(0.32, t);
      duckGain.gain.linearRampToValueAtTime(1, t + 0.22);
    }
  }

  function playHat(t) {
    if (!noiseBuf) return;
    var src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    var hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.10, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(hp); hp.connect(g); g.connect(masterGain);
    src.start(t); src.stop(t + 0.06);
  }

  // ---------------------------------------------------------------------------
  // Build one loop's worth of events from a track spec
  // ---------------------------------------------------------------------------
  // Per-bar layer config. Tracks with an `arrangement` array get section-by-section
  // control (intro/build/drop/breakdown); plain tracks fall back to global flags.
  function barCfg(track, b) {
    if (track.arrangement && track.arrangement[b]) {
      var c = track.arrangement[b];
      return { pad: !!c.pad, arp: !!c.arp, bass: !!c.bass, drums: c.drums || false, lead: !!c.lead, big: !!c.big };
    }
    return { pad: !!track.pad, arp: !!track.arp, bass: track.bass !== false, drums: track.drums || false, lead: true, big: false };
  }

  function buildEvents(track) {
    var beatDur = 60 / track.tempo;
    var bars = track.chords.length;
    var risers = track.risers || [];
    var evs = [];

    for (var b = 0; b < bars; b++) {
      var cfg   = barCfg(track, b);
      var barT  = b * 4 * beatDur;
      var root  = track.chords[b][0];
      var tones = track.chords[b][1];

      if (cfg.pad) evs.push({ t: barT, kind: 'pad', tones: tones, dur: 4 * beatDur });

      if (cfg.bass) {
        evs.push({ t: barT,                kind: 'bass', freq: root, dur: beatDur * 0.9 });
        evs.push({ t: barT + 1 * beatDur,  kind: 'bass', freq: root, dur: beatDur * 0.5 });
        evs.push({ t: barT + 2 * beatDur,  kind: 'bass', freq: root, dur: beatDur * 0.9 });
        evs.push({ t: barT + 3 * beatDur,  kind: 'bass', freq: root, dur: beatDur * 0.5 });
      }

      if (cfg.arp) {
        for (var i = 0; i < 8; i++) {
          evs.push({ t: barT + i * 0.5 * beatDur, kind: 'arp', freq: tones[i % tones.length], dur: 0.5 * beatDur });
        }
      }

      if (cfg.drums === true) {
        for (var k = 0; k < 4; k++) evs.push({ t: barT + k * beatDur, kind: 'kick' });
        for (var h = 0; h < 4; h++) evs.push({ t: barT + (h + 0.5) * beatDur, kind: 'hat' });
      } else if (cfg.drums === 'soft') {
        evs.push({ t: barT, kind: 'kick' });
        evs.push({ t: barT + 2 * beatDur, kind: 'kick' });
      }

      if (risers.indexOf(b) !== -1) evs.push({ t: barT, kind: 'riser', dur: 4 * beatDur });
    }

    if (track.lead) {
      var tb = 0; // cumulative beats
      for (var li = 0; li < track.lead.length; li++) {
        var freq  = track.lead[li][0];
        var beats = track.lead[li][1];
        if (freq) {
          var bar  = Math.min(bars - 1, Math.floor(tb / 4));
          var lcfg = barCfg(track, bar);
          if (lcfg.lead) evs.push({ t: tb * beatDur, kind: lcfg.big ? 'leadbig' : 'lead', freq: freq, dur: beats * beatDur });
        }
        tb += beats;
      }
    }

    evs.sort(function (a, b2) { return a.t - b2.t; });
    return { events: evs, loopDur: bars * 4 * beatDur };
  }

  function playEvent(ev, t) {
    switch (ev.kind) {
      case 'lead':    playLead(t, ev.freq, ev.dur);    break;
      case 'leadbig': playLeadBig(t, ev.freq, ev.dur); break;
      case 'bass':    playBass(t, ev.freq, ev.dur);    break;
      case 'arp':     playArp(t, ev.freq, ev.dur);     break;
      case 'pad':     playPad(t, ev.tones, ev.dur);    break;
      case 'kick':    playKick(t); break;
      case 'hat':     playHat(t);  break;
      case 'riser':   playRiser(t, ev.dur); break;
    }
  }

  // ---------------------------------------------------------------------------
  // Scheduler (lookahead). One interval at a time; cleared on stop/switch.
  // ---------------------------------------------------------------------------
  function stopScheduler() {
    if (schedulerInterval !== null) { clearInterval(schedulerInterval); schedulerInterval = null; }
    trackEvents = []; loopDur = 0; loopStartTime = 0; evIndex = 0;
  }

  function startScheduler(trackName) {
    stopScheduler();
    currentTrack = trackName;
    var track = TRACKS[trackName];
    if (!track || !audioCtx) return;

    var built   = buildEvents(track);
    trackEvents = built.events;
    loopDur     = built.loopDur;
    loopStartTime = audioCtx.currentTime + 0.1;
    evIndex     = 0;

    schedulerInterval = setInterval(function () {
      if (!audioCtx || !trackEvents.length) return;
      var ahead = audioCtx.currentTime + LOOKAHEAD_MS / 1000;
      // schedule every event whose absolute time falls inside the lookahead window
      while (true) {
        if (evIndex >= trackEvents.length) { evIndex = 0; loopStartTime += loopDur; }
        var ev = trackEvents[evIndex];
        var absT = loopStartTime + ev.t;
        if (absT < ahead) { playEvent(ev, absT); evIndex++; }
        else break;
      }
    }, SCHEDULE_MS);
  }

  // ---------------------------------------------------------------------------
  // Public API (unchanged surface)
  // ---------------------------------------------------------------------------
  function unlock() {
    createContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!unlocked) {
      unlocked = true;
      if (currentTrack && schedulerInterval === null) startScheduler(currentTrack);
    }
  }

  function play(trackName) {
    stopScheduler();
    if (!TRACKS[trackName]) { currentTrack = null; return; }
    currentTrack = trackName;
    if (!unlocked || !audioCtx) return; // will start on unlock()
    if (audioCtx.state === 'suspended') audioCtx.resume();
    startScheduler(trackName);
  }

  function stop() { stopScheduler(); currentTrack = null; }

  function toggleMute() { muted = !muted; setMuted(muted); return muted; }

  function setMuted(bool) {
    muted = !!bool;
    if (masterGain) {
      masterGain.gain.cancelScheduledValues(0);
      masterGain.gain.value = muted ? 0 : masterVolume;
    }
  }

  function isMuted() { return muted; }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.audio = {
    unlock: unlock, play: play, stop: stop,
    toggleMute: toggleMute, setMuted: setMuted, isMuted: isMuted
  };
})();
