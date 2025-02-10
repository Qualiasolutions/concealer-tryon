import React, { useRef, useEffect, useState } from 'react';
import * as faceMesh from '@mediapipe/face_mesh';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [concealerColor, setConcealerColor] = useState('rgba(255, 0, 0, 0.3)'); // Initial concealer color

  const predefinedShades = {
    "light": "rgba(255, 220, 180, 0.5)",
    "medium": "rgba(255, 180, 100, 0.5)",
    "dark": "rgba(180, 120, 80, 0.5)",
    "red": "rgba(255, 0, 0, 0.3)", // Example Red shade
  };

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;

        videoRef.current.addEventListener('loadeddata', () => {
          predict();
        });
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }

    async function predict() {
      const faceMeshModel = new faceMesh.FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
        }
      });
      faceMeshModel.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMeshModel.onResults((results) => {
        drawResults(results);
      });

      async function drawResults(results) {
        if (!videoRef.current || !canvasRef.current) return;
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            drawConcealer(canvasCtx, landmarks, videoWidth, videoHeight, concealerColor);
          }
        }
      }

      async function renderPrediction() {
        if (!videoRef.current) return;
        await faceMeshModel.send({ image: videoRef.current });
        requestAnimationFrame(renderPrediction);
      }

      function drawConcealer(canvasCtx, landmarks, videoWidth, videoHeight, color) {
        canvasCtx.fillStyle = color; // Use selected concealer color
        canvasCtx.beginPath();

        // Under-eye landmarks (Adjust as needed - IMPORTANT!)
        const landmarkIndices = [133, 173, 157, 158, 159, 160, 161, 246];

        landmarkIndices.forEach(index => {
          const landmark = landmarks[index];
          const x = landmark.x * videoWidth;
          const y = landmark.y * videoHeight;
          canvasCtx.lineTo(x, y);
        });

        canvasCtx.closePath();
        canvasCtx.fill();
      }

      renderPrediction();
    }
    setupCamera();
  }, [concealerColor]); // Re-run effect when concealerColor changes

  const handleShadeChange = (color) => {
    setConcealerColor(color);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Virtual Concealer Try-On</h1>
        <video
          ref={videoRef}
          autoPlay
        />
        <canvas ref={canvasRef} className="output_canvas" />

        {/* Shade Selection */}
        <div className="shade-selector">
          {Object.entries(predefinedShades).map(([name, color]) => (
            <button key={name} onClick={() => handleShadeChange(color)}>
              {name}
            </button>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;