import React, { useRef, useEffect, useState } from 'react';
import * as faceMesh from '@mediapipe/face_mesh';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [concealerColor, setConcealerColor] = useState('rgba(255, 220, 180, 0.5)');
  const [activeShade, setActiveShade] = useState('light1');

  const predefinedShades = {
    "light1": { color: "rgba(255, 220, 180, 0.7)", name: "Fair" },
    "light2": { color: "rgba(255, 210, 170, 0.7)", name: "Light" },
    "light3": { color: "rgba(255, 200, 160, 0.7)", name: "Light Medium" },
    "medium1": { color: "rgba(255, 190, 150, 0.7)", name: "Medium" },
    "medium2": { color: "rgba(255, 180, 140, 0.7)", name: "Medium Tan" },
    "medium3": { color: "rgba(255, 170, 130, 0.7)", name: "Tan" },
    "dark1": { color: "rgba(235, 160, 120, 0.7)", name: "Deep" },
    "dark2": { color: "rgba(215, 150, 110, 0.7)", name: "Rich" },
    "dark3": { color: "rgba(195, 140, 100, 0.7)", name: "Deep Rich" },
    "dark4": { color: "rgba(175, 130, 90, 0.7)", name: "Deep Dark" },
  };

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
            aspectRatio: { ideal: 4/3 }
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predict);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Please enable camera access to use the virtual concealer try-on.");
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

      faceMeshModel.onResults(drawResults);

      async function drawResults(results) {
        if (!videoRef.current || !canvasRef.current) return;
        
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        
        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
        
        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            drawConcealer(canvasCtx, landmarks, videoWidth, videoHeight);
          }
        }
        canvasCtx.restore();
      }

      function drawConcealer(canvasCtx, landmarks, videoWidth, videoHeight) {
        // Draw face mesh points for visualization
        canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        landmarks.forEach(landmark => {
          canvasCtx.beginPath();
          canvasCtx.arc(
            landmark.x * videoWidth,
            landmark.y * videoHeight,
            1,
            0,
            2 * Math.PI
          );
          canvasCtx.fill();
        });

        // Enhanced under-eye concealer areas with better coverage
        const leftEyeLandmarks = [247, 30, 29, 27, 28, 56, 190, 243, 112, 26, 22, 23, 24, 110];
        const rightEyeLandmarks = [467, 260, 259, 257, 258, 286, 413, 441, 342, 256, 252, 253, 254, 339];
        
        // Draw guide boxes for under-eye areas
        canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        canvasCtx.lineWidth = 1;
        
        // Left eye guide
        canvasCtx.beginPath();
        leftEyeLandmarks.forEach((index, i) => {
          const landmark = landmarks[index];
          const x = landmark.x * videoWidth;
          const y = landmark.y * videoHeight;
          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
        });
        canvasCtx.closePath();
        canvasCtx.stroke();
        
        // Right eye guide
        canvasCtx.beginPath();
        rightEyeLandmarks.forEach((index, i) => {
          const landmark = landmarks[index];
          const x = landmark.x * videoWidth;
          const y = landmark.y * videoHeight;
          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
        });
        canvasCtx.closePath();
        canvasCtx.stroke();
        
        // Apply concealer with feathered edges
        canvasCtx.fillStyle = concealerColor;
        
        // Left under-eye concealer
        canvasCtx.beginPath();
        leftEyeLandmarks.forEach((index, i) => {
          const landmark = landmarks[index];
          const x = landmark.x * videoWidth;
          const y = landmark.y * videoHeight;
          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
        });
        canvasCtx.closePath();
        canvasCtx.fill();
        
        // Right under-eye concealer
        canvasCtx.beginPath();
        rightEyeLandmarks.forEach((index, i) => {
          const landmark = landmarks[index];
          const x = landmark.x * videoWidth;
          const y = landmark.y * videoHeight;
          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
        });
        canvasCtx.closePath();
        canvasCtx.fill();
      }

      async function renderPrediction() {
        if (videoRef.current) {
          await faceMeshModel.send({ image: videoRef.current });
        }
        requestAnimationFrame(renderPrediction);
      }

      renderPrediction();
    }

    setupCamera();
  }, [concealerColor]);

  const handleShadeChange = (id, shade) => {
    setConcealerColor(shade.color);
    setActiveShade(id);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Virtual Concealer Try-On</h1>
        
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
          />
          <canvas 
            ref={canvasRef}
            className="output_canvas"
          />
        </div>

        <div className="shade-selector">
          <h2>Choose Your Shade</h2>
          <div className="shade-selector-scroll">
            {Object.entries(predefinedShades).map(([id, shade]) => (
              <button
                key={id}
                className={`shade-button ${activeShade === id ? 'active' : ''}`}
                onClick={() => handleShadeChange(id, shade)}
                style={{
                  backgroundColor: shade.color.replace(/[^,]+\)/, '1)')
                }}
              >
                {shade.name}
              </button>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;