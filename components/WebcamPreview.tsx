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

            if (canvas && video && video.readyState >= 2) { // HAVE_CURRENT_DATA or better
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Keep canvas internal resolution matching the video for sharpness
                    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
                    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // 1. Draw Video Feed (Mirrored)
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.translate(-canvas.width, 0);
                    // Lower opacity slightly for a more "HUD" feel
                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    ctx.restore();
                    ctx.globalAlpha = 1.0;

                    // 2. Draw Landmarks (if any)
                    if (resultsRef.current && resultsRef.current.landmarks) {
                        for (let i = 0; i < resultsRef.current.landmarks.length; i++) {
                            const landmarks = resultsRef.current.landmarks[i];
                            
                            // Safety checks for handedness
                            const handInfo = resultsRef.current.handedness[i];
                            if (!handInfo || !handInfo[0]) continue;

                            const handedness = handInfo[0];
                            // 'Right' category from MediaPipe usually means it's your right hand.
                            // We color them to match game sabers: Left = Red, Right = Blue
                            const isRight = handedness.categoryName === 'Right';
                            const color = isRight ? COLORS.right : COLORS.left;

                            ctx.strokeStyle = color;
                            ctx.fillStyle = color;
                            ctx.lineWidth = 3;

                            // Draw connections
                            ctx.beginPath();
                            for (const [start, end] of HAND_CONNECTIONS) {
                                const p1 = landmarks[start];
                                const p2 = landmarks[end];
                                // Mirror X coordinates: (1 - x) because video is mirrored
                                ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
                                ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
                            }
                            ctx.stroke();

                            // Draw joints
                            for (const lm of landmarks) {
                                ctx.beginPath();
                                ctx.arc((1 - lm.x) * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
                                ctx.fill();
                            }

                            // Highlight index finger tip (Saber point)
                            const tip = landmarks[8];
                            ctx.beginPath();
                            ctx.fillStyle = 'white';
                            ctx.arc((1 - tip.x) * canvas.width, tip.y * canvas.height, 7, 0, 2 * Math.PI);
                            ctx.fill();
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
        <div className="fixed bottom-4 right-4 w-64 h-48 bg-black/60 border-2 border-blue-500/30 rounded-xl overflow-hidden backdrop-blur-md z-50 shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none transition-opacity duration-500">
             {/* Header/Label */}
            <div className="absolute top-0 left-0 right-0 bg-black/40 text-[10px] text-blue-300/70 px-2 py-1 font-mono uppercase tracking-widest">
                Tracking Feed
            </div>
            <canvas ref={canvasRef} className="w-full h-full object-cover mt-4" />
        </div>
    );
};

export default WebcamPreview;
