import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, PARTICLE_COUNT, SCATTER_RADIUS, TREE_HEIGHT, TREE_RADIUS_BASE } from '../constants';
import { TreeState } from '../types';

// Custom Shader Material
const FoliageMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 }, // 0 = scatter, 1 = tree
    uColorA: { value: COLORS.emerald },
    uColorB: { value: COLORS.brightGold },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aScatterPos;
    attribute vec3 aTreePos;
    attribute float aSize;
    attribute float aRandom;
    
    varying vec2 vUv;
    varying float vAlpha;
    varying vec3 vColor;

    // Cubic Bezier ease-in-out approximation
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      vUv = uv;
      
      float t = easeInOutCubic(uProgress);
      
      // Interpolate position
      vec3 pos = mix(aScatterPos, aTreePos, t);
      
      // Add "breathing" / floating animation
      // When scattered, float more. When tree, shimmer slightly.
      float floatIntensity = mix(0.5, 0.05, t); 
      float floatSpeed = mix(0.5, 2.0, t);
      
      pos.x += sin(uTime * floatSpeed + aRandom * 10.0) * floatIntensity;
      pos.y += cos(uTime * floatSpeed * 0.8 + aRandom * 5.0) * floatIntensity;
      pos.z += sin(uTime * floatSpeed * 1.2 + aRandom * 15.0) * floatIntensity;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = (aSize * (30.0 + aRandom * 20.0)) * (1.0 / -mvPosition.z);
      
      // Varying alpha based on randomness and time for twinkling
      vAlpha = 0.6 + 0.4 * sin(uTime * 3.0 + aRandom * 20.0);
      
      // Mix color based on height/position for depth
      float heightFactor = (pos.y + 5.0) / 10.0;
      vColor = mix(vec3(0.0, 0.2, 0.1), vec3(0.0, 0.8, 0.3), heightFactor * 0.5 + 0.5);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Create a soft circular particle
      vec2 xy = gl_PointCoord.xy - vec2(0.5);
      float ll = length(xy);
      
      if(ll > 0.5) discard;
      
      // Soft glow edge
      float strength = pow(1.0 - ll * 2.0, 2.0);
      
      // Gold highlights
      vec3 finalColor = mix(vColor, uColorB, strength * 0.5);
      
      gl_FragColor = vec4(finalColor, vAlpha * strength);
    }
  `
};

interface FoliageProps {
  treeState: TreeState;
}

export const Foliage: React.FC<FoliageProps> = ({ treeState }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Target progress ref for smooth animation
  const progressRef = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const treePositions = [];
    const scatterPositions = [];
    const sizes = [];
    const randoms = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // --- Tree Position Calculation (Spiral Cone) ---
      // Normalized height (0 to 1)
      const hNorm = Math.random(); 
      const y = (hNorm * TREE_HEIGHT) - (TREE_HEIGHT / 2);
      // Radius at this height (tapering to top)
      const r = (1 - hNorm) * TREE_RADIUS_BASE;
      // Angle
      const theta = Math.random() * Math.PI * 2 * 15; // 15 spirals
      // Add randomness to thickness
      const rRandom = r * Math.sqrt(Math.random()); 
      
      const tx = rRandom * Math.cos(theta);
      const tz = rRandom * Math.sin(theta);
      
      treePositions.push(tx, y, tz);

      // --- Scatter Position Calculation (Random Sphere) ---
      const u = Math.random();
      const v = Math.random();
      const phi = Math.acos(2 * u - 1);
      const lambda = 2 * Math.PI * v;
      // Distribute within sphere, concentrated slightly towards center
      const rad = SCATTER_RADIUS * Math.cbrt(Math.random()); 
      
      const sx = rad * Math.sin(phi) * Math.cos(lambda);
      const sy = rad * Math.sin(phi) * Math.sin(lambda);
      const sz = rad * Math.cos(phi);

      scatterPositions.push(sx, sy, sz);

      // Attributes
      sizes.push(Math.random());
      randoms.push(Math.random());
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(treePositions, 3)); // Default logic pos
    geo.setAttribute('aTreePos', new THREE.Float32BufferAttribute(treePositions, 3));
    geo.setAttribute('aScatterPos', new THREE.Float32BufferAttribute(scatterPositions, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 1));

    return geo;
  }, []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Smoothly interpolate progress
      const target = treeState === TreeState.TREE_SHAPE ? 1 : 0;
      const speed = 1.5; // Transition speed
      
      // Simple linear approach to target with delta
      if (Math.abs(progressRef.current - target) > 0.001) {
        const direction = target > progressRef.current ? 1 : -1;
        progressRef.current += direction * delta * speed;
        // Clamp
        if (direction === 1 && progressRef.current > 1) progressRef.current = 1;
        if (direction === -1 && progressRef.current < 0) progressRef.current = 0;
      }
      
      shaderRef.current.uniforms.uProgress.value = progressRef.current;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={shaderRef}
        args={[FoliageMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
