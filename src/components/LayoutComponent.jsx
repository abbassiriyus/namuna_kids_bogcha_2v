'use client';

import Sidebar from './Sidebar';
import styles from '../styles/Layout.module.css';

export default function LayoutComponent({ children }) {
  return (
    <div className={styles.layout}>
      <div className={styles.ornament} aria-hidden="true" />
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
