import "../styles/globals.css";
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import initModalBodyLock from '../utils/modalBodyLock';
import { LanguageProvider } from '../i18n/LanguageContext';

const AxiosSetup = dynamic(() => import('../components/AxiosSetup'), { ssr: false });

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const cleanup = initModalBodyLock();
    return () => cleanup && cleanup();
  }, []);

  return (
      <LanguageProvider>
          <AxiosSetup />
          <Component {...pageProps} />
      </LanguageProvider>
  );
}
export default MyApp;
