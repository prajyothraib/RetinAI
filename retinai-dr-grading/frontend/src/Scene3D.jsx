import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

// Four-point chrome star (echoes the stars in the design)
function Star({ position, scale = 1, speed = 1 }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 2;
      const r = i % 2 ? 0.22 : 1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.06, bevelSegments: 4 });
  }, []);
  useFrame((_, d) => { ref.current.rotation.y += d * speed; ref.current.rotation.x += d * speed * 0.4; });
  return (
    <Float speed={2} floatIntensity={1.4}>
      <mesh ref={ref} geometry={geo} position={position} scale={scale}>
        <meshStandardMaterial color="#efd6ff" metalness={0.7} roughness={0.2} />
      </mesh>
    </Float>
  );
}

// Abstract eye that follows the cursor
function Eye() {
  const g = useRef();
  useFrame(({ pointer }, d) => {
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, pointer.x * 0.7, 4 * d);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, -pointer.y * 0.5, 4 * d);
  });
  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[1.25, 64, 64]} />
        <MeshDistortMaterial color="#9303c5" distort={0.22} speed={2} roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0, 1.12]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.55, 0.06, 16, 64]} />
        <meshStandardMaterial color="#d100ff" emissive="#d100ff" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 0, 1.1]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#02060e" roughness={0.1} />
      </mesh>
    </group>
  );
}

export default function Scene3D() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 3, 4]} intensity={60} color="#d100ff" />
      <pointLight position={[-4, -2, 3]} intensity={40} color="#8aa0ff" />
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.6}><Eye /></Float>
      <Star position={[-2.3, 1.4, 0]} scale={0.55} speed={0.8} />
      <Star position={[2.2, -1.4, 0.5]} scale={0.4} speed={1.2} />
      <Star position={[2.1, 1.6, -0.5]} scale={0.25} speed={1.6} />
    </Canvas>
  );
}
