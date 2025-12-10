import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, TREE_HEIGHT } from '../constants';
import { TreeState } from '../types';

interface StarProps {
  treeState: TreeState;
}

export const Star: React.FC<StarProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetScale = treeState === TreeState.TREE_SHAPE ? 1 : 0;
  
  // Generate 5-pointed star shape
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.0; 
    const innerRadius = 0.4;
    const numPoints = 5;

    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i / (numPoints * 2)) * Math.PI * 2 - (Math.PI / 2); // Start at top
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);
  
  // Center geometry
  useMemo(() => {
    starGeometry.center();
  }, [starGeometry]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Lerp scale for appearance
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
      
      // Rotate
      meshRef.current.rotation.y += delta * 0.5;
      // Gentle rocking
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  // Adjusted height: TREE_HEIGHT/2 (6) + 1.4 = 7.4 (was 7.8)
  return (
    <group position={[0, TREE_HEIGHT / 2 + 1.4, 0]}>
      {/* Physical Star */}
      <mesh ref={meshRef} geometry={starGeometry}>
        <meshStandardMaterial 
          color={COLORS.brightGold} 
          emissive={COLORS.brightGold}
          emissiveIntensity={1.5}
          roughness={0.1}
          metalness={1} 
        />
        <pointLight color={COLORS.brightGold} intensity={2} distance={15} decay={2} />
      </mesh>
    </group>
  );
};