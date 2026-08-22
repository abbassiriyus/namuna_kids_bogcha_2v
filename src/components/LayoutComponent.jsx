'use client';

import Sidebar from './Sidebar';
import RouteProgress from './RouteProgress';
import styles from '../styles/Layout.module.css';

export default function LayoutComponent({ children }) {
  return (
    <div className={styles.layout}>
      <RouteProgress />
      <div className={styles.ornament} aria-hidden="true" />
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
