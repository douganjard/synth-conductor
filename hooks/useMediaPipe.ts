
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
    left: { x: 0.5, y: 0.5, active: false, isFist: false },
    right: { x: 0.5, y: 0.5, active: false, isFist: false }
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
        let left: HandData = { ...handStateRef.current.left, active: false, isFist: false };
        let right: HandData = { ...handStateRef.current.right, active: false, isFist: false };

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

            // Compute if hand is in a fist
            // Distance check tip-to-wrist vs PIP-to-wrist coordinates
            let curledFingers = 0;
            const wrist = landmarks[0];
            const dist3D = (p1: any, p2: any) => {
              if (!p1 || !p2) return 999;
              return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
            };

            // Index: tip (8) vs PIP (6)
            if (dist3D(landmarks[8], wrist) < dist3D(landmarks[6], wrist)) curledFingers++;
            // Middle: tip (12) vs PIP (10)
            if (dist3D(landmarks[12], wrist) < dist3D(landmarks[10], wrist)) curledFingers++;
            // Ring: tip (16) vs PIP (14)
            if (dist3D(landmarks[16], wrist) < dist3D(landmarks[14], wrist)) curledFingers++;
            // Pinky: tip (20) vs PIP (18)
            if (dist3D(landmarks[20], wrist) < dist3D(landmarks[18], wrist)) curledFingers++;

            const isFist = curledFingers >= 3;

            if (isRight) {
                 right = { x, y, active: true, isFist };
            } else {
                 left = { x, y, active: true, isFist };
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
                active: left.active,
                isFist: left.isFist
            },
            right: {
                x: lerp(handStateRef.current.right.x, right.x, T),
                y: lerp(handStateRef.current.right.y, right.y, T),
                active: right.active,
                isFist: right.isFist
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
