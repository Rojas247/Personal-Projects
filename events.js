// Fuji Flame Hibachi Catering — events gallery hover preview (events.html only)
// Hover (mouse), focus (keyboard) or tap (touch screen) a gallery photo to see
// the whole photo, larger, floating over it. One preview element is shared by
// every tile; we just swap its picture and move it.

(function () {
  var tiles = document.querySelectorAll('.photo-grid-item');
  if (!tiles.length) return; // nothing to do on pages without the gallery

  var MAX_WIDTH = 560;      // preview is never wider than this (px)...
  var MAX_VW = 0.9;         // ...or 90% of the screen width
  var MAX_VH = 0.8;         // ...or 80% of the screen height
  var EDGE_GAP = 8;         // space kept between the preview and the screen edge

  // ---- build the single preview element once ----
  // aria-hidden: it's a visual extra; screen readers already get the tile's alt
  var preview = document.createElement('div');
  preview.className = 'photo-preview';
  preview.setAttribute('aria-hidden', 'true');
  var previewImg = document.createElement('img');
  previewImg.className = 'photo-preview-img';
  previewImg.alt = '';
  preview.appendChild(previewImg);
  document.body.appendChild(preview);

  var activeTile = null;     // the tile the preview currently belongs to
  var loadedLarge = {};      // large photos we've already started loading

  // is this a device with a real mouse (hover) or a touch screen?
  function canHover() {
    return window.matchMedia('(hover: hover)').matches;
  }

  // did this tile get focus from the keyboard (Tab) rather than a click/tap?
  function isKeyboardFocus(tile) {
    try {
      return tile.matches(':focus-visible');
    } catch (e) {
      return true; // very old browser without :focus-visible — just show it
    }
  }

  // ---- size + place the preview over a tile, fully inside the screen ----
  function placePreview(tile) {
    var viewW = document.documentElement.clientWidth; // excludes the scrollbar
    var viewH = window.innerHeight;

    // the tile's own photo tells us the real shape (the grid crops it to 4:3)
    var ratio = (tile.naturalWidth && tile.naturalHeight) ? tile.naturalWidth / tile.naturalHeight : 4 / 3;

    // biggest size that fits all three limits, keeping the photo's shape
    var width = Math.min(MAX_WIDTH, viewW * MAX_VW);
    var height = width / ratio;
    if (height > viewH * MAX_VH) {
      height = viewH * MAX_VH;
      width = height * ratio;
    }

    // start centred over the tile...
    var rect = tile.getBoundingClientRect();
    var left = rect.left + rect.width / 2 - width / 2;
    var top = rect.top + rect.height / 2 - height / 2;

    // ...then nudge it back inside the screen if it pokes out of any edge
    left = Math.max(EDGE_GAP, Math.min(left, viewW - width - EDGE_GAP));
    top = Math.max(EDGE_GAP, Math.min(top, viewH - height - EDGE_GAP));

    preview.style.width = Math.round(width) + 'px';
    preview.style.height = Math.round(height) + 'px';
    preview.style.left = Math.round(left) + 'px';
    preview.style.top = Math.round(top) + 'px';
  }

  // ---- show / hide ----
  function showPreview(tile) {
    activeTile = tile;
    var largeSrc = tile.getAttribute('data-large');

    // show the small photo straight away (already downloaded for the grid)...
    previewImg.src = tile.currentSrc || tile.src;
    previewImg.alt = tile.alt;

    // ...and swap in the large one once it has loaded. It's only requested
    // the first time this tile is hovered/focused/tapped.
    if (largeSrc) {
      var loader = loadedLarge[largeSrc];
      if (!loader) {
        loader = new Image();
        loader.src = largeSrc;
        loadedLarge[largeSrc] = loader;
      }
      var swapIn = function () {
        if (activeTile === tile) previewImg.src = largeSrc;
      };
      if (loader.complete && loader.naturalWidth) swapIn();
      else loader.addEventListener('load', swapIn, { once: true });
    }

    placePreview(tile);
    preview.classList.add('is-visible');
  }

  function hidePreview() {
    activeTile = null;
    preview.classList.remove('is-visible');
  }

  // ---- wire up every tile ----
  tiles.forEach(function (tile) {
    // mouse: show while the pointer is over the tile
    tile.addEventListener('mouseenter', function () {
      if (canHover()) showPreview(tile);
    });
    tile.addEventListener('mouseleave', function () {
      if (canHover() && activeTile === tile) hidePreview();
    });

    // keyboard: show on focus (Tab), hide when focus moves away.
    // Clicks and taps also focus the tile, so only react to keyboard focus
    // (:focus-visible); mouse and touch are handled by their own events
    tile.addEventListener('focus', function () {
      if (isKeyboardFocus(tile)) showPreview(tile);
    });
    tile.addEventListener('blur', function () {
      if (activeTile === tile) hidePreview();
    });

    // touch screens: tap to show, tap the same photo again to hide
    tile.addEventListener('click', function () {
      if (canHover()) return; // mouse users already get it on hover
      if (activeTile === tile && preview.classList.contains('is-visible')) {
        hidePreview();
        tile.blur(); // tapping also focuses the tile; drop that so it fully resets
      } else {
        showPreview(tile);
      }
    });
  });

  // touch screens: tapping anywhere that isn't a gallery photo hides it
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.photo-grid-item')) hidePreview();
  });

  // Escape key hides it (handy for keyboard users)
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') hidePreview();
  });

  // keep it lined up with its tile if the page scrolls or the window resizes
  var ticking = false;
  function followTile() {
    ticking = false;
    if (activeTile) placePreview(activeTile);
  }
  function requestFollow() {
    if (!ticking && activeTile) {
      ticking = true;
      window.requestAnimationFrame(followTile);
    }
  }
  window.addEventListener('scroll', requestFollow, { passive: true });
  window.addEventListener('resize', requestFollow);
})();
