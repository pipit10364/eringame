/* Supaya kolom jawaban, pesan hasil, dan pop-up tidak tertutup keyboard HP. */
(function(){
  var vv = window.visualViewport, root = document.documentElement;
  function sync(){ if (!vv) return; root.style.setProperty('--vvh', vv.height + 'px'); root.style.setProperty('--vvt', vv.offsetTop + 'px'); }
  function ensure(el){
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect(), top = vv ? vv.offsetTop : 0, h = vv ? vv.height : innerHeight, bottom = top + h;
    if (r.bottom > bottom - 12) window.scrollBy({ top: r.bottom - bottom + 20, behavior: 'smooth' });
    else if (r.top < top + 8) window.scrollBy({ top: r.top - top - 16, behavior: 'smooth' });
  }
  function isField(t){ return t && /^(INPUT|TEXTAREA)$/.test(t.tagName); }
  function onResize(){ sync(); var a = document.activeElement; if (isField(a)) setTimeout(function(){ ensure(a); }, 80); }
  if (vv){ vv.addEventListener('resize', onResize); vv.addEventListener('scroll', sync); }
  sync();
  document.addEventListener('focusin', function(e){ var t = e.target; if (isField(t)) setTimeout(function(){ ensure(t); }, 350); });
  document.addEventListener('DOMContentLoaded', function(){
    var timer = null;
    new MutationObserver(function(list){
      for (var i = 0; i < list.length; i++){
        var n = list[i].target, el = n && (n.nodeType === 1 ? n : n.parentElement), box = el && el.closest && el.closest('.feedback,.result-box');
        if (box && box.offsetParent !== null && (box.textContent || '').trim()){ clearTimeout(timer); timer = setTimeout(function(){ ensure(box); }, 140); return; }
      }
    }).observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['class'], characterData:true });
  });
})();
