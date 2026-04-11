"use client"

import { useEffect, useRef } from "react"

interface MatchSphereProps {
  score: number // 0–100
}

const VERT = `
  uniform float uTime;
  uniform float uScore;
  varying vec3 vNormal;
  varying float vNoise;

  float noise(vec3 p) {
    return sin(p.x * 4.2 + uTime * 0.7)
         * cos(p.y * 3.8 + uTime * 0.5)
         * sin(p.z * 4.5 + uTime * 0.6);
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    float n    = noise(position);
    float disp = n * (1.0 - uScore) * 0.42;
    vNoise = disp;
    vec3 newPos = position + normal * disp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`

const FRAG = `
  uniform float uScore;
  varying vec3 vNormal;
  varying float vNoise;

  void main() {
    vec3 light   = normalize(vec3(1.5, 1.0, 2.0));
    float diff   = max(dot(vNormal, light), 0.0);
    float ambient = 0.18;

    vec3 lowCol  = vec3(0.28, 0.30, 0.33);
    vec3 highCol = vec3(0.96, 0.63, 0.10);
    vec3 base    = mix(lowCol, highCol, uScore);

    // Rim
    vec3  viewDir = vec3(0.0, 0.0, 1.0);
    float rim     = 1.0 - max(dot(vNormal, viewDir), 0.0);
    rim = pow(rim, 2.8);
    vec3 rimCol = mix(vec3(0.15, 0.18, 0.22), vec3(1.0, 0.82, 0.22), uScore);

    vec3 col = base * (ambient + diff * 0.82) + rimCol * rim * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function MatchSphere({ score }: MatchSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const uniformsRef  = useRef<{ uTime: { value: number }; uScore: { value: number } } | null>(null)
  const tweenRef     = useRef<any>(null)

  // Bootstrap Three.js once
  useEffect(() => {
    let animId: number
    let renderer: any
    let mounted = true

    ;(async () => {
      const [THREE, { gsap }] = await Promise.all([
        import("three"),
        import("gsap"),
      ])
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      const W = container.clientWidth  || 400
      const H = container.clientHeight || 400

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
      camera.position.z = 3.2

      const uniforms = {
        uTime:  { value: 0 },
        uScore: { value: score / 100 },
      }
      uniformsRef.current = uniforms

      const geo = new THREE.IcosahedronGeometry(1, 48)
      const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG })
      const mesh = new THREE.Mesh(geo, mat)
      scene.add(mesh)

      // Subtle point light glow (rendered in shader but add a helper light halo via a second pass)
      const loop = () => {
        if (!mounted) return
        animId = requestAnimationFrame(loop)
        uniforms.uTime.value += 0.016
        mesh.rotation.y += 0.004
        mesh.rotation.x += 0.0015
        renderer.render(scene, camera)
      }
      loop()
    })()

    return () => {
      mounted = false
      cancelAnimationFrame(animId)
      renderer?.dispose()
      containerRef.current?.querySelector("canvas")?.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate score changes with GSAP
  useEffect(() => {
    if (!uniformsRef.current) return
    tweenRef.current?.kill()
    import("gsap").then(({ gsap }) => {
      tweenRef.current = gsap.to(uniformsRef.current!.uScore, {
        value: score / 100,
        duration: 0.9,
        ease: "power3.out",
      })
    })
  }, [score])

  return <div ref={containerRef} className="w-full h-full" />
}
