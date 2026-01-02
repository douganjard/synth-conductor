
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { COLORS } from '../types';

interface WebcamPreviewProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    resultsRef: React.MutableRefObject<HandLandmarkerResult | null>;
    isCameraReady: boolean;
}

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17], [0, 5], [0, 17] // Palm
];

const WebcamPreview: React.FC<WebcamPreviewProps> = ({ videoRef, resultsRef, isCameraReady }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isCameraReady) return;
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video && video.readyState >= 2) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
                    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

                    // Clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // 1. Draw Video Feed (Mirrored)
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.translate(-canvas.width, 0);
                    
                    // Increased visibility for the tracking feed
                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Add a subtle darkening overlay to make landmarks pop
                    ctx.globalAlpha = 0.2;
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.restore();

                    // Reset alpha for drawing landmarks
                    ctx.globalAlpha = 1.0;

                    // 2. Draw Landmarks
                    if (resultsRef.current && resultsRef.current.landmarks) {
                        for (let i = 0; i < resultsRef.current.landmarks.length; i++) {
                            const landmarks = resultsRef.current.landmarks[i];
                            const classification = resultsRef.current.handedness[i][0];
                            const isRight = classification.categoryName === 'Right';
                            const color = isRight ? COLORS.right : COLORS.left;

                            ctx.shadowBlur = 10;
                            ctx.shadowColor = color;
                            ctx.strokeStyle = color;
                            ctx.fillStyle = color;
                            ctx.lineWidth = 3;

                            // Connections
                            ctx.beginPath();
                            for (const [start, end] of HAND_CONNECTIONS) {
                                const p1 = landmarks[start];
                                const p2 = landmarks[end];
                                ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
                                ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
                            }
                            ctx.stroke();

                            // Joints
                            ctx.shadowBlur = 5;
                            for (const lm of landmarks) {
                                ctx.beginPath();
                                ctx.arc((1 - lm.x) * canvas.width, lm.y * canvas.height, 3, 0, 2 * Math.PI);
                                ctx.fill();
                            }
                            ctx.shadowBlur = 0;
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isCameraReady, videoRef, resultsRef]);

    if (!isCameraReady) return null;

    return (
        <div className="fixed bottom-6 left-6 w-48 h-36 bg-black/80 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-md z-30 shadow-2xl pointer-events-none group ring-1 ring-white/5">
            <div className="absolute top-2 left-3 text-[8px] text-white/50 font-mono uppercase tracking-[0.2em] z-10 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live Tracking
            </div>
            <canvas ref={canvasRef} className="w-full h-full object-cover grayscale-[0.3]" />
        </div>
    );
};

export default WebcamPreview;
