
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HandState, HandData } from '../types';

export const useMediaPipe = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handStateRef = useRef<HandState>({
    left: { x: 0.5, y: 0.5, active: false },
    right: { x: 0.5, y: 0.5, active: false }
  });

  const lastResultsRef = useRef<HandLandmarkerResult | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    let isActive = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        if (!isActive) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        if (!isActive) {
             landmarker.close();
             return;
        }

        landmarkerRef.current = landmarker;
        startCamera();
      } catch (err: any) {
        console.error("Error initializing MediaPipe:", err);
        setError(`Failed to load hand tracking: ${err.message}`);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          // onloadedmetadata is generally more reliable for sizing
          videoRef.current.onloadedmetadata = () => {
             if (isActive) {
                 setIsCameraReady(true);
                 predictWebcam();
             }
          };
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setError("Could not access camera.");
      }
    };

    const predictWebcam = () => {
        if (!videoRef.current || !landmarkerRef.current || !isActive) return;

        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
             let startTimeMs = performance.now();
             try {
                 const results = landmarkerRef.current.detectForVideo(video, startTimeMs);
                 lastResultsRef.current = results;
                 processResults(results);
             } catch (e) {
                 console.warn("Detection failed this frame", e);
             }
        }
        requestRef.current = requestAnimationFrame(predictWebcam);
    };

    const processResults = (results: HandLandmarkerResult) => {
        let left: HandData = { ...handStateRef.current.left, active: false };
        let right: HandData = { ...handStateRef.current.right, active: false };

        if (results.landmarks) {
          for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i];
            const classification = results.handedness[i][0];
            const isRight = classification.categoryName === 'Right'; 
            
            // Average position of all landmarks for a smoother "center"
            // or just use palm base (0) or index tip (8)
            const tip = landmarks[8];
            
            // Mirror X because it's a webcam feed
            const x = 1.0 - tip.x;
            const y = tip.y;

            if (isRight) {
                 right = { x, y, active: true };
            } else {
                 left = { x, y, active: true };
            }
          }
        }

        // Apply slight smoothing
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const T = 0.4;

        handStateRef.current = {
            left: {
                x: lerp(handStateRef.current.left.x, left.x, T),
                y: lerp(handStateRef.current.left.y, left.y, T),
                active: left.active
            },
            right: {
                x: lerp(handStateRef.current.right.x, right.x, T),
                y: lerp(handStateRef.current.right.y, right.y, T),
                active: right.active
            }
        };
    };

    setupMediaPipe();

    return () => {
      isActive = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarkerRef.current) landmarkerRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [videoRef]);

  return { isCameraReady, handStateRef, lastResultsRef, error };
};
