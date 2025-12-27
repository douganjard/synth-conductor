/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useMemo, useRef } from 'react';
import { Extrude, Octahedron } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NoteData, COLORS } from '../types';
import { LANE_X_POSITIONS, LAYER_Y_POSITIONS, NOTE_SIZE } from '../constants';

interface NoteProps {
  data: NoteData;
  zPos: number;
  currentTime: number;
}

// --- SPARK SHAPE GENERATOR ---
// Creates the iconic 4-pointed star shape with concave edges
const createSparkShape = (size: number) => {
  const shape = new THREE.Shape();
  const s = size / 1.8; // Scale helper

  // Start Top
  shape.moveTo(0, s);
  // Curve to Right
  shape.quadraticCurveTo(0, 0, s, 0);
  // Curve to Bottom
  shape.quadraticCurveTo(0, 0, 0, -s);
  // Curve to Left
  shape.quadraticCurveTo(0, 0, -s, 0);
  // Curve to Top
  shape.quadraticCurveTo(0, 0, 0, s);
  
  return shape;
};

const SPARK_SHAPE = createSparkShape(NOTE_SIZE);
const EXTRUDE_SETTINGS = { depth: NOTE_SIZE * 0.4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 };

const Debris: React.FC<{ data: NoteData, timeSinceHit: number, color: string }> = ({ data, timeSinceHit, color }) => {
    const groupRef = useRef<THREE.Group>(null);
    const flashRef = useRef<THREE.Mesh>(null);

    // Animation parameters
    const flySpeed = 6.0;
    const rotationSpeed = 10.0;
    const distance = flySpeed * timeSinceHit;

    useFrame(() => {
        if (groupRef.current) {
             groupRef.current.scale.setScalar(Math.max(0.01, 1 - timeSinceHit * 1.5));
        }
        if (flashRef.current) {
            const flashDuration = 0.15;
            if (timeSinceHit < flashDuration) {
                const t = timeSinceHit / flashDuration;
                flashRef.current.visible = true;
                flashRef.current.scale.setScalar(1 + t * 4);
                (flashRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
            } else {
                flashRef.current.visible = false;
            }
        }
    });
    
    // Shards simulate the spark shattering into crystals
    const Shard = ({ offsetDir, moveDir, scale = 1 }: { offsetDir: number[], moveDir: number[], scale?: number }) => {
        const meshRef = useRef<THREE.Mesh>(null);

        useFrame(() => {
             if (meshRef.current) {
                 meshRef.current.position.x = offsetDir[0] + moveDir[0] * distance;
                 meshRef.current.position.y = offsetDir[1] + moveDir[1] * distance;
                 meshRef.current.position.z = offsetDir[2] + moveDir[2] * distance;

                 meshRef.current.rotation.x += moveDir[1] * 0.1 * rotationSpeed;
                 meshRef.current.rotation.y += moveDir[0] * 0.1 * rotationSpeed;
             }
        });

        return (
            <Octahedron ref={meshRef} args={[NOTE_SIZE * 0.3 * scale]} position={[offsetDir[0], offsetDir[1], offsetDir[2]]}>
                 <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} emissive={color} emissiveIntensity={0.5} />
            </Octahedron>
        )
    }

    return (
        <group ref={groupRef}>
            {/* Hit Flash */}
            <mesh ref={flashRef}>
                <sphereGeometry args={[NOTE_SIZE * 1.2, 16, 16]} />
                <meshBasicMaterial color="white" transparent toneMapped={false} />
            </mesh>

            {/* Shattered Pieces - 4-way burst for the 4 star points */}
            <Shard offsetDir={[0, 0.2, 0]} moveDir={[0, 1.5, -0.5]} scale={0.8} />
            <Shard offsetDir={[0.2, 0, 0]} moveDir={[1.5, 0, -0.5]} scale={0.8} />
            <Shard offsetDir={[0, -0.2, 0]} moveDir={[0, -1.5, -0.5]} scale={0.8} />
            <Shard offsetDir={[-0.2, 0, 0]} moveDir={[-1.5, 0, -0.5]} scale={0.8} />
            
            {/* Center core shards */}
            <Shard offsetDir={[0.1, 0.1, 0.1]} moveDir={[1, 1, 1]} scale={0.5} />
            <Shard offsetDir={[-0.1, -0.1, -0.1]} moveDir={[-1, -1, 1]} scale={0.5} />
        </group>
    );
};

const Note: React.FC<NoteProps> = ({ data, zPos, currentTime }) => {
  const color = data.type === 'left' ? COLORS.left : COLORS.right;
  
  const position: [number, number, number] = useMemo(() => {
     return [
         LANE_X_POSITIONS[data.lineIndex],
         LAYER_Y_POSITIONS[data.lineLayer],
         zPos
     ];
  }, [data.lineIndex, data.lineLayer, zPos]);

  if (data.missed) return null;

  if (data.hit && data.hitTime) {
      return (
          <group position={position}>
              <Debris data={data} timeSinceHit={currentTime - data.hitTime} color={color} />
          </group>
      );
  }

  return (
    <group position={position}>
      {/* Main Spark Shape */}
      <group rotation={[0, 0, 0]}> 
        {/* We center the extrusion by offsetting z */}
        <group position={[0, 0, -NOTE_SIZE * 0.2]}>
            <Extrude args={[SPARK_SHAPE, EXTRUDE_SETTINGS]} castShadow receiveShadow>
                <meshPhysicalMaterial 
                    color={color} 
                    roughness={0.2} 
                    metalness={0.1}
                    transmission={0.1} // Slight glass effect
                    thickness={0.5}
                    emissive={color}
                    emissiveIntensity={0.8} // Glowing inner light
                />
            </Extrude>
        </group>
      </group>
      
      {/* Inner Core Glow (Replaces Arrow) */}
      <mesh position={[0, 0, NOTE_SIZE * 0.1]}>
         <octahedronGeometry args={[NOTE_SIZE * 0.2, 0]} />
         <meshBasicMaterial color="white" toneMapped={false} transparent opacity={0.8} />
      </mesh>

      {/* Outer Wireframe Glow for emphasis */}
      <group position={[0, 0, -NOTE_SIZE * 0.2]}>
          <mesh>
             <extrudeGeometry args={[SPARK_SHAPE, { ...EXTRUDE_SETTINGS, depth: EXTRUDE_SETTINGS.depth * 1.1 }]} />
             <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
          </mesh>
      </group>
    </group>
  );
};

export default React.memo(Note, (prev, next) => {
    if (next.data.hit) return false;
    return prev.zPos === next.zPos && prev.data.hit === next.data.hit && prev.data.missed === next.data.missed;
});
