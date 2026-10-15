// Fix broken images using data URIs
(function() {
  function fixImages() {
    if (!window.IMG_DATA) return;
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || '';
      const name = src.split('/').pop();
      if (window.IMG_DATA[name] && !img.src.startsWith('data:')) {
        img.src = window.IMG_DATA[name];
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixImages);
  } else { fixImages(); }
  new MutationObserver(fixImages).observe(document.body, { childList: true, subtree: true });
})();
