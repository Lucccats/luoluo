import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Star } from './Star';
import { Polaroids } from './Polaroids';
import { Ribbon } from './Ribbon';
import { COLORS } from '../constants';
import { TreeState, HandData, HandGesture } from '../types';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface ExperienceProps {
  treeState: TreeState;
  handData: HandData;
  userPhotos: string[];
}

// Custom hook to manipulate OrbitControls based on Hand
const HandControlsAdapter = ({ handData, controlsRef }: { handData: HandData, controlsRef: React.RefObject<OrbitControlsImpl> }) => {
  useFrame(() => {
    // Only allow rotation interaction if the gesture is explicitly "ONE"
    // AND detection is active.
    if (handData.isDetected && handData.gesture === HandGesture.ONE && controlsRef.current) {
      // Map hand position to Azimuth (Left/Right)
      // Range: -1 (Left) to 1 (Right)
      // Map to full 360 degrees (2 * PI) to allow checking the back of the tree
      const targetAzimuth = -handData.position.x * Math.PI * 2; 
      
      // Map Y to elevation (look up/down)
      const targetPolar = Math.PI / 2 - (handData.position.y * 0.8); 
      
      const currentAzimuth = controlsRef.current.getAzimuthalAngle();
      const currentPolar = controlsRef.current.getPolarAngle();
      
      // Smooth interpolation
      const alpha = 0.08; // Slightly responsive
      
      // Ensure controls allow free rotation
      controlsRef.current.minAzimuthAngle = -Infinity;
      controlsRef.current.maxAzimuthAngle = Infinity;
      
      controlsRef.current.setAzimuthalAngle(THREE.MathUtils.lerp(currentAzimuth, targetAzimuth, alpha));
      controlsRef.current.setPolarAngle(THREE.MathUtils.lerp(currentPolar, targetPolar, alpha));
    }
  });
  return null;
}

export const Experience: React.FC<ExperienceProps> = ({ treeState, handData, userPhotos }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2, 22], fov: 45, near: 0.1, far: 100 }}
      gl={{ 
        antialias: false,
        toneMapping: THREE.ReinhardToneMapping,
        toneMappingExposure: 1.5
      }}
    >
      <color attach="background" args={[COLORS.bg]} />
      
      <HandControlsAdapter handData={handData} controlsRef={controlsRef} />
      
      <OrbitControls 
        ref={controlsRef}
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 2 + 0.2}
        minDistance={10}
        maxDistance={35}
        autoRotate={!handData.isDetected && treeState === TreeState.TREE_SHAPE}
        autoRotateSpeed={0.8}
        dampingFactor={0.05}
      />

      {/* Lighting */}
      <ambientLight intensity={0.2} color={COLORS.emerald} />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#ffeeb1" 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      <pointLight position={[-10, -5, -10]} intensity={1} color={COLORS.emerald} />
      <pointLight position={[5, 5, 5]} intensity={1} color={COLORS.gold} />

      {/* 
        CRITICAL FIX: 
        Suspense is required for async assets like Environment maps. 
        Without this, the screen may remain black/white indefinitely on load.
      */}
      <Suspense fallback={null}>
        <Environment preset="lobby" environmentIntensity={0.8} />

        <group position={[0, -2, 0]}>
          <Foliage treeState={treeState} />
          <Ribbon treeState={treeState} />
          <Ornaments treeState={treeState} />
          <Polaroids treeState={treeState} userPhotos={userPhotos} />
          <Star treeState={treeState} />
          
          <ContactShadows 
            resolution={1024} 
            scale={50} 
            blur={2} 
            opacity={0.5} 
            far={10} 
            color="#000000" 
          />
        </group>
      </Suspense>

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.2} 
          radius={0.4}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};