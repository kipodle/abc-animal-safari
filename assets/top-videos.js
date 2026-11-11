/* Click a top-5 video card to play it in the player above (falls back to opening YouTube). */
(function () {
  var frame = document.getElementById('top-player'); if (!frame) return;
  var cards = document.querySelectorAll('.top-card');
  Array.prototype.forEach.call(cards, function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      frame.src = 'https://www.youtube-nocookie.com/embed/' + a.getAttribute('data-vid') + '?autoplay=1';
      frame.title = a.getAttribute('data-title') + ' on YouTube';
      Array.prototype.forEach.call(cards, function (c) { c.removeAttribute('aria-current'); });
      a.setAttribute('aria-current', 'true');
      var r = frame.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
})();
