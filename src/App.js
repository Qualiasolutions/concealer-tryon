import React, { useRef, useEffect, useState } from 'react';
import * as faceMesh from '@mediapipe/face_mesh';
import './App.css';

const CONCEALER_SHADES = {
  fair: {
    name: "Fair",
    color: "rgba(253, 228, 200, 0.6)",
    texture: "/concealer-textures/fair.png",
    description: "For very light skin tones"
  },
  light: {
    name: "Light",
    color: "rgba(248, 224, 188, 0.6)",
    texture: "/concealer-textures/light.png",
    description: "For light skin tones"
  },
  medium: {
    name: "Medium",
    color: "rgba(240, 208, 168, 0.6)",
    texture: "/concealer-textures/medium.png",
    description: "For medium skin tones"
  },
  tan: {
    name: "Tan",
    color: "rgba(224, 192, 152, 0.6)",
    texture: "/concealer-textures/tan.png",
    description: "For tan skin tones"
  },
  deep: {
    name: "Deep",
    color: "rgba(200, 168, 136, 0.6)",
    texture: "/concealer-textures/deep.png",
    description: "For deep skin tones"
  }
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const textureRefs = useRef({});
  const [activeShade, setActiveShade] = useState('fair');
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Preload textures
  useEffect(() => {
    Object.entries(CONCEALER_SHADES).forEach(([id, shade]) => {
      const img = new Image();
      img.src = shade.texture;
      img.onload = () => {
        textureRefs.current[id] = img;
      };
    });
  }, []);

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
          videoRef.current.onloadeddata = () => {
            setIsLoading(false);
            initFaceMesh();
          };
        }
      } catch (err) {
        console.error("Camera access error:", err);
        alert("Please enable camera access to use the virtual concealer.");
      }
    }

    async function initFaceMesh() {
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

      faceMeshModel.onResults(onResults);

      if (videoRef.current) {
        const detectFace = async () => {
          await faceMeshModel.send({ image: videoRef.current });
          requestAnimationFrame(detectFace);
        };
        detectFace();
      }
    }

    setupCamera();
  }, []);

  const onResults = (results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      drawConcealer(canvasCtx, results.multiFaceLandmarks[0], videoWidth, videoHeight);
    } else {
      setFaceDetected(false);
    }
  };

  const drawConcealer = (ctx, landmarks, width, height) => {
    // Define under-eye regions with more precise landmarks
    const leftEyeRegion = [
      246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7
    ];
    const rightEyeRegion = [
      466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249
    ];

    ctx.save();
    
    // Apply concealer with texture and blending
    const shade = CONCEALER_SHADES[activeShade];
    const texture = textureRefs.current[activeShade];

    [leftEyeRegion, rightEyeRegion].forEach(region => {
      ctx.beginPath();
      
      // Create concealer path
      region.forEach((index, i) => {
        const { x, y } = landmarks[index];
        const px = x * width;
        const py = y * height;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      
      ctx.closePath();
      
      // Create gradient for smooth edges
      const bounds = ctx.getImageData(0, 0, width, height);
      const gradient = ctx.createRadialGradient(
        bounds.width/2, bounds.height/2, 0,
        bounds.width/2, bounds.height/2, bounds.width/2
      );
      
      gradient.addColorStop(0, shade.color);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      // Apply concealer with texture blend
      ctx.globalCompositeOperation = 'multiply';
      if (texture) {
        ctx.clip();
        ctx.drawImage(texture, 0, 0, width, height);
      }
      
      // Apply color blend
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = gradient;
      ctx.fill();
    });
    
    ctx.restore();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Virtual Concealer Try-On</h1>
        
        <div className="camera-container">
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading camera...</p>
            </div>
          )}
          
          {!isLoading && !faceDetected && (
            <div className="face-guide">
              <p>Position your face in the center</p>
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
          />
          <canvas 
            ref={canvasRef}
            className="output_canvas"
          />
        </div>

        <div className="shade-selector">
          <h2>Select Concealer Shade</h2>
          <div className="shade-options">
            {Object.entries(CONCEALER_SHADES).map(([id, shade]) => (
              <button
                key={id}
                className={`shade-button ${activeShade === id ? 'active' : ''}`}
                onClick={() => setActiveShade(id)}
              >
                <span 
                  className="shade-preview" 
                  style={{ backgroundColor: shade.color }}
                />
                <div className="shade-info">
                  <span className="shade-name">{shade.name}</span>
                  <span className="shade-description">{shade.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;