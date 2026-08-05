import * as THREE from 'three'
import { GUI } from 'lil-gui'
import Tempus from 'tempus'

export type TGrain = {
  destroy: () => void
}

type TGrainParams = {
  intensity: number
  grainScale: number
  frameRate: number
  dirtAmount: number
  mouseRadius: number
  mouseGain: number
  mouseWarp: number
  shockSpeed: number
  shockWidth: number
  shockGain: number
  shockDecay: number
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uGrainScale;
  uniform float uFrameRate;
  uniform float uDirtAmount;

  uniform vec2 uMouse;
  uniform float uMouseActive;
  uniform float uMouseSpeed;
  uniform float uMouseRadius;
  uniform float uMouseGain;
  uniform float uMouseWarp;

  uniform vec2 uShockOrigin;
  uniform float uShockAge;
  uniform float uShockAmp;
  uniform float uShockSpeed;
  uniform float uShockWidth;
  uniform float uShockGain;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;

    for (int i = 0; i < 4; i++) {
      sum += valueNoise(p) * amp;
      p *= 2.02;
      amp *= 0.5;
    }

    return sum;
  }

  void main() {
    vec2 px = vUv * uResolution;

    // Quantized time so the grain flickers on frames instead of crawling
    float frame = floor(uTime * uFrameRate);

    float dist = distance(px, uMouse);
    float proximity =
      uMouseActive * exp(-(dist * dist) / (2.0 * uMouseRadius * uMouseRadius));

    // Expanding ring of agitation travelling out from the last click
    float shockRadius = uShockAge * uShockSpeed;
    float shockDelta = distance(px, uShockOrigin) - shockRadius;
    float shock =
      uShockAmp * exp(-(shockDelta * shockDelta) / (uShockWidth * uShockWidth));

    float agitation = proximity * uMouseGain + shock * uShockGain;

    // Cursor drags the sampling grid around, so grain smears where it moves
    vec2 warp = vec2(
      fbm(px * 0.01 + frame * 0.05),
      fbm(px * 0.01 - frame * 0.05 + 17.0)
    ) - 0.5;
    vec2 samplePx =
      px + warp * uMouseWarp * (proximity + shock) * (1.0 + uMouseSpeed);

    float grain = hash(samplePx * uGrainScale + frame * 71.13);

    // Slow moving blotches keep the field from looking uniform
    float dirt = fbm(samplePx * 0.0035 + vec2(uTime * 0.02, uTime * -0.015));
    grain *= mix(1.0, dirt * 1.6, uDirtAmount);

    // Sparse bright specks, denser near the pointer and along the shockwave
    float speckThreshold = mix(0.92, 0.68, clamp(agitation, 0.0, 1.0));
    float speck = smoothstep(speckThreshold, 1.0, hash(samplePx * 1.7 - frame));

    // Agitation mostly buys contrast and speck density, not raw brightness
    float value = grain * 0.5 * (1.0 + agitation * 0.9) + speck * (0.3 + agitation);
    value *= uIntensity;

    // Channel offset gives agitated areas a dirty analog fringe
    float fringe = clamp(agitation, 0.0, 1.0) * 0.6;
    float r = value * (1.0 + fringe * 0.35);
    float g = value;
    float b = value * (1.0 - fringe * 0.25);

    gl_FragColor = vec4(clamp(vec3(r, g, b), 0.0, 1.0), 1.0);
  }
