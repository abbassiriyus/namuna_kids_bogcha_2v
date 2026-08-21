// Observes DOM for modal overlay elements and toggles `modal-open` on <body>
export default function initModalBodyLock() {
  if (typeof window === 'undefined') return;

  const checkAndToggle = () => {
    const hasModal = !!document.querySelector('.modalOverlay, .modal, .modalOverlay__root');
    document.body.classList.toggle('modal-open', hasModal);
  };

  // Initial check
  checkAndToggle();

  const observer = new MutationObserver(() => {
    checkAndToggle();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });

  // Return a cleanup function if caller wants to disconnect
  return () => observer.disconnect();
}
