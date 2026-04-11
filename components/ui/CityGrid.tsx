"use client"

import { useEffect, useRef } from "react"

/**
 * Animated top-down city block grid — abstract floor plane in perspective
 * that slowly drifts. Used as a background behind the landlord section.
 */
export function CityGrid() {
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

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      container.appendChild(renderer.domElement)

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500)
      camera.position.set(0, 28, 28)
      camera.lookAt(0, 0, 0)

      const group = new THREE.Group()
      scene.add(group)

      // Grid floor
      const gridHelper = new THREE.GridHelper(80, 24, 0xf59e0b, 0x1f2937)
      ;(gridHelper.material as THREE.Material).opacity = 0.25
      ;(gridHelper.material as THREE.Material).transparent = true
      group.add(gridHelper)

      // Random building blocks
      const buildingMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.06,
        wireframe: true,
      })

      const GRID = 8
      const SPACING = 7
      for (let x = -GRID / 2; x < GRID / 2; x++) {
        for (let z = -GRID / 2; z < GRID / 2; z++) {
          if (Math.random() < 0.45) continue // sparse
          const h = Math.random() * 5 + 1
          const w = Math.random() * 2.5 + 1
          const geo  = new THREE.BoxGeometry(w, h, w)
          const mesh = new THREE.Mesh(geo, buildingMat)
          mesh.position.set(
            x * SPACING + (Math.random() - 0.5) * 2,
            h / 2,
            z * SPACING + (Math.random() - 0.5) * 2,
          )
          group.add(mesh)
        }
      }

      let t = 0
      const loop = () => {
        if (!mounted) return
        animId = requestAnimationFrame(loop)
        t += 0.004
        group.rotation.y = t * 0.12
        // Subtle camera bob
        camera.position.y = 28 + Math.sin(t * 0.4) * 1.5
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
      }
      loop()

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
