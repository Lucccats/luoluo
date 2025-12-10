import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandGesture, HandData } from '../types';

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
  isEnabled: boolean;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, isEnabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTimeRef = useRef(-1);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Use ref to hold the latest callback function to avoid stale closures in the animation loop
  const onHandUpdateRef = useRef(onHandUpdate);

  useEffect(() => {
    onHandUpdateRef.current = onHandUpdate;
  }, [onHandUpdate]);

  useEffect(() => {
    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        if (isEnabled) {
          startWebcam();
        }
      } catch (e) {
        console.error("Failed to load MediaPipe HandLandmarker:", e);
      }
    };

    initHandLandmarker();

    return () => {
      stopWebcam();
    };
  }, []);

  // Handle Enable/Disable toggle
  useEffect(() => {
    if (isEnabled) {
      startWebcam();
    } else {
      stopWebcam();
      // Reset hand data when disabled
      if (onHandUpdateRef.current) {
        onHandUpdateRef.current({ gesture: HandGesture.NONE, position: { x: 0, y: 0 }, isDetected: false });
      }
    }
  }, [isEnabled]);

  const startWebcam = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Browser API navigator.mediaDevices.getUserMedia not available");
      return;
    }
    
    // If already streaming, don't restart
    if (streamRef.current && streamRef.current.active) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: "user" } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
      }
    } catch (e) {
      console.error("Camera access denied:", e);
    }
  };

  const stopWebcam = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeEventListener("loadeddata", predictWebcam);
    }
  };

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current || !isEnabled) return;

    const startTimeMs = performance.now();
    
    // Only process if video frame has advanced
    if (videoRef.current.videoWidth > 0 && videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      let gesture = HandGesture.NONE;
      let position = { x: 0, y: 0 };
      let isDetected = false;

      if (results.landmarks && results.landmarks.length > 0) {
        isDetected = true;
        const landmarks = results.landmarks[0];
        const wrist = landmarks[0];
        
        // Calculate normalized palm position (-1 to 1)
        // Flip X because webcam is mirrored
        const palmX = 1.0 - landmarks[0].x; 
        const palmY = landmarks[0].y;
        position = {
          x: (palmX - 0.5) * 2,
          y: (palmY - 0.5) * 2
        };

        // --- Improved Gesture Logic ---
        // Helper: Check if finger is extended by comparing Tip distance to PIP distance from Wrist
        // Indices: Tip / PIP
        // Thumb: 4 / 2 (MCP) -- Thumb is special
        // Index: 8 / 6
        // Middle: 12 / 10
        // Ring: 16 / 14
        // Pinky: 20 / 18

        const isExtended = (tipIdx: number, baseIdx: number) => {
             const dTip = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
             const dBase = Math.hypot(landmarks[baseIdx].x - wrist.x, landmarks[baseIdx].y - wrist.y);
             return dTip > dBase; 
        };

        const thumbOpen = isExtended(4, 2); 
        const indexOpen = isExtended(8, 6);
        const middleOpen = isExtended(12, 10);
        const ringOpen = isExtended(16, 14);
        const pinkyOpen = isExtended(20, 18);

        // Core logic: 
        // 1. "ONE" (Rotate): Index Open, Middle/Ring/Pinky Closed. Thumb state ignored (can be open or closed).
        // 2. "OPEN" (Scatter): At least 4 fingers open.
        // 3. "CLOSED" (Tree): 0 or 1 finger open (usually fist).

        const mainFingersOpenCount = [indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;
        const totalOpenCount = mainFingersOpenCount + (thumbOpen ? 1 : 0);

        if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
           // Index is explicitly pointing, others are curled
           gesture = HandGesture.ONE;
        } else if (totalOpenCount >= 4) {
           gesture = HandGesture.OPEN;
        } else if (totalOpenCount <= 1 && !indexOpen) {
           // Mostly closed, and definitely not pointing
           gesture = HandGesture.CLOSED;
        }
      }

      // Invoke callback
      if (onHandUpdateRef.current) {
        onHandUpdateRef.current({ gesture, position, isDetected });
      }
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <video 
      id="webcam-preview"
      ref={videoRef}
      autoPlay 
      playsInline
      muted
      // Keeping the video small and unobtrusive in the top right
      className={`absolute top-20 right-8 w-28 h-auto rounded-lg border border-yellow-500/30 z-50 object-cover scale-x-[-1] transition-all duration-300 pointer-events-none ${isEnabled ? 'opacity-70 translate-y-0' : 'opacity-0 -translate-y-4'}`}
    />
  );
};