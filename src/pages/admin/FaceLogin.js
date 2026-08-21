'use client';

import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import url from '../../host/host';

export default function FaceLogin() {
  const webcamRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    const loadModels = async () => {
      const faceapi = await import('face-api.js');
      const MODEL_URL = `${url}/models`;
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  const detectFace = async () => {
    const faceapi = await import('face-api.js');
    const video = webcamRef.current.video;
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return alert('Yuz topilmadi');

    const descriptor = Array.from(detection.descriptor); // Float32Array to Array
    const res = await axios.post(`${url}/api/check-face`, { descriptor });

    if (res.data?.match) {
      setResult(`Hodim: ${res.data.match.name}`);
      await axios.post(`${url}/api/yolama`, { xodim_id: res.data.match.id }); // vaqtni saqlash
    } else {
      setResult('Hodim topilmadi');
    }
  };

  return (
    <div>
      <h2>Face Login</h2>
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={detectFace} disabled={!modelsLoaded}>Yuzni Tekshirish</button>
      <p>{result}</p>
    </div>
  );
}
