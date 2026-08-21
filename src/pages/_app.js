import "../styles/globals.css";
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import initModalBodyLock from '../utils/modalBodyLock';

const AxiosSetup = dynamic(() => import('../components/AxiosSetup'), { ssr: false });

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const cleanup = initModalBodyLock();
    return () => cleanup && cleanup();
  }, []);

  return (
      <>
          <AxiosSetup />
          <Component {...pageProps} />
      </>
  );
}
export default MyApp;