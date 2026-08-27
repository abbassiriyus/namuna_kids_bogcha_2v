'use client';

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import url from '../host/host';
import styles from '../styles/FaceCaptureModal.module.css';
import { getText } from '../i18n/translations';

// Har qanday xodim uchun yuz tanish (Face ID) ma'lumotini yozib olish yoki
// yangilash uchun umumiy modal. Hodimlar sahifasida ham, Davomat sahifasida
// ham xuddi shu komponent ishlatiladi — yuz olish mantig'i bitta joyda.
export default function FaceCaptureModal({ employee, onClose, authHeader }) {
  const webcamRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;
    setModelsLoaded(false);
    setMessage(null);
    (async () => {
      try {
        const faceapi = await import('face-api.js');
        const MODEL_URL = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        if (!cancelled) setModelsLoaded(true);
      } catch (err) {
        console.error('Yuz aniqlash modelini yuklashda xatolik:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [employee]);

  const handleCapture = async () => {
    if (!employee) return;
    setCapturing(true);
    setMessage(null);
    try {
      const faceapi = await import('face-api.js');
      const video = webcamRef.current?.video;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage({ type: 'error', text: 'Yuz topilmadi. Kameraga yaqinroq turing.' });
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      await axios.post(`${url}/api/xodim/${employee.id}/face`, { descriptor }, authHeader);
      setMessage({ type: 'success', text: 'Yuz muvaffaqiyatli saqlandi!' });
    } catch (err) {
      console.error('Yuzni saqlashda xatolik:', err);
      setMessage({ type: 'error', text: 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.' });
    } finally {
      setCapturing(false);
    }
  };

  if (!employee) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{employee.name} — {getText('face.saveTitle')}</h3>
        <div className={styles.videoBox}>
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
        </div>
        {!modelsLoaded && <p className={styles.hint}>{getText('face.loading')}</p>}
        {message && (
          <p className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </p>
        )}
        <div className={styles.modalButtons}>
          <button onClick={handleCapture} disabled={!modelsLoaded || capturing}>
            {capturing ? getText('face.saving') : getText('face.saveButton')}
          </button>
          <button onClick={onClose}>{getText('close')}</button>
        </div>
      </div>
    </div>
  );
}