`

export const createGrain = (): TGrain => {
  const canvas = document.querySelector(
    '.grain-canvas'
  ) as HTMLCanvasElement | null

  if (!canvas) {
    return { destroy: () => {} }
  }

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  let renderer: THREE.WebGLRenderer

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
  } catch {
    document.documentElement.classList.add('no-grain-gl')
    return { destroy: () => {} }
  }

  const params: TGrainParams = {
    intensity: 0.25,
    grainScale: 0.6,
    frameRate: 19,
    dirtAmount: 0.66,
    mouseRadius: 245,
    mouseGain: 0.3,
    mouseWarp: 37,
    shockSpeed: 540,
    shockWidth: 225,
    shockGain: 0.5,
    shockDecay: 3.2,
  }

  const uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uIntensity: { value: params.intensity },
    uGrainScale: { value: params.grainScale },
    uFrameRate: { value: params.frameRate },
    uDirtAmount: { value: params.dirtAmount },
    uMouse: { value: new THREE.Vector2(-9999, -9999) },
    uMouseActive: { value: 0 },
    uMouseSpeed: { value: 0 },
    uMouseRadius: { value: params.mouseRadius },
    uMouseGain: { value: params.mouseGain },
    uMouseWarp: { value: params.mouseWarp },
    uShockOrigin: { value: new THREE.Vector2(-9999, -9999) },
    uShockAge: { value: 0 },
    uShockAmp: { value: 0 },
    uShockSpeed: { value: params.shockSpeed },
    uShockWidth: { value: params.shockWidth },
    uShockGain: { value: params.shockGain },
  }

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  })
  const quad = new THREE.Mesh(geometry, material)
  quad.frustumCulled = false
  scene.add(quad)

  const syncViewport = () => {
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const dpr = Math.min(window.devicePixelRatio, 1.5)

    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    uniforms.uResolution.value.set(width, height)
  }
  syncViewport()

  // Pointer state in shader space (origin bottom-left, CSS pixels)
  let pointerX = -9999
  let pointerY = -9999
  let lastPointerX = -9999
  let lastPointerY = -9999
  let targetActive = 0
  let pointerSpeed = 0

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    pointerX = e.clientX - rect.left
    pointerY = rect.bottom - e.clientY
    targetActive = 1
  }

  const handleMouseLeave = () => {
    targetActive = 0
  }

  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    uniforms.uShockOrigin.value.set(
      e.clientX - rect.left,
      rect.bottom - e.clientY
    )
    uniforms.uShockAge.value = 0
    uniforms.uShockAmp.value = 1
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseleave', handleMouseLeave)
  window.addEventListener('mousedown', handleMouseDown)

  let gui: GUI | null = null

  if (import.meta.env.DEV) {
    gui = new GUI({ title: 'Grain' })
    gui.close()

    const fieldFolder = gui.addFolder('Field')
    fieldFolder
      .add(params, 'intensity', 0, 2, 0.01)
      .name('Intensity')
      .onChange((v: number) => (uniforms.uIntensity.value = v))
    fieldFolder
      .add(params, 'grainScale', 0.1, 3, 0.05)
      .name('Grain Scale')
      .onChange((v: number) => (uniforms.uGrainScale.value = v))
    fieldFolder
      .add(params, 'frameRate', 1, 60, 1)
      .name('Flicker FPS')
      .onChange((v: number) => (uniforms.uFrameRate.value = v))
    fieldFolder
      .add(params, 'dirtAmount', 0, 1, 0.01)
      .name('Dirt Blotches')
      .onChange((v: number) => (uniforms.uDirtAmount.value = v))

    const pointerFolder = gui.addFolder('Pointer')
    pointerFolder
      .add(params, 'mouseRadius', 20, 600, 5)
      .name('Radius')
      .onChange((v: number) => (uniforms.uMouseRadius.value = v))
    pointerFolder
      .add(params, 'mouseGain', 0, 3, 0.05)
      .name('Gain')
      .onChange((v: number) => (uniforms.uMouseGain.value = v))
    pointerFolder
      .add(params, 'mouseWarp', 0, 120, 1)
      .name('Warp')
      .onChange((v: number) => (uniforms.uMouseWarp.value = v))

    const clickFolder = gui.addFolder('Click Shockwave')
    clickFolder
      .add(params, 'shockSpeed', 100, 3000, 10)
      .name('Speed (px/s)')
      .onChange((v: number) => (uniforms.uShockSpeed.value = v))
    clickFolder
      .add(params, 'shockWidth', 10, 500, 5)
      .name('Ring Width')
      .onChange((v: number) => (uniforms.uShockWidth.value = v))
    clickFolder
      .add(params, 'shockGain', 0, 3, 0.05)
      .name('Ring Gain')
      .onChange((v: number) => (uniforms.uShockGain.value = v))
    clickFolder.add(params, 'shockDecay', 0.2, 6, 0.1).name('Ring Decay')
  }

  let lastTime = performance.now()

  const tick = () => {
    const now = performance.now()
    const delta = Math.min((now - lastTime) / 1000, 0.1)
    lastTime = now

    uniforms.uTime.value += delta

    if (lastPointerX !== -9999) {
      const travelled = Math.hypot(
        pointerX - lastPointerX,
        pointerY - lastPointerY
      )
      const instantSpeed = Math.min(travelled / (delta * 1500), 1)
      pointerSpeed += (instantSpeed - pointerSpeed) * 0.15
    }
    lastPointerX = pointerX
    lastPointerY = pointerY

    uniforms.uMouse.value.set(pointerX, pointerY)
    uniforms.uMouseSpeed.value = pointerSpeed
    uniforms.uMouseActive.value +=
      (targetActive - uniforms.uMouseActive.value) * 0.12

    if (uniforms.uShockAmp.value > 0.001) {
      uniforms.uShockAge.value += delta
      uniforms.uShockAmp.value *= Math.exp(-params.shockDecay * delta)
    } else {
      uniforms.uShockAmp.value = 0
    }

    renderer.render(scene, camera)
  }

  const unsubscribe = prefersReducedMotion ? null : Tempus.add(tick)

  if (prefersReducedMotion) {
    renderer.render(scene, camera)
  }

  const handleResize = () => {
    syncViewport()

    if (prefersReducedMotion) {
      renderer.render(scene, camera)
    }
  }
  window.addEventListener('resize', handleResize)

  const destroy = () => {
    unsubscribe?.()
    gui?.destroy()
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseleave', handleMouseLeave)
    window.removeEventListener('mousedown', handleMouseDown)

    scene.remove(quad)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }

  return { destroy }
}
