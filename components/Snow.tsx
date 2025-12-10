import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SNOW_COUNT = 1500;
const BOUNDS = 25;

export const Snow: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate initial random positions
  const positions = useMemo(() => {
    const pos = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOUNDS * 2;     // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * BOUNDS * 2; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS * 2; // z
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const positionsAttribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = positionsAttribute.array as Float32Array;

    for (let i = 0; i < SNOW_COUNT; i++) {
      // Y - Fall down
      array[i * 3 + 1] -= (0.1 + Math.random() * 0.1); 

      // X/Z - Gentle Sway
      array[i * 3] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.02;
      array[i * 3 + 2] += Math.cos(state.clock.elapsedTime * 0.3 + i) * 0.02;

      // Reset if below bottom
      if (array[i * 3 + 1] < -10) {
        array[i * 3 + 1] = 20; // Move to top
        array[i * 3] = (Math.random() - 0.5) * BOUNDS * 2; // Random X
        array[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS * 2; // Random Z
      }
    }
    positionsAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SNOW_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
