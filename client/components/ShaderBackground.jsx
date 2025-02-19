import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ShaderBackground({ isSessionActive, onClick }) {
  const mountRef = useRef(null);
  const materialRef = useRef(null);
  const isSessionActiveRef = useRef(isSessionActive);

  // Update ref when prop changes
  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uProgress;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec3 bgColor1 = mix(vec3(0.1, 0.2, 0.4), vec3(0.4, 0.1, 0.2), sin(uTime * 0.5) * 0.5 + 0.5);
      vec3 bgColor2 = mix(vec3(0.3, 0.1, 0.4), vec3(0.1, 0.3, 0.4), cos(uTime * 0.3) * 0.5 + 0.5);
      vec3 bg = mix(bgColor1, bgColor2, vUv.y);
      
      float pulse = sin(uTime * 2.0) * 0.05 + 0.9;
      vec3 coreColor = vec3(0.6, 0.7, 0.8);
      float dist = length(vUv - 0.5);
      float core = smoothstep(0.5, 0.2, dist * pulse);
      
      vec2 mouseDist = vUv - uMouse;
      float mouseInfluence = smoothstep(0.5, 0.0, length(mouseDist)) * 0.3;
      float lightTrails = sin(vUv.x * 50.0 + uTime * 5.0) * 0.05;
      
      vec3 finalColor = bg + core * coreColor + mouseInfluence + lightTrails;
      finalColor += vec3(uProgress) * 0.3 * (1.0 - smoothstep(0.0, 0.2, abs(dist - 0.25)));
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      canvas: document.createElement("canvas")
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uProgress: { value: 0 }
      }
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animationFrame;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsedTime;
      material.uniforms.uProgress.value = isSessionActiveRef.current ? 1 : 0;
      renderer.render(scene, camera);
    };
    animate();

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / container.clientWidth;
      const y = (e.clientY - rect.top) / container.clientHeight;
      material.uniforms.uMouse.value.set(x, 1 - y);
    };
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrame);
      container.removeChild(renderer.domElement);
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-pointer"
      onClick={onClick}
    />
  );
} 