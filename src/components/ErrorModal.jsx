'use client';
import { useEffect, useState } from 'react';
import styles from '../styles/ErrorModal.module.css';

const ErrorModal = ({ message, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !message) return null; // SSR paytida null

  return (
    <div className={styles.errorModal}>
      <div className={styles.errorContent}>
        <p>{message}</p>
        <button onClick={onClose}>Yopish</button>
      </div>
    </div>
  );
};

export default ErrorModal;
