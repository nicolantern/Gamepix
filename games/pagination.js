(function () {
  // ===========================================================================
  // Menu pagination — show PAGE_SIZE game cards per page with prev/next nav.
  // Generic over however many .menu-btn cards exist (13 now → 8 + 5;
  // becomes 8 + 8 once the planned extra games are added).
  // ===========================================================================
  var menu = document.getElementById('menu');
  if (!menu) return;

  var PAGE_SIZE = 8;
  var buttons = Array.prototype.slice.call(menu.querySelectorAll('.menu-btn'));
  var pageCount = Math.max(1, Math.ceil(buttons.length / PAGE_SIZE));
  var page = 0;

  var nav = document.createElement('div');
  nav.id = 'menu-nav';
  nav.innerHTML =
    '<button class="page-btn" id="prev-page" aria-label="Previous page">←</button>' +
    '<span id="page-indicator"></span>' +
    '<button class="page-btn" id="next-page" aria-label="Next page">→</button>';
  // Place the nav directly after the grid, inside #menu-area.
  menu.parentNode.insertBefore(nav, menu.nextSibling);

  var prev = nav.querySelector('#prev-page');
  var next = nav.querySelector('#next-page');
  var indicator = nav.querySelector('#page-indicator');

  function render() {
    var start = page * PAGE_SIZE;
    var end = start + PAGE_SIZE;
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].style.display = (i >= start && i < end) ? '' : 'none';
    }
    indicator.textContent = 'Page ' + (page + 1) + ' / ' + pageCount;
    prev.disabled = page === 0;
    next.disabled = page >= pageCount - 1;
  }

  prev.addEventListener('click', function () { if (page > 0) { page--; render(); } });
  next.addEventListener('click', function () { if (page < pageCount - 1) { page++; render(); } });

  if (pageCount <= 1) nav.style.display = 'none';
  render();
})();
