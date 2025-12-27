/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandType, COLORS } from '../types';

interface SaberProps {
  type: HandType;
  positionRef: React.MutableRefObject<THREE.Vector3 | null>;
  velocityRef: React.MutableRefObject<THREE.Vector3 | null>;
}

const Saber: React.FC<SaberProps> = ({ type, positionRef, velocityRef }) => {
  const meshRef = useRef<THREE.Group>(null);
  const saberLength = 1.0; 

  // Reusable rotation objects to avoid GC in loop
  const targetRotation = useRef(new THREE.Euler());
  const currentRotation = useRef(new THREE.Euler());

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const targetPos = positionRef.current;
    const velocity = velocityRef.current;

    if (targetPos) {
      meshRef.current.visible = true;
      // Smooth movement
      meshRef.current.position.lerp(targetPos, 0.5); // Snappy positioning
      
      // --- Dynamic Rotation ---
      // Default 'ready' stance: pointed forward and slightly out
      const restingX = -Math.PI / 3.5; // Tilted forward ~50 degrees
      const restingY = 0;
      // Left hand tilts slightly left (positive Z), right hand tilts slightly right (negative Z)
      const restingZ = type === 'left' ? 0.2 : -0.2; 

      let swayX = 0;
      let swayY = 0;
      let swayZ = 0;

      if (velocity) {
          // Influence rotation based on velocity to "lead" the swing
          // Velocity Y (up/down) affects X rotation (pitch)
          // Swinging DOWN (neg Y) -> Tilt MORE forward (more negative X rotation)
          swayX = velocity.y * 0.05; 

          // Velocity X (left/right) affects Z rotation (roll)
          // Swinging RIGHT (pos X) -> Tilt RIGHT (negative Z rotation)
          swayZ = -velocity.x * 0.05;

          // Velocity Z (forward/back) affects X rotation slightly too
          // Pushing FORWARD (neg Z) -> Tilt forward (negative X)
          swayX += velocity.z * 0.02;
      }

      // Combine resting pose with sway
      targetRotation.current.set(
          restingX + swayX,
          restingY + swayY,
          restingZ + swayZ
      );

      // Smoothly interpolate current rotation towards target
      // We use raw Euler interpolation here for simplicity and control over individual axes if needed,
      // though Quaternion slerp is often cleaner for complex compound rotations.
      // Given the constrained movement, this should feel okay.
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.current.x, 0.2);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.current.y, 0.2);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.current.z, 0.2);

    } else {
      meshRef.current.visible = false;
    }
  });

  const color = type === 'left' ? COLORS.left : COLORS.right;

  return (
    <group ref={meshRef}>
      {/* --- HANDLE ASSEMBLY --- */}
      {/* Main Grip (Dark Grey/Black) */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.8} />
      </mesh>
      
      {/* Pommel (Bottom Cap) */}
      <mesh position={[0, -0.13, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
        <meshStandardMaterial color="#888" roughness={0.3} metalness={1} />
      </mesh>

      {/* Grip Accents (Metallic Rings) */}
      <mesh position={[0, -0.08, 0]}>
         <torusGeometry args={[0.021, 0.002, 8, 24]} />
         <meshStandardMaterial color="#aaa" roughness={0.2} metalness={1} />
      </mesh>
       <mesh position={[0, -0.04, 0]}>
         <torusGeometry args={[0.021, 0.002, 8, 24]} />
         <meshStandardMaterial color="#aaa" roughness={0.2} metalness={1} />
      </mesh>

      {/* Emitter Guard (Top metallic part where blade comes out) */}
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.035, 0.025, 0.05, 16]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={1} />
      </mesh>

      {/* Emitter Glow Ring */}
      <mesh position={[0, 0.036, 0]} rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.015, 0.03, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>


      {/* --- BLADE ASSEMBLY --- */}
      {/* Inner Core (Bright White) */}
      <mesh position={[0, 0.05 + saberLength / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, saberLength, 12]} />
        <meshBasicMaterial color="white" toneMapped={false} />
      </mesh>

      {/* Outer Glow (Colored) */}
      <mesh position={[0, 0.05 + saberLength / 2, 0]}>
        <capsuleGeometry args={[0.02, saberLength, 16, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={4} // Very bright
          toneMapped={false} // Don't let the renderer clamp the brightness
          transparent
          opacity={0.6} // Semi-transparent to see the white core
          roughness={0.1}
          metalness={0}
        />
      </mesh>
      
      {/* Interactive Light */}
      <pointLight color={color} intensity={2} distance={3} decay={2} position={[0, 0.5, 0]} />
    </group>
  );
};

export default Saber;
