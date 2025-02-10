import React, { useRef, useEffect, useState } from 'react';
import * as faceMesh from '@mediapipe/face_mesh';

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

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const textureRefs = useRef({});
  const [activeShade, setActiveShade] = useState('fair');
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [facePosition, setFacePosition] = useState({ isCorrect: false });

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
          video: { facingMode: 'user' }
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
      }
    }

    setupCamera();
  }, []);

  const initFaceMesh = async () => {
    const faceMeshModel = new faceMesh.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMeshModel.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMeshModel.onResults(onResults);

    if (videoRef.current) {
      const camera = new faceMesh.Camera(videoRef.current, {
        onFrame: async () => {
          await faceMeshModel.send({image: videoRef.current});
        }
      });
      camera.start();
    }
  };

  const onResults = (results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      drawFaceMesh(canvasCtx, results.multiFaceLandmarks[0]);
      applyConcealer(canvasCtx, results.multiFaceLandmarks[0]);
      checkFacePosition(results.multiFaceLandmarks[0]);
    } else {
      setFaceDetected(false);
    }
  };

  const drawFaceMesh = (ctx, landmarks) => {
    ctx.lineWidth = 1;
    ctx.strokeStyle = facePosition.isCorrect ? '#4CAF50' : '#FFA726';
    
    // Draw face mesh connections
    for (const connection of faceMesh.FACEMESH_TESSELATION) {
      const start = landmarks[connection[0]];
      const end = landmarks[connection[1]];
      
      ctx.beginPath();
      ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
      ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
      ctx.stroke();
    }
  };

  const applyConcealer = (ctx, landmarks) => {
    const texture = textureRefs.current[activeShade];
    if (!texture) return;

    // Define under-eye regions
    const leftEyeRegion = [
      246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7
    ];
    const rightEyeRegion = [
      466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249
    ];

    ctx.save();
    ctx.globalAlpha = 0.6;

    [leftEyeRegion, rightEyeRegion].forEach(region => {
      ctx.beginPath();
      region.forEach((index, i) => {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();

      // Create pattern from texture
      const pattern = ctx.createPattern(texture, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fill();
    });

    ctx.restore();
  };

  const checkFacePosition = (landmarks) => {
    const centerX = landmarks[6].x;
    const centerY = landmarks[6].y;
    
    const isCorrect = (
      centerX > 0.4 && centerX < 0.6 &&
      centerY > 0.4 && centerY < 0.6
    );
    
    setFacePosition({ isCorrect });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Virtual Concealer Try-On</h1>
        
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            facePosition.isCorrect ? 'bg-green-500 text-white' : 'bg-orange-400 text-white'
          }`}>
            {facePosition.isCorrect ? 'Perfect Position!' : 'Center Your Face'}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Select Shade</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {Object.entries(CONCEALER_SHADES).map(([id, shade]) => (
              <button
                key={id}
                onClick={() => setActiveShade(id)}
                className={`flex-shrink-0 w-16 h-16 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  activeShade === id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: shade.color }}
                title={`${shade.name} - ${shade.description}`}
              >
                <span className="sr-only">{shade.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;