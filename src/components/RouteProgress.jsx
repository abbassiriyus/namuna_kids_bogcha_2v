'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/RouteProgress.module.css';

// Sahifalar orasida o'tishda ekran tepasida ko'rinadigan ingichka progress
// chizig'i. Navigatsiya qancha davom etishini oldindan bilib bo'lmagani uchun
// chiziq 90% gacha asta-sekin to'ladi, sahifa ochilgach 100% ga yetib yo'qoladi.
export default function RouteProgress() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    let hideTimer;

    const start = () => {
      clearInterval(timer);
      clearTimeout(hideTimer);
      setVisible(true);
      setProgress(10);
      timer = setInterval(() => {
        // 90% dan oshmaydi — qolgani sahifa ochilganda to'ldiriladi.
        setProgress((p) => (p >= 90 ? 90 : p + Math.max(1, (90 - p) / 10)));
      }, 200);
    };

    const done = () => {
      clearInterval(timer);
      setProgress(100);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    };

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);

    return () => {
      clearInterval(timer);
      clearTimeout(hideTimer);
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router]);

  if (!visible) return null;

  return (
    <div className={styles.track} aria-hidden="true">
      <div className={styles.bar} style={{ width: `${progress}%` }} />
    </div>
  );
}
