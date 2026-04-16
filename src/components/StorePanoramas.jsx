// ═══════════════════════════════════════════════════════════
// StorePanoramas.jsx — Immersive 360° store environments
// Drop into src/components/ and add <StorePanoramas stores={stores} /> to your scene
// ═══════════════════════════════════════════════════════════

import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, BackSide, MathUtils } from 'three';

// All 8 store panoramas (generated via OpenArt Worlds)
// Images go in public/panoramas/
const PANORAMA_MAP = {
  'concrete-rose':     '/panoramas/concrete-rose.jpg',
  'bijadi':            '/panoramas/bijadi.jpg',
  'faithfully-faded':  '/panoramas/faithfully-faded.jpg',
  'hoe':               '/panoramas/hoe.jpg',
  'wanderlust':        '/panoramas/wanderlust.jpg',
  'cafe-sativa':       '/panoramas/cafe-sativa.jpg',
  'cold-stoned':       '/panoramas/cold-stoned.jpg',
  'verse-alkemist':    '/panoramas/verse-alkemist.jpg',
};

function PanoramaSphere({ storeId, position, radius = 12, activeStore, hoveredStore }) {
  const ref = useRef();
  const panoramaPath = PANORAMA_MAP[storeId];
  if (!panoramaPath) return null;

  const texture = useLoader(TextureLoader, panoramaPath);
  const isVisible = activeStore?.id === storeId || hoveredStore === storeId;

  useFrame(() => {
    if (!ref.current) return;
    const target = isVisible ? 0.95 : 0;
    ref.current.material.opacity = MathUtils.lerp(ref.current.material.opacity, target, 0.08);
    ref.current.visible = ref.current.material.opacity > 0.01;
    ref.current.rotation.y += 0.0003;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 64, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function StorePanoramas({ stores, activeStore, hoveredStore }) {
  // If using Zustand store, import useStore and get activeStore/hoveredStore from there instead:
  // const { activeStore, hoveredStore } = useStore();

  return (
    <group>
      {stores
        .filter(store => PANORAMA_MAP[store.id])
        .map(store => (
          <PanoramaSphere
            key={store.id}
            storeId={store.id}
            position={[store.position[0], store.position[1] + 3, store.position[2]]}
            radius={12}
            activeStore={activeStore}
            hoveredStore={hoveredStore}
          />
        ))
      }
    </group>
  );
}

// ═══════════════════════════════════════════════════════════
// INTEGRATION (add to your Scene component):
//
// import StorePanoramas from './components/StorePanoramas';
//
// In the Scene function, alongside existing elements:
//   <StorePanoramas stores={stores} activeStore={activeStore} hoveredStore={hoveredStore} />
//
// Or if using Zustand directly inside the component:
//   const { activeStore, hoveredStore } = useStore();
//   <StorePanoramas stores={stores} activeStore={activeStore} hoveredStore={hoveredStore} />
// ═══════════════════════════════════════════════════════════
