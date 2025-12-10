import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, GIFT_COUNT, ORNAMENT_COUNT, ROUND_GIFT_COUNT, SCATTER_RADIUS, TREE_HEIGHT, TREE_RADIUS_BASE } from '../constants';
import { DualPosition, TreeState } from '../types';

// Helper to generate positions
const generateData = (count: number, type: 'box' | 'sphere' | 'cylinder'): DualPosition[] => {
  const data: DualPosition[] = [];
  for (let i = 0; i < count; i++) {
    // --- Tree Position ---
    let y, r, theta;

    // Standard Tree placement
    const hNorm = Math.random();
    // Boxes/Cylinders (heavy) tend to be lower, Spheres everywhere
    const hAdjusted = type !== 'sphere' ? hNorm * 0.7 : hNorm; 
    
    y = (hAdjusted * TREE_HEIGHT) - (TREE_HEIGHT / 2);
    // Move ornaments slightly to the "surface" of the tree cone
    const rBaseOnTree = (1 - hAdjusted) * TREE_RADIUS_BASE;
    // Add layers: some deep inside, some on surface
    const depth = Math.random() > 0.7 ? 0.8 : 1.1; 
    r = rBaseOnTree * depth;
    theta = Math.random() * Math.PI * 2;

    const tx = r * Math.cos(theta);
    const tz = r * Math.sin(theta);

    // --- Scatter Position ---
    const phi = Math.acos(2 * Math.random() - 1);
    const lambda = 2 * Math.PI * Math.random();
    
    // Fly into space
    const rad = SCATTER_RADIUS * (0.5 + Math.random() * 0.5); 
    const sx = rad * Math.sin(phi) * Math.cos(lambda);
    const sy = rad * Math.sin(phi) * Math.sin(lambda);
    const sz = rad * Math.cos(phi);

    data.push({
      tree: [tx, y, tz],
      scatter: [sx, sy, sz],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      scale: type === 'sphere' ? 0.2 + Math.random() * 0.2 : 0.4 + Math.random() * 0.4,
      speed: 0.5 + Math.random()
    });
  }
  return data;
};

interface OrnamentSystemProps {
  treeState: TreeState;
}

export const Ornaments: React.FC<OrnamentSystemProps> = ({ treeState }) => {
  // --- Gifts (Boxes on Tree) ---
  const giftMesh = useRef<THREE.InstancedMesh>(null);
  const giftData = useMemo(() => generateData(GIFT_COUNT, 'box'), []);
  
  // --- Round Gifts (Cylinders) ---
  const roundGiftMesh = useRef<THREE.InstancedMesh>(null);
  const roundGiftData = useMemo(() => generateData(ROUND_GIFT_COUNT, 'cylinder'), []);

  // --- Baubles (Spheres) ---
  const baubleMesh = useRef<THREE.InstancedMesh>(null);
  const baubleData = useMemo(() => generateData(ORNAMENT_COUNT, 'sphere'), []);

  // Temp objects to avoid GC
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  // Animation state (0 to 1)
  const animProgress = useRef(0);

  // Initialize Colors
  useLayoutEffect(() => {
    const setLuxuryColors = (mesh: THREE.InstancedMesh, count: number) => {
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        
        if (r < 0.4) tempColor.set(COLORS.gold); 
        else if (r < 0.7) tempColor.set(COLORS.silver); 
        else if (r < 0.85) tempColor.set('#8B0000'); 
        else tempColor.set(COLORS.emerald); 
        
        // Add slight variation/metallic tint
        if (r < 0.7) tempColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
        
        mesh.setColorAt(i, tempColor);
      }
      mesh.instanceColor!.needsUpdate = true;
    };

    if (giftMesh.current) setLuxuryColors(giftMesh.current, GIFT_COUNT);
    if (roundGiftMesh.current) setLuxuryColors(roundGiftMesh.current, ROUND_GIFT_COUNT);
    if (baubleMesh.current) setLuxuryColors(baubleMesh.current, ORNAMENT_COUNT);

  }, [tempColor]);

  useFrame((state, delta) => {
    // Update animation progress
    const target = treeState === TreeState.TREE_SHAPE ? 1 : 0;
    const speed = 1.0; 
    const diff = target - animProgress.current;
    
    if (Math.abs(diff) > 0.001) {
       animProgress.current += diff * delta * speed;
    }

    const t = animProgress.current;
    const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const time = state.clock.elapsedTime;

    const updateMesh = (mesh: THREE.InstancedMesh, data: DualPosition[]) => {
      data.forEach((d, i) => {
        const { tree, scatter, rotation, scale, speed } = d;
        
        const x = THREE.MathUtils.lerp(scatter[0], tree[0], easeT);
        const y = THREE.MathUtils.lerp(scatter[1], tree[1], easeT);
        const z = THREE.MathUtils.lerp(scatter[2], tree[2], easeT);

        tempObj.position.set(x, y, z);
        
        tempObj.rotation.set(
          rotation[0] + time * speed * 0.2 * (1 - t),
          rotation[1] + time * speed * 0.5,
          rotation[2] + time * speed * 0.1 * (1 - t)
        );

        tempObj.scale.setScalar(scale);
        tempObj.updateMatrix();
        mesh.setMatrixAt(i, tempObj.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    if (giftMesh.current) updateMesh(giftMesh.current, giftData);
    if (roundGiftMesh.current) updateMesh(roundGiftMesh.current, roundGiftData);
    if (baubleMesh.current) updateMesh(baubleMesh.current, baubleData);
  });

  return (
    <>
      {/* Rectangular Gifts on Tree */}
      <instancedMesh ref={giftMesh} args={[undefined, undefined, GIFT_COUNT]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.2} metalness={0.8} />
      </instancedMesh>

      {/* Round Gifts (Hat Boxes) */}
      <instancedMesh ref={roundGiftMesh} args={[undefined, undefined, ROUND_GIFT_COUNT]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.8, 32]} />
        <meshStandardMaterial roughness={0.2} metalness={0.8} />
      </instancedMesh>

      {/* Baubles */}
      <instancedMesh ref={baubleMesh} args={[undefined, undefined, ORNAMENT_COUNT]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial roughness={0.1} metalness={1.0} envMapIntensity={2.0} />
      </instancedMesh>
    </>
  );
};
