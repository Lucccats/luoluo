import React, { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { POLAROID_COUNT, SCATTER_RADIUS, TREE_HEIGHT, TREE_RADIUS_BASE } from '../constants';
import { DualPosition, TreeState } from '../types';

// Updated Shader to support Texture Atlas
const PolaroidMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uAtlas: { value: null }, // The texture atlas
    uHasAtlas: { value: 0 },
    uAtlasGrid: { value: new THREE.Vector2(4, 4) } // Assuming 4x4 grid (16 images max for now, reuse if more)
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vInstanceColor;
    varying float vInstanceIndex;
    
    // We can use built-in gl_InstanceID, but let's pass it via attribute if needed
    // Actually ThreeJS doesn't expose gl_InstanceID in ShaderMaterial easily without custom depthMat.
    // So we will add an attribute 'aIndex'
    
    attribute float aIndex;

    void main() {
      vUv = uv;
      vInstanceColor = instanceColor;
      vInstanceIndex = aIndex;
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vInstanceColor;
    varying float vInstanceIndex;
    
    uniform float uTime;
    uniform sampler2D uAtlas;
    uniform float uHasAtlas;
    uniform vec2 uAtlasGrid;

    void main() {
      // Polaroid Dimensions
      // Photo area: x(0.1, 0.9), y(0.15, 0.85)
      
      float isPhotoX = step(0.1, vUv.x) * step(vUv.x, 0.9);
      float isPhotoY = step(0.15, vUv.y) * step(vUv.y, 0.9);
      float isPhoto = isPhotoX * isPhotoY;
      
      vec3 paperColor = vec3(0.95, 0.95, 0.92); 

      vec3 photoContent = vec3(0.0);
      
      if (uHasAtlas > 0.5) {
        // Calculate Atlas UV
        // We have N images in a Grid (e.g. 4x4)
        // Which cell does this instance belong to?
        float totalCells = uAtlasGrid.x * uAtlasGrid.y;
        float cellIndex = mod(vInstanceIndex, totalCells);
        
        float col = mod(cellIndex, uAtlasGrid.x);
        float row = floor(cellIndex / uAtlasGrid.x);
        
        // Invert row because UV 0,0 is bottom left
        row = (uAtlasGrid.y - 1.0) - row;
        
        vec2 cellSize = 1.0 / uAtlasGrid;
        
        // Map local UV (0-1) to Cell UV
        // We only want the photo part to map to the image
        // Local UV for photo part is:
        vec2 photoUV = vec2(
          (vUv.x - 0.1) / 0.8,
          (vUv.y - 0.15) / 0.75
        );
        
        // Clamp to avoid bleeding
        photoUV = clamp(photoUV, 0.01, 0.99);
        
        vec2 atlasUV = (vec2(col, row) + photoUV) * cellSize;
        
        vec4 texColor = texture2D(uAtlas, atlasUV);
        
        // Mix with instance color for tinting
        photoContent = mix(texColor.rgb, vInstanceColor, 0.1); 
      } else {
        // Fallback procedural
        vec2 center = vec2(0.5, 0.55);
        float dist = distance(vUv, center);
        photoContent = mix(vInstanceColor, vec3(1.0), dist * 0.5);
      }
      
      float gloss = pow(max(0.0, sin(vUv.x * 10.0 + uTime + vUv.y * 5.0)), 20.0) * 0.2;
      vec3 finalColor = mix(paperColor, photoContent + gloss, isPhoto);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const generatePolaroidData = (count: number): DualPosition[] => {
  const data: DualPosition[] = [];
  for (let i = 0; i < count; i++) {
    const hNorm = Math.random();
    const y = (hNorm * TREE_HEIGHT) - (TREE_HEIGHT / 2);
    const rBase = (1 - hNorm) * TREE_RADIUS_BASE;
    const r = rBase + 0.2; 
    
    const theta = Math.random() * Math.PI * 2;
    const tx = r * Math.cos(theta);
    const tz = r * Math.sin(theta);
    const angleToCenter = Math.atan2(tx, tz);

    const phi = Math.acos(2 * Math.random() - 1);
    const lambda = 2 * Math.PI * Math.random();
    const rad = SCATTER_RADIUS * (0.8 + Math.random() * 0.4); 
    const sx = rad * Math.sin(phi) * Math.cos(lambda);
    const sy = rad * Math.sin(phi) * Math.sin(lambda);
    const sz = rad * Math.cos(phi);

    data.push({
      tree: [tx, y, tz],
      scatter: [sx, sy, sz],
      rotation: [0, angleToCenter, 0],
      // INCREASED SCALE BY ANOTHER 20% (1.2 * 1.2 = 1.44)
      scale: (0.8 + Math.random() * 0.4) * 1.44,
      speed: 0.3 + Math.random() * 0.5
    });
  }
  return data;
};

interface PolaroidsProps {
  treeState: TreeState;
  userPhotos: string[];
}

export const Polaroids: React.FC<PolaroidsProps> = ({ treeState, userPhotos }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => generatePolaroidData(POLAROID_COUNT), []);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const animProgress = useRef(0);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Atlas State
  const [atlasTexture, setAtlasTexture] = useState<THREE.CanvasTexture | null>(null);

  // Generate Atlas when photos change
  useEffect(() => {
    if (userPhotos.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 4x4 Grid = 16 images
    const gridSize = 4;
    const size = 1024;
    const cellSize = size / gridSize;
    
    canvas.width = size;
    canvas.height = size;
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    let loadedCount = 0;
    const imagesToLoad = userPhotos.slice(0, gridSize * gridSize); // Max 16

    imagesToLoad.forEach((src, idx) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const col = idx % gridSize;
        const row = Math.floor(idx / gridSize);
        // Draw image cover-style in the cell
        // Simple stretch for now
        ctx.drawImage(img, col * cellSize, row * cellSize, cellSize, cellSize);
        
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          const tex = new THREE.CanvasTexture(canvas);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearMipMapLinearFilter; // Ensure mipmaps if using pow2
          setAtlasTexture(tex);
        }
      };
      img.src = src;
    });
  }, [userPhotos]);

  // Setup Geometry Attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.8, 1.0, 0.02);
    const indices = new Float32Array(POLAROID_COUNT);
    for (let i = 0; i < POLAROID_COUNT; i++) indices[i] = i;
    geo.setAttribute('aIndex', new THREE.InstancedBufferAttribute(indices, 1));
    return geo;
  }, []);

  // Initialize Colors
  useLayoutEffect(() => {
    if (meshRef.current) {
      const tempColor = new THREE.Color();
      for (let i = 0; i < POLAROID_COUNT; i++) {
        const r = Math.random();
        if (r < 0.3) tempColor.setHSL(0.1, 0.6, 0.5);
        else if (r < 0.6) tempColor.setHSL(0.6, 0.4, 0.4);
        else tempColor.setHSL(Math.random(), 0.5, 0.5);
        meshRef.current.setColorAt(i, tempColor);
      }
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, []);

  useFrame((state, delta) => {
    const target = treeState === TreeState.TREE_SHAPE ? 1 : 0;
    const diff = target - animProgress.current;
    if (Math.abs(diff) > 0.001) animProgress.current += diff * delta;
    
    const t = animProgress.current;
    const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    
    if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        if (atlasTexture) {
           materialRef.current.uniforms.uAtlas.value = atlasTexture;
           materialRef.current.uniforms.uHasAtlas.value = 1.0;
        }
    }

    if (meshRef.current) {
      data.forEach((d, i) => {
        const x = THREE.MathUtils.lerp(d.scatter[0], d.tree[0], easeT);
        const y = THREE.MathUtils.lerp(d.scatter[1], d.tree[1], easeT);
        const z = THREE.MathUtils.lerp(d.scatter[2], d.tree[2], easeT);
        
        tempObj.position.set(x, y, z);
        
        if (t > 0.8) {
             const sway = Math.sin(state.clock.elapsedTime * d.speed + i) * 0.1;
             tempObj.rotation.set(sway, d.rotation[1] + sway, sway * 0.5);
        } else {
            const tumbleSpeed = (1 - t) * 2.0;
            tempObj.rotation.set(
                state.clock.elapsedTime * d.speed * tumbleSpeed + i,
                state.clock.elapsedTime * d.speed * tumbleSpeed + i * 2,
                state.clock.elapsedTime * d.speed * tumbleSpeed + i * 3
            );
        }
        tempObj.scale.setScalar(d.scale);
        tempObj.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[geometry, undefined, POLAROID_COUNT]} 
      castShadow
    >
      <shaderMaterial 
        ref={materialRef}
        args={[PolaroidMaterial]} 
      />
    </instancedMesh>
  );
};