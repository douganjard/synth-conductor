# Synth Conductor 🎵

**Synth Conductor** is a browser-based gestural synthesizer that transforms your webcam into a musical interface. By leveraging high-performance hand tracking, users can "conduct" a digital synthesizer in real-time using natural movements.

## 🚀 Features

- **Gesture-Based Control**: Conduct sound using both hands without touching your keyboard or mouse.
- **2D Trajectory Plotting**: A visual persistence layer that tracks your hand movements over a 5-second window, helping you visualize your performance "paths."
- **3D Visualization**: Real-time rendering of performance "sabers" and interactive elements using Three.js.
- **Dynamic Synthesis**: A multi-mode oscillator (Sine, Square, Saw, Triangle) with LFO modulation and resonant filtering.
- **Low-Latency Tracking**: Powered by MediaPipe's GPU-accelerated vision tasks.

## 🖐️ Hand Mappings

The synth is divided into two logical control stages:

### Right Hand: The Lead Voice
- **Horizontal (X)**: Controls **Pitch** (Frequency). Moving right increases the note frequency.
- **Vertical (Y)**: Controls **Filter Resonance** (Q). Moving up increases the resonance "squeeze."

### Left Hand: The Filter Conductor
- **Horizontal (X)**: Controls **LFO Rate**. Moving right speeds up the modulation wobble.
- **Vertical (Y)**: Controls **Filter Cutoff**. Moving up opens the filter, letting more high frequencies through.

## 🛠️ Technical Stack & Libraries

This project is built using a modern frontend stack designed for high-performance audio-visual experiences:

### Core Frameworks
- **[React 18](https://reactjs.org/)**: UI state management and component architecture.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS for the modern, dark-themed dashboard.

### Computer Vision
- **[@mediapipe/tasks-vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)**: Google's machine learning suite used for detecting 21 unique hand landmarks at high frame rates.

### 3D Rendering (Visualizers)
- **[Three.js](https://threejs.org/)**: The underlying 3D engine.
- **[@react-three/fiber](https://github.com/pmndrs/react-three-fiber)**: A React bridge for Three.js.
- **[@react-three/drei](https://github.com/pmndrs/drei)**: A collection of useful helpers for React Three Fiber (Grid, Environment, Stars, etc.).

### Audio Engine
- **Web Audio API**: Native browser API used for low-latency oscillator generation, BiQuad filtering, and LFO modulation.

### Icons
- **[Lucide React](https://lucide.dev/)**: Clean, consistent SVG icons for the interface.

## 🎨 Design Philosophy

The interface follows a "Cyber-Studio" aesthetic:
- **Neon Accents**: Blue for the Lead Voice and Red for the Filter stage to match performance colors.
- **Glassmorphism**: Backdrop blurs and semi-transparent panels for a depth-focused UI.
- **Telemetry-First**: Every movement is visualized, providing immediate visual feedback for audio changes.

## ⚠️ Requirements
- A modern web browser (Chrome or Edge recommended for best MediaPipe performance).
- Webcam access.
- Audio output enabled.
