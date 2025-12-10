import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_HEIGHT, TREE_RADIUS_BASE } from '../constants';
import { TreeState } from '../types';

interface RibbonProps {
  treeState: TreeState;
}

// ----------------------
// 1. ETHEREAL RIBBON SHADER
// ----------------------
const RibbonShader = {
  uniforms: {
    uTime: { value: 0 },
    uGrowth: { value: 0 }, // 0 to 1
    uColor: { value: new THREE.Color('#FFC1CC') }, // Tender Pink
    uShimmer: { value: new THREE.Color('#EEEEFF') } // Bright Silver/White
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vViewPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      // --- Ethereal Flow Motion ---
      // More intense wave for "ribbon in wind" feel
      float wave = sin(uTime * 1.5 + uv.x * 15.0) * 0.2;
      float twist = cos(uTime * 1.0 + uv.x * 8.0) * 0.1;

      vec3 pos = position;
      pos += normal * wave; // Expand/contract
      pos.y += twist;       // Float up/down

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uGrowth;
    uniform vec3 uColor;
    uniform vec3 uShimmer;
    varying vec2 vUv;
    varying vec3 vViewPosition;
    varying vec3 vNormal;

    void main() {
      if (vUv.x > uGrowth) discard;

      vec3 viewDir = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);

      // Fresnel for "Ghostly" edges
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
      
      // Energy Pulse moving up
      float pulse = sin(vUv.x * 30.0 - uTime * 5.0);
      pulse = smoothstep(0.0, 1.0, pulse);

      // Color Mix: Transparent Center -> Bright Edges
      vec3 col = mix(uColor, uShimmer, fresnel + pulse * 0.5);
      
      // Add "Star Dust" texture feel via noise
      float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
      float sparkle = step(0.98, noise * (0.5 + 0.5 * sin(uTime * 10.0)));
      col += uShimmer * sparkle * 2.0;

      // Leading edge glow
      float distToEdge = uGrowth - vUv.x;
      if (distToEdge < 0.1 && distToEdge > 0.0) {
        col += uShimmer * 2.0 * (1.0 - distToEdge/0.1);
      }

      // Transparency: Very low base alpha to look like a veil
      float alpha = 0.2 + fresnel * 0.6 + pulse * 0.2;
      
      gl_FragColor = vec4(col, alpha);
    }
  `
};

// ----------------------
// 2. FAIRY SPARKLES SHADER
// ----------------------
const SparkleShader = {
    uniforms: {
        uTime: { value: 0 },
        uGrowth: { value: 0 },
        uColor: { value: new THREE.Color('#FFFACD') } // Lemon Chiffon / Gold Dust
    },
    vertexShader: `
        uniform float uTime;
        uniform float uGrowth;
        attribute float aProgress; // Where on the curve (0-1) is this particle?
        attribute float aRandom;
        attribute float aSize;
        
        varying float vAlpha;

        void main() {
            // Hide if beyond growth
            if (aProgress > uGrowth) {
                gl_Position = vec4(2.0, 2.0, 2.0, 0.0); // Clip
                return;
            }

            vec3 pos = position;
            
            // Orbiting / Swirling animation around the ribbon core
            float orbitSpeed = 2.0 + aRandom;
            float orbitRadius = 0.5 + sin(uTime + aRandom * 10.0) * 0.2;
            
            pos.x += cos(uTime * orbitSpeed + aRandom * 10.0) * orbitRadius;
            pos.z += sin(uTime * orbitSpeed + aRandom * 10.0) * orbitRadius;
            pos.y += sin(uTime * 3.0 + aRandom * 20.0) * 0.2; // Float Y

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Size attenuation
            gl_PointSize = (aSize * 50.0) * (1.0 / -mvPosition.z);
            
            // Twinkle
            vAlpha = 0.5 + 0.5 * sin(uTime * 5.0 + aRandom * 100.0);
            
            // Fade out at tail of growth? Optional.
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
            vec2 xy = gl_PointCoord.xy - vec2(0.5);
            float d = length(xy);
            if (d > 0.5) discard;
            
            float glow = 1.0 - (d * 2.0);
            glow = pow(glow, 2.0);
            
            gl_FragColor = vec4(uColor, vAlpha * glow);
        }
    `
};


export const Ribbon: React.FC<RibbonProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const sparkleRef = useRef<THREE.Points>(null);
  const sparkleShaderRef = useRef<THREE.ShaderMaterial>(null);

  const growthRef = useRef(0);
  
  // Shared Curve
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const loops = 9; 
    const segments = 500;
    
    // Geometry Constants
    const bottomY = -TREE_HEIGHT / 2;
    // Connect to Star (Moved to 1.4 to match Star.tsx)
    const topY = TREE_HEIGHT / 2 + 1.4; 
    const totalHeight = topY - bottomY;

    const radiusBase = TREE_RADIUS_BASE + 0.8; 

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = bottomY + (t * totalHeight);
      
      const taper = Math.pow(1 - t, 0.8);
      const r = taper * radiusBase; 
      
      const theta = t * loops * Math.PI * 2;
      
      points.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const geometry = useMemo(() => {
    // Reduced volume by 30% (0.08 -> 0.056)
    return new THREE.TubeGeometry(curve, 500, 0.056, 8, false);
  }, [curve]);

  // Generate Sparkle Points following the curve
  const sparkleGeometry = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      const count = 600; // Many magic points
      const positions = [];
      const progresses = [];
      const randoms = [];
      const sizes = [];

      for(let i=0; i<count; i++) {
          const t = Math.random(); // Position along curve
          const point = curve.getPoint(t);
          
          positions.push(point.x, point.y, point.z);
          progresses.push(t);
          randoms.push(Math.random());
          sizes.push(0.5 + Math.random() * 1.5);
      }
      
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('aProgress', new THREE.Float32BufferAttribute(progresses, 1));
      geo.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 1));
      geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
      
      return geo;
  }, [curve]);

  useFrame((state, delta) => {
     // Animation Logic
     const targetGrowth = treeState === TreeState.TREE_SHAPE ? 1 : 0;
     const speed = targetGrowth > growthRef.current ? 0.9 : 2.5;
     
     const diff = targetGrowth - growthRef.current;
     if (Math.abs(diff) > 0.001) {
       growthRef.current += diff * delta * speed;
       growthRef.current = Math.max(0, Math.min(1, growthRef.current));
     }

     const time = state.clock.elapsedTime;

    // Update Ribbon Shader
    if (shaderRef.current) {
       shaderRef.current.uniforms.uTime.value = time;
       shaderRef.current.uniforms.uGrowth.value = growthRef.current;
    }

    // Update Sparkle Shader
    if (sparkleShaderRef.current) {
        sparkleShaderRef.current.uniforms.uTime.value = time;
        sparkleShaderRef.current.uniforms.uGrowth.value = growthRef.current;
    }
  });

  return (
    <group>
        {/* The Ethereal Ribbon Sash */}
        <mesh ref={meshRef} geometry={geometry}>
        <shaderMaterial 
            ref={shaderRef}
            args={[RibbonShader]}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
        />
        </mesh>

        {/* The Fairy Dust Sparkles */}
        <points ref={sparkleRef} geometry={sparkleGeometry}>
            <shaderMaterial 
                ref={sparkleShaderRef}
                args={[SparkleShader]}
                transparent
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    </group>
  );
};