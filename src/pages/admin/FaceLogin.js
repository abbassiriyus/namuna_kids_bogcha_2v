'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Check, LogOut, Loader2, RotateCcw, PartyPopper, ScanFace, Users, RefreshCw } from 'lucide-react';
import url from '../../host/host';
import styles from '../../styles/FaceLogin.module.css';
import { getDavomatMood, formatMinutes } from '../../utils/davomatMood';
import FaceCaptureModal from '../../components/FaceCaptureModal';
import { useLang } from '../../i18n/LanguageContext';

const SCAN_INTERVAL_MS = 600;
const RESET_DELAY_MS = 3500;

export default function FaceLogin() {
  const { t } = useLang();
  const webcamRef = useRef();
  const faceapiRef = useRef(null);
  const scanningRef = useRef(false); // guards against overlapping detections
  const cooldownRef = useRef(false); // true while showing the "notmatched" flash
  const [active, setActive] = useState(false); // gated by "Yuzni tekshirishni boshlash" button
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState('Kameraga qarang...'); // small status line
  const [scanState, setScanState] = useState('scanning'); // 'scanning' | 'checking' | 'notmatched' | 'matched'
  const [recognized, setRecognized] = useState(null); // { id, name, todayStatus }
  const [actionResult, setActionResult] = useState(null); // { type, text }
  const [actionLoading, setActionLoading] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [roster, setRoster] = useState([]); // barcha xodimlar + bugungi davomati
  const [rosterLoading, setRosterLoading] = useState(true);
  const [showRoster, setShowRoster] = useState(true);
  const [faceEditEmployee, setFaceEditEmployee] = useState(null); // yuzi qayta yozilayotgan xodim

  // Yuzni saqlash uchun token kerak (POST /api/xodim/:id/face himoyalangan).
  const authHeader = {
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
    },
  };

  // Barcha xodimlarning bugungi holatini bitta so'rovda olamiz.
  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const res = await axios.get(`${url}/api/today-roster`);
      setRoster(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Xodimlar ro‘yxatini olishda xatolik:', err);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const loadModels = async () => {
      const faceapi = await import('face-api.js');
      faceapiRef.current = faceapi;
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      if (!cancelled) setModelsLoaded(true);
    };
    loadModels();
    return () => { cancelled = true; };
  }, [active]);

  const detectOnce = useCallback(async () => {
    if (scanningRef.current || cooldownRef.current || recognized) return;
    const faceapi = faceapiRef.current;
    const video = webcamRef.current?.video;
    if (!faceapi || !video || video.readyState !== 4) return;

    scanningRef.current = true;
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setScanState('scanning');
        setStatus('Kameraga qarang...');
        return;
      }

      setScanState('checking');
      setStatus('Aniqlanmoqda...');
      const descriptor = Array.from(detection.descriptor);
      const res = await axios.post(`${url}/api/check-face`, { descriptor });

      if (!res.data?.match) {
        cooldownRef.current = true;
        setScanState('notmatched');
        setStatus('Mos kelmadi — yuz tanilmadi');
        setTimeout(() => {
          cooldownRef.current = false;
          setScanState('scanning');
          setStatus('Kameraga qarang...');
        }, 1600);
        return;
      }

      setScanState('matched');
      setRecognized({ ...res.data.match, todayStatus: res.data.todayStatus });
      setStatus('');
    } catch (err) {
      console.error('Yuzni aniqlashda xatolik:', err);
      cooldownRef.current = true;
      setScanState('notmatched');
      setStatus(t('errorOccurred'));
      setTimeout(() => {
        cooldownRef.current = false;
        setScanState('scanning');
        setStatus('Kameraga qarang...');
      }, 1600);
    } finally {
      scanningRef.current = false;
    }
  }, [recognized]);

  useEffect(() => {
    if (!modelsLoaded) return;
    const interval = setInterval(detectOnce, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [modelsLoaded, detectOnce]);

  const reset = () => {
    cooldownRef.current = false;
    setRecognized(null);
    setActionResult(null);
    setScanState('scanning');
    setStatus('Kameraga qarang...');
    loadRoster(); // ro'yxatdagi holat ham yangilansin
  };

  const handleAction = async (action) => {
    if (!recognized) return;
    setActionLoading(true);
    try {
      const res = await axios.post(`${url}/api/yolama`, { xodim_id: recognized.id, action });
      const time = action === 'kelish' ? res.data?.record?.start_time : res.data?.record?.end_time;
      const timeText = time ? time.slice(0, 5) : '';
      setActionResult({
        type: 'success',
        text: action === 'ketish'
          ? `Xayr, ${recognized.name}! Ketish belgilandi (${timeText})`
          : `Xush kelibsiz, ${recognized.name}! Kelish belgilandi (${timeText})`,
      });
    } catch (err) {
      setActionResult({ type: 'error', text: err.response?.data?.message || t('errorOccurred') });
    } finally {
      setActionLoading(false);
      setTimeout(reset, RESET_DELAY_MS);
    }
  };

  // scope: 'end' -> faqat ketish vaqtini bekor qiladi (kelish vaqti saqlanadi)
  //        'all' -> butun kunlik yozuvni bekor qiladi (kelish ham, ketish ham)
  const handleUndo = async (scope) => {
    if (!recognized) return;
    setUndoLoading(true);
    try {
      await axios.delete(`${url}/api/xodim/${recognized.id}/today-undo`, { params: { scope } });
      setActionResult({
        type: 'success',
        text: scope === 'end' ? 'Ketish vaqti bekor qilindi' : 'Bugungi belgi bekor qilindi',
      });
    } catch (err) {
      setActionResult({ type: 'error', text: err.response?.data?.message || 'Bekor qilishda xatolik' });
    } finally {
      setUndoLoading(false);
      setTimeout(reset, RESET_DELAY_MS);
    }
  };

  const todayState = recognized?.todayStatus?.state; // 'none' | 'open' | 'done'

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Yuz orqali davomat</h2>

      {!active ? (
        <button className={styles.startBtn} onClick={() => setActive(true)}>
          <ScanFace size={22} /> Yuzni tekshirishni boshlash
        </button>
      ) : (
        <>
          <div className={`${styles.videoWrap} ${styles[`state_${scanState}`] || ''}`}>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className={styles.video} />
            {!recognized && modelsLoaded && (
              <>
                {scanState !== 'notmatched' && <div className={styles.scanLine} />}
                <div className={styles.scanCorners}>
                  <span className={styles.cornerTL} />
                  <span className={styles.cornerTR} />
                  <span className={styles.cornerBL} />
                  <span className={styles.cornerBR} />
                </div>
                {scanState === 'notmatched' && (
                  <div className={styles.notMatchedOverlay}>Mos kelmadi</div>
                )}
              </>
            )}
          </div>

          {!modelsLoaded && (
            <p className={styles.status}><Loader2 size={14} className={styles.spin} /> Tizim yuklanmoqda...</p>
          )}

          {modelsLoaded && !recognized && <p className={styles.status}>{status}</p>}
        </>
      )}

      {recognized && (
        <div className={styles.recognizedBox}>
          <p className={styles.recognizedName}>{recognized.name}</p>

          {actionResult ? (
            <p className={`${styles.result} ${actionResult.type === 'success' ? styles.resultSuccess : styles.resultError}`}>
              {actionResult.text}
            </p>
          ) : todayState === 'done' ? (
            <>
              <p className={styles.doneMsg}>
                <PartyPopper size={18} /> Siz bugungi kuni yakunladingiz
              </p>
              <button className={styles.kelBtn} onClick={reset}>
                Keyingi xodim
              </button>
            </>
          ) : (
            <div className={styles.actionRow}>
              {todayState === 'open' ? (
                <button className={styles.ketBtn} onClick={() => handleAction('ketish')} disabled={actionLoading}>
                  <LogOut size={18} /> Ishdan ketdim
                </button>
              ) : (
                <button className={styles.kelBtn} onClick={() => handleAction('kelish')} disabled={actionLoading}>
                  <Check size={18} /> Ishga keldim
                </button>
              )}
            </div>
          )}

          {!actionResult && todayState !== 'none' && (
            <div className={styles.undoRow}>
              {todayState === 'done' ? (
                <>
                  <button className={styles.undoLink} onClick={() => handleUndo('end')} disabled={undoLoading}>
                    <RotateCcw size={13} /> {undoLoading ? t('cancelling') : 'Ketish vaqti xato — shuni bekor qilish'}
                  </button>
                  <button className={styles.undoLink} onClick={() => handleUndo('all')} disabled={undoLoading}>
                    <RotateCcw size={13} /> {undoLoading ? t('cancelling') : 'Kelish vaqti ham xato — hammasini bekor qilish'}
                  </button>
                </>
              ) : (
                <button className={styles.undoLink} onClick={() => handleUndo('all')} disabled={undoLoading}>
                  <RotateCcw size={13} /> {undoLoading ? t('cancelling') : 'Kelish vaqti xato — bekor qilish'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barcha xodimlarning FAQAT bugungi kelish/ketish holati */}
      <div className={styles.rosterBox}>
        <div className={styles.rosterHead}>
          <span className={styles.rosterTitle}>
            <Users size={16} /> Bugungi davomat ({roster.length})
          </span>
          <div className={styles.rosterHeadBtns}>
            <button className={styles.rosterBtn} onClick={loadRoster} disabled={rosterLoading} title={t('refresh')}>
              <RefreshCw size={14} className={rosterLoading ? styles.spin : ''} />
            </button>
            <button className={styles.rosterBtn} onClick={() => setShowRoster((v) => !v)}>
              {showRoster ? 'Yashirish' : 'Ko‘rsatish'}
            </button>
          </div>
        </div>

        {showRoster && (
          rosterLoading && roster.length === 0 ? (
            <p className={styles.status}><Loader2 size={14} className={styles.spin} /> Yuklanmoqda...</p>
          ) : roster.length === 0 ? (
            <p className={styles.status}>{t('employeesNotFound')}</p>
          ) : (
            <div className={styles.rosterScroll}>
              <table className={styles.rosterTable}>
                <thead>
                  <tr>
                    <th>{t('colEmployee')}</th>
                    <th>{t('colPlan')}</th>
                    <th>{t('colAttended')}</th>
                    <th>Ketgan</th>
                    <th>Kechikkan</th>
                    <th>Kayfiyat</th>
                    <th>Face ID</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((x) => {
                    const mood = getDavomatMood({
                      startTime: x.kelgan,
                      endTime: x.ketgan,
                      planStart: x.plan_start,
                      planEnd: x.plan_end,
                      seed: x.id,
                    });
                    return (
                      <tr key={x.id}>
                        <td>
                          {x.name}
                          {!x.face_bor && <span className={styles.noFaceTag} title={t('faceNotSaved')}>{t('noFaceShort')}</span>}
                        </td>
                        <td>
                          {(x.plan_start || '--:--').slice(0, 5)}–{(x.plan_end || '--:--').slice(0, 5)}
                        </td>
                        <td>{x.kelgan ? x.kelgan.slice(0, 5) : '-'}</td>
                        <td>{x.ketgan ? x.ketgan.slice(0, 5) : (x.kelgan ? 'ishda' : '-')}</td>
                        <td>{formatMinutes(mood.kechikish)}</td>
                        <td className={styles.rosterMood} title={mood.label}>{mood.sticker}</td>
                        <td>
                          {/* Yuz ma'lumotini shu yerda — kamera yonida — qayta yozish */}
                          <button
                            className={styles.rosterFaceBtn}
                            onClick={() => setFaceEditEmployee({ id: x.id, name: x.name })}
                            title={x.face_bor ? 'Yuzni qayta yozish' : 'Yuzni saqlash'}
                          >
                            <ScanFace size={14} /> {x.face_bor ? 'Yangilash' : 'Saqlash'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {faceEditEmployee && (
        <FaceCaptureModal
          employee={faceEditEmployee}
          authHeader={authHeader}
          onClose={() => { setFaceEditEmployee(null); loadRoster(); }}
        />
      )}
    </div>
  );
}
