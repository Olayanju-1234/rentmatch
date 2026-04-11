"use client"

import { useEffect, useRef } from "react"

/**
 * Full-bleed particle mesh for hero backgrounds.
 * Uses Three.js Points + custom lines between nearby nodes.
 * SSR-safe — only runs on client.
 */
export function ParticleMesh() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animId: number
    let renderer: any
    let mounted = true

    ;(async () => {
      const THREE = (await import("three")).default
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      const W = container.clientWidth
      const H = container.clientHeight

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      container.appendChild(renderer.domElement)

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200)
      camera.position.z = 50

      const COUNT = 120
      const positions: number[] = []
      const velocities: THREE.Vector3[] = []

      for (let i = 0; i < COUNT; i++) {
        const x = (Math.random() - 0.5) * 90
        const y = (Math.random() - 0.5) * 60
        const z = (Math.random() - 0.5) * 30
        positions.push(x, y, z)
        velocities.push(new THREE.Vector3(
          (Math.random() - 0.5) * 0.018,
          (Math.random() - 0.5) * 0.012,
          0,
        ))
      }

      // Dots
      const dotGeo = new THREE.BufferGeometry()
      const posArr  = new Float32Array(positions)
      dotGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3))
      const dotMat  = new THREE.PointsMaterial({ color: 0xf59e0b, size: 0.6, transparent: true, opacity: 0.5 })
      const dots    = new THREE.Points(dotGeo, dotMat)
      scene.add(dots)

      // Lines between nearby pairs
      const LINE_DIST = 22
      const lineGeo   = new THREE.BufferGeometry()
      const lineArr   = new Float32Array(COUNT * COUNT * 6) // generous upper bound
      lineGeo.setAttribute("position", new THREE.BufferAttribute(lineArr, 3))
      const lineMat   = new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.12 }),
      )
      scene.add(lineMat)

      const loop = () => {
        if (!mounted) return
        animId = requestAnimationFrame(loop)

        // Move particles
        for (let i = 0; i < COUNT; i++) {
          posArr[i * 3]     += velocities[i].x
          posArr[i * 3 + 1] += velocities[i].y
          // Wrap edges
          if (posArr[i * 3]     >  45) posArr[i * 3]     = -45
          if (posArr[i * 3]     < -45) posArr[i * 3]     =  45
          if (posArr[i * 3 + 1] >  30) posArr[i * 3 + 1] = -30
          if (posArr[i * 3 + 1] < -30) posArr[i * 3 + 1] =  30
        }
        dotGeo.attributes.position.needsUpdate = true

        // Rebuild line segments
        let lineIdx = 0
        for (let i = 0; i < COUNT; i++) {
          for (let j = i + 1; j < COUNT; j++) {
            const dx = posArr[i * 3]     - posArr[j * 3]
            const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1]
            const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
            if (dist < LINE_DIST) {
              lineArr[lineIdx++] = posArr[i * 3]
              lineArr[lineIdx++] = posArr[i * 3 + 1]
              lineArr[lineIdx++] = posArr[i * 3 + 2]
              lineArr[lineIdx++] = posArr[j * 3]
              lineArr[lineIdx++] = posArr[j * 3 + 1]
              lineArr[lineIdx++] = posArr[j * 3 + 2]
            }
          }
        }
        lineGeo.setDrawRange(0, lineIdx / 3)
        lineGeo.attributes.position.needsUpdate = true

        renderer.render(scene, camera)
      }
      loop()

      // Resize
      const onResize = () => {
        const w = container.clientWidth
        const h = container.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    })()

    return () => {
      mounted = false
      cancelAnimationFrame(animId)
      renderer?.dispose()
      containerRef.current?.querySelector("canvas")?.remove()
    }
  }, [])

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />
}
