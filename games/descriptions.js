(function () {
  // ===========================================================================
  // Per-game descriptions + an info popup. Each menu card gets a small (i)
  // button; clicking it opens a modal with the game's blurb, metadata, and a
  // Play button. The card body still launches the game directly as before.
  //
  // Copy marked "verbatim" is user-supplied. The rest are drafts in the same
  // voice/format — safe to replace by editing the matching entry below.
  // ===========================================================================
  var GAMES = {
    snake: { // verbatim
      title: 'Snake',
      paragraphs: [
        "Slither your way to the top in this timeless arcade classic! Guide your hungry snake around the board, collect food to grow longer, and rack up the highest score possible. But watch out—every bite makes your snake bigger, leaving less room to maneuver. One wrong turn into a wall or your own tail, and it's game over!",
        "With simple controls, fast-paced gameplay, and endless replayability, Snake is easy to learn but challenging to master. How long can you survive, and can you set a new high score? 🐍🎮"
      ],
      genre: 'Arcade, Casual',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Eat food, grow your snake, and avoid collisions for as long as possible.'
    },

    pong: { // verbatim
      title: 'Pong',
      paragraphs: [
        "Step into the world of classic arcade gaming with Pong! Control your paddle and keep the ball in play as you battle against an opponent in a fast-paced test of timing and reflexes. Score points by sending the ball past your rival's paddle while defending your own side of the screen.",
        "Easy to pick up but surprisingly competitive, Pong delivers simple yet addictive gameplay that has entertained players for generations. Whether you're aiming for a quick match or trying to become a paddle master, every rally keeps the action going!"
      ],
      genre: 'Arcade, Sports',
      players: '1 Players',
      difficulty: 'Easy to Learn, Challenging to Master',
      objective: "Outscore your opponent by keeping the ball in play and preventing it from getting past your paddle."
    },

    tictactoe: { // verbatim
      title: 'Tic-Tac-Toe',
      paragraphs: [
        "Put your thinking skills to the test in Tic-Tac-Toe! Take turns placing Xs and Os on the board and compete to get three in a row before your opponent. Plan your moves carefully, block incoming threats, and create winning combinations to claim victory.",
        "Whether you're playing against a friend or challenging the computer, every match is a quick battle of strategy and decision-making."
      ],
      genre: 'Puzzle, Board Game',
      players: '1–2 Players',
      difficulty: 'Beginner',
      objective: 'Get three matching symbols in a row horizontally, vertically, or diagonally.'
    },

    memory: { // draft
      title: 'Memory Match',
      paragraphs: [
        "Put your memory to the test in this classic card-matching challenge! Flip over two cards at a time and hunt down every hidden pair on the board. Remember where each card lies, because a sharp memory is your greatest weapon.",
        "With each pair you clear, the board opens up and the satisfaction grows. Easy enough for anyone to enjoy yet a real test of focus, Memory Match keeps you coming back to beat your best. How few moves can you do it in? 🧠🃏"
      ],
      genre: 'Puzzle, Casual',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Tests Your Memory',
      objective: 'Find and clear every matching pair of cards in as few flips as possible.'
    },

    flappy: { // draft
      title: 'Flappy Bird',
      paragraphs: [
        "Tap your way through the skies in this addictively tricky arcade hit! Keep your bird airborne with perfectly timed flaps and thread the gaps between an endless gauntlet of pipes. One mistimed tap and it's straight to the ground.",
        "Deceptively simple but brutally challenging, Flappy Bird will have you saying 'just one more try' again and again. Every pipe you clear pushes your score higher. How far can you fly? 🐦"
      ],
      genre: 'Arcade, Casual',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Flap through as many pipe gaps as possible without crashing.'
    },

    breakout: { // draft
      title: 'Breakout',
      paragraphs: [
        "Smash your way to victory in this brick-busting arcade classic! Bounce the ball off your paddle to chip away at the wall of bricks above, clearing the board one hit at a time. Keep the ball in play and don't let it slip past you.",
        "Fast reflexes and sharp angles are the keys to a high score. With every brick you break, the action heats up. Can you clear them all? 🧱🎮"
      ],
      genre: 'Arcade, Action',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Challenging to Master',
      objective: "Destroy every brick by bouncing the ball off your paddle without letting it fall."
    },

    '2048': { // draft
      title: '2048',
      paragraphs: [
        "Slide, merge, and strategize your way to the legendary 2048 tile! Swipe to shift the numbered tiles across the grid, combining matching pairs to build ever-bigger numbers. Every move fills the board a little more, so plan ahead.",
        "Simple to pick up but seriously addictive, 2048 is a number puzzle that rewards smart, patient play. Can you reach 2048—or push even higher? 🔢"
      ],
      genre: 'Puzzle, Strategy',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Combine matching tiles to reach the 2048 tile before the board fills up.'
    },

    whack: { // draft
      title: 'Whack-a-Mole',
      paragraphs: [
        "Test your reflexes in this frantic, fast-paced favorite! Moles keep popping up out of their holes—your job is to whack them back down as quickly as you can before they vanish. The faster you react, the higher your score climbs.",
        "Easy to learn but a real workout for your reflexes, Whack-a-Mole gets more hectic the longer you play. How many can you bonk before time runs out? 🔨"
      ],
      genre: 'Arcade, Action',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Reflex Challenge',
      objective: 'Whack as many moles as possible before they disappear.'
    },

    dino: { // draft
      title: 'Dino Run',
      paragraphs: [
        "Dash across the desert in this endless-runner adventure! Jump over towering cacti and duck beneath obstacles as your dino sprints faster and faster. The longer you run, the tougher it gets.",
        "One tap is all it takes to leap to safety, but timing is everything. Simple, snappy, and endlessly replayable, Dino Run is the perfect quick-score chase. How far can your dino go? 🦖"
      ],
      genre: 'Arcade, Endless Runner',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Run as far as possible while dodging every obstacle in your path.'
    },

    tetris: { // draft
      title: 'Tetris',
      paragraphs: [
        "Stack, clear, and chase the perfect line in the all-time puzzle legend! Rotate and place falling blocks to form solid rows that vanish for points. The pieces fall faster as you go, so think quick and plan ahead.",
        "Easy to grasp yet impossible to put down, Tetris rewards both speed and strategy. Keep the stack low, chain those line clears, and aim for a new high score! 🟦🟥"
      ],
      genre: 'Puzzle, Arcade',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Clear lines by completing full rows without letting the stack reach the top.'
    },

    invaders: { // draft
      title: 'Space Invaders',
      paragraphs: [
        "Defend the galaxy in this iconic arcade shooter! Blast wave after wave of descending alien invaders while dodging their return fire. Move quick, aim true, and hold the line as the aliens close in.",
        "The invaders speed up as their numbers thin, ramping the tension with every shot. A timeless test of aim and nerve, Space Invaders dares you to survive just one more wave. How long can you hold out? 👾"
      ],
      genre: 'Arcade, Shooter',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Challenging to Master',
      objective: 'Shoot down every alien invader before they reach you.'
    },

    asteroids: { // draft
      title: 'Asteroids',
      paragraphs: [
        "Pilot your ship through a hazardous field of tumbling space rocks! Thrust, rotate, and fire to blast asteroids apart—just watch out, because every big rock splits into smaller, faster ones. Stay sharp and keep moving.",
        "With drifting momentum and no walls to stop you, Asteroids is a pure test of control and reflexes. Clear the field and survive the chaos. How long can you last among the rocks? 🚀☄️"
      ],
      genre: 'Arcade, Shooter',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Destroy every asteroid while avoiding collisions and surviving as long as possible.'
    },

    pacman: { // draft
      title: 'Pac-Man',
      paragraphs: [
        "Chomp your way through the maze in this beloved arcade icon! Gobble up every pellet while outrunning the four colorful ghosts hot on your trail. Grab a power pellet and turn the tables to chase them down for bonus points.",
        "Quick thinking and clever routes are the keys to clearing each maze. Endlessly fun and instantly recognizable, Pac-Man keeps the chase alive. Can you clear the board and rack up a top score? 🟡👻"
      ],
      genre: 'Arcade, Maze',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Eat all the pellets while avoiding the ghosts to clear each maze.'
    },

    frogger: { // draft
      title: 'Frogger',
      paragraphs: [
        "Hop your way to safety in this all-time arcade classic! Guide your frog across a busy highway of speeding traffic, then leap from log to log over a treacherous river to reach the home bays at the top. Time every jump—one wrong move and it's splat or splash!",
        "Dodge, ride, and hop with quick reflexes and careful timing. Fill all five bays to clear the level, then do it again as everything speeds up. How many levels can you conquer? 🐸🚗"
      ],
      genre: 'Arcade, Action',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Cross the road and river to fill all five home bays without getting hit or drowning.'
    },

    doodle: { // draft
      title: 'Doodle Jump',
      paragraphs: [
        "Bounce your way to the sky in this addictive vertical hopper! Your doodler springs upward all on its own—your job is to steer left and right, landing on platform after platform to climb ever higher. Drift off one side and you'll pop out the other!",
        "Watch out for moving platforms and the long drop below. One missed landing and it's a plunge to the bottom. Simple one-handed controls, endless climbing, and a high score that's always just out of reach. How high can you bounce? 🟡⬆️"
      ],
      genre: 'Arcade, Casual',
      players: 'Single Player',
      difficulty: 'Easy to Learn, Hard to Master',
      objective: 'Bounce as high as possible from platform to platform without falling off the bottom.'
    }
  };

  // ---------------------------------------------------------------------------
  // Build the modal once and reuse it.
  // ---------------------------------------------------------------------------
  var modal = document.createElement('div');
  modal.id = 'info-modal';
  modal.className = 'info-modal';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="info-backdrop"></div>' +
    '<div class="info-card" role="dialog" aria-modal="true" aria-labelledby="info-title">' +
      '<button class="info-close" aria-label="Close">×</button>' +
      '<h2 id="info-title"></h2>' +
      '<div class="info-body"></div>' +
      '<dl class="info-meta"></dl>' +
      '<button class="info-play">▶ Play</button>' +
    '</div>';
  document.body.appendChild(modal);

  var titleEl = modal.querySelector('#info-title');
  var bodyEl  = modal.querySelector('.info-body');
  var metaEl  = modal.querySelector('.info-meta');
  var playEl  = modal.querySelector('.info-play');
  var currentId = null;

  function metaRow(label, value) {
    return '<dt>' + label + '</dt><dd>' + value + '</dd>';
  }

  function openModal(id) {
    var g = GAMES[id];
    if (!g) return;
    currentId = id;
    titleEl.textContent = g.title;
    bodyEl.innerHTML = g.paragraphs.map(function (p) {
      // textContent-equivalent escaping via a throwaway node
      var d = document.createElement('p');
      d.textContent = p;
      return d.outerHTML;
    }).join('');
    metaEl.innerHTML =
      metaRow('Genre', g.genre) +
      metaRow('Players', g.players) +
      metaRow('Difficulty', g.difficulty) +
      metaRow('Objective', g.objective);
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    currentId = null;
  }

  // Play launches the game by re-using the existing menu click flow.
  playEl.addEventListener('click', function () {
    var id = currentId;
    closeModal();
    if (!id) return;
    var btn = document.querySelector('.menu-btn[data-game="' + id + '"]');
    if (btn) btn.click();
  });

  modal.querySelector('.info-close').addEventListener('click', closeModal);
  modal.querySelector('.info-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // ---------------------------------------------------------------------------
  // Inject an (i) button into every menu card that has a description.
  // ---------------------------------------------------------------------------
  var buttons = document.querySelectorAll('.menu-btn');
  for (var i = 0; i < buttons.length; i++) {
    (function (btn) {
      var id = btn.dataset.game;
      if (!GAMES[id]) return;
      var info = document.createElement('span');
      info.className = 'info-btn';
      info.textContent = 'ⓘ';
      info.setAttribute('role', 'button');
      info.setAttribute('tabindex', '0');
      info.setAttribute('aria-label', 'About ' + GAMES[id].title);
      info.addEventListener('click', function (e) {
        e.stopPropagation(); // don't let the click launch the game
        openModal(id);
      });
      info.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          openModal(id);
        }
      });
      btn.appendChild(info);
    })(buttons[i]);
  }
})();
