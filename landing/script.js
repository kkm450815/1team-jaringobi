/* 자린고비 — Landing Interactions (vanilla JS) */
window.Jaringobi = (function () {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- Conscience modal demo ---------- */
  let pendingHeart = null;
  function openModal(heart) {
    pendingHeart = heart;
    $('#modal-back').classList.add('show');
  }
  function closeModal() {
    pendingHeart = null;
    $('#modal-back').classList.remove('show');
  }
  function deleteHeart() {
    if (pendingHeart) {
      pendingHeart.style.transition = 'transform .3s, opacity .3s';
      pendingHeart.style.transform = 'scale(0.2) rotate(20deg)';
      pendingHeart.style.opacity = '0.2';
      pendingHeart.disabled = true;
    }
    closeModal();
  }
  $$('#hearts .heart').forEach((h) => {
    h.addEventListener('click', () => openModal(h));
  });
  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  // backdrop click
  $('#modal-back').addEventListener('click', (e) => {
    if (e.target.id === 'modal-back') closeModal();
  });

  /* ---------- Signup form ---------- */
  function handleSignup(ev) {
    ev.preventDefault();
    const email = ev.target.email.value.trim();
    const msg = $('#signup-msg');
    if (!email) return false;
    // 데모: 실제 백엔드 없이 안내. 운영 시 Formspree/Tally/Resend로 교체.
    msg.textContent = `✅ ${email} 으로 출시 알림을 보내드릴게요. 잠시만 기다려 주세요!`;
    ev.target.reset();
    // 분석 이벤트(데모): GA/Amplitude 연결 시 실제 전송으로 교체
    try {
      console.log('[event] signup_submitted', { email });
    } catch (_) {}
    return false;
  }

  /* ---------- Download click tracking (placeholder) ---------- */
  $$('a[download]').forEach((a) => {
    a.addEventListener('click', () => {
      try {
        console.log('[event] landing_download_clicked', { href: a.getAttribute('href') });
      } catch (_) {}
    });
  });

  return { closeModal, deleteHeart, handleSignup };
})();
