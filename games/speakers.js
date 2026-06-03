(function () {
  // ===========================================================================
  // Menu soundbar — a row of tiny speaker cabinets that thump on every kick.
  // Driven by the audio engine's onBeat() hook (fires the instant a kick sounds,
  // only when unmuted). Self-contained: builds its own DOM, exposes nothing.
  // ===========================================================================
  var bar = document.getElementById('speaker-bar');
  if (!bar) return;

  var COUNT = 5;
  var units = [];
  for (var i = 0; i < COUNT; i++) {
    var cab = document.createElement('div');
    cab.className = 'speaker';
    cab.innerHTML =
      '<span class="cone cone-tweeter"></span>' +
      '<span class="cone cone-woofer"></span>';
    bar.appendChild(cab);
    units.push(cab);
  }

  function thumpOne(u) {
    u.classList.remove('thump');
    void u.offsetWidth; // force reflow so the CSS animation restarts from frame 0
    u.classList.add('thump');
  }

  // On each kick, thump a random handful (1–3) of random speakers rather than the
  // whole row — gives the bar a lively, scattered feel instead of a unison bounce.
  function thump() {
    var pool = units.slice();
    var count = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
    for (var i = 0; i < count && pool.length; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      thumpOne(pool.splice(idx, 1)[0]); // splice keeps picks distinct within a beat
    }
  }

  var audio = window.MiniGames && window.MiniGames.audio;
  if (audio && audio.onBeat) audio.onBeat(thump);
})();
