import * as THREE from 'three'
import { Input } from './Input'
import { World } from './World'

export interface Scene {
  onInit(): void
  onUpdate(deltaTime: number): void
  onDestroy(): void
}

export class Engine {
  public renderer: THREE.WebGLRenderer
  public camera: THREE.PerspectiveCamera
  public world: World
  public input: Input

  public isRunning = false
  public fps = 0
  public objectCount = 0

  private container: HTMLElement
  private clock: THREE.Clock
  private currentScene: Scene | null = null
  private animationId: number | null = null
  private frameCount = 0
  private lastFpsUpdate = 0
  private debug = false

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 5, 10)
    this.camera.lookAt(0, 0, 0)

    // 创建世界
    this.world = new World()

    // 创建输入管理器
    this.input = new Input()

    // 监听窗口大小变化
    window.addEventListener('resize', this.onResize.bind(this))
  }

  loadScene(scene: Scene) {
    if (this.currentScene) {
      this.currentScene.onDestroy()
    }
    this.currentScene = scene
    scene.onInit()
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.clock.start()
    this.animate()
  }

  pause() {
    this.isRunning = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  resume() {
    if (!this.isRunning) {
      this.isRunning = true
      this.clock.start()
      this.animate()
    }
  }

  setDebug(enabled: boolean) {
    this.debug = enabled
  }

  dispose() {
    this.pause()
    if (this.currentScene) {
      this.currentScene.onDestroy()
    }
    this.world.clear()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
    window.removeEventListener('resize', this.onResize.bind(this))
  }

  private animate() {
    if (!this.isRunning) return

    this.animationId = requestAnimationFrame(this.animate.bind(this))

    const deltaTime = this.clock.getDelta()

    // 更新场景
    if (this.currentScene) {
      this.currentScene.onUpdate(deltaTime)
    }

    // 更新世界
    this.world.update(deltaTime)

    // 渲染
    this.renderer.render(this.world.scene, this.camera)

    // 更新 FPS
    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsUpdate = now
      this.objectCount = this.world.scene.children.length

      // 更新调试信息
      if (this.debug) {
        this.updateDebugInfo()
      }
    }

    // 清理输入状态
    this.input.update()
  }

  private updateDebugInfo() {
    const fpsEl = document.getElementById('debug-fps')
    const objectsEl = document.getElementById('debug-objects')
    if (fpsEl) fpsEl.textContent = `FPS: ${this.fps}`
    if (objectsEl) objectsEl.textContent = `Objects: ${this.objectCount}`
  }

  private onResize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
}
