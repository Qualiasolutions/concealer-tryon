import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceMesh from '@mediapipe/face_mesh';
import './App.css';

const CONCEALER_SHADES = {
  fair: {
    name: "Fair",
    color: "#fde4c8",
    texture: "/concealer-textures/fair.svg",
    description: "For very light skin tones"
  },
  light: {
    name: "Light",
    color: "#f8e0bc",
    texture: "/concealer-textures/light.svg",
    description: "For light skin tones"
  },
  medium: {
    name: "Medium",
    color: "#f0d0a8",
    texture: "/concealer-textures/medium.svg",
    description: "For medium skin tones"
  },
  tan: {
    name: "Tan",
    color: "#e0c098",
    texture: "/concealer-textures/tan.svg",
    description: "For tan skin tones"
  },
  deep: {
    name: "Deep",
    color: "#c8a888",
    texture: "/concealer-textures/deep.svg",
    description: "For deep skin tones"
  }
};

const FACE_CONTOUR = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

const CONCEALER_REGIONS = {
  leftEye: [246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
  rightEye: [466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [activeShade, setActiveShade] = useState('fair');
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [facePosition, setFacePosition] = useState({ isCorrect: false });
  const [texturePatterns, setTexturePatterns] = useState({});

  const checkFacePosition = useCallback((landmarks) => {
    const centerX = landmarks[6].x;
    const centerY = landmarks[6].y;
    
    const isCorrect = (
      centerX > 0.4 && centerX < 0.6 &&
      centerY > 0.4 && centerY < 0.6
    );
    
    setFacePosition({ isCorrect });
  }, []);

  const drawFaceOutline = useCallback((ctx, landmarks) => {
    ctx.beginPath();
    ctx.strokeStyle = facePosition.isCorrect ? '#4CAF50' : '#FFA726';
    ctx.lineWidth = 2;

    FACE_CONTOUR.forEach((index, i) => {
      const point = landmarks[index];
      const x = point.x * ctx.canvas.width;
      const y = point.y * ctx.canvas.height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.stroke();
  }, [facePosition.isCorrect]);

  const applyConcealer = useCallback((ctx, landmarks) => {
    const pattern = texturePatterns[activeShade];
    
    ctx.fillStyle = pattern || CONCEALER_SHADES[activeShade].color;
    ctx.globalAlpha = 0.35;

    [CONCEALER_REGIONS.leftEye, CONCEALER_REGIONS.rightEye].forEach(region => {
      ctx.beginPath();
      
      region.forEach((index, i) => {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.fill();
    });

    ctx.globalAlpha = 1.0;
  }, [activeShade, texturePatterns]);

  const onResults = useCallback((results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.save();
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasRef.current.width, 0);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0];
      drawFaceOutline(canvasCtx, landmarks);
      applyConcealer(canvasCtx, landmarks);
      checkFacePosition(landmarks);
    } else {
      setFaceDetected(false);
    }

    canvasCtx.restore();
  }, [drawFaceOutline, applyConcealer, checkFacePosition]);

  const initFaceMesh = useCallback(async () => {
    const faceMeshModel = new faceMesh.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`
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
  }, [onResults]);

  // Camera setup effect
  useEffect(() => {
    let stream = null;

    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 800 },
            facingMode: 'user',
            aspectRatio: { ideal: 0.8 }
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
        console.error("Camera error:", err);
        alert("Please enable camera access to use the virtual concealer.");
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initFaceMesh]);

  // Texture loading effect
  useEffect(() => {
    const loadTextures = async () => {
      console.log('Starting texture loading...');
      const patterns = {};
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        console.error('No canvas context available');
        return;
      }

      for (const [shade, config] of Object.entries(CONCEALER_SHADES)) {
        try {
          console.log(`Loading texture for ${shade}: ${config.texture}`);
          const img = new Image();
          img.src = config.texture;
          await new Promise((resolve, reject) => {
            img.onload = () => {
              console.log(`Successfully loaded image for ${shade}`);
              const pattern = ctx.createPattern(img, 'repeat');
              if (pattern) {
                patterns[shade] = pattern;
                console.log(`Created pattern for ${shade}`);
                resolve();
              } else {
                reject(new Error('Failed to create pattern'));
              }
            };
            img.onerror = (e) => {
              console.error(`Failed to load image for ${shade}:`, e);
              reject(new Error(`Failed to load image: ${config.texture}`));
            };
          });
        } catch (error) {
          console.error(`Error loading texture for ${shade}:`, error);
        }
      }
      
      console.log('Final patterns:', Object.keys(patterns));
      setTexturePatterns(patterns);
    };

    if (canvasRef.current) {
      loadTextures();
    }
  }, []);

  return (
    <div className="app-container">
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
          className="camera-video"
          autoPlay
          playsInline
          muted
        />
        <canvas 
          ref={canvasRef}
          className="camera-canvas"
        />

        <div className={`face-status ${facePosition.isCorrect ? 'detected' : 'searching'}`}>
          {facePosition.isCorrect ? 'Perfect Position!' : 'Center Your Face'}
        </div>
      </div>

      <div className="shade-selector">
        <h2>Select Shade</h2>
        <div className="shade-options">
          {Object.entries(CONCEALER_SHADES).map(([id, shade]) => (
            <button
              key={id}
              onClick={() => setActiveShade(id)}
              className={`shade-button ${activeShade === id ? 'active' : ''}`}
              title={`${shade.name} - ${shade.description}`}
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
    </div>
  );
}

export default App;