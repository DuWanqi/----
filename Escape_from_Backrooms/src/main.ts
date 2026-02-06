import * as THREE from 'three'
import { MainScene } from './game/MainScene'
import { PlatformBridge } from './platform/Bridge'

// 初始化平台通信
const bridge = new PlatformBridge()

// 创建场景、相机、渲染器
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.getElementById('game-container')?.appendChild(renderer.domElement)

// 创建游戏场景
const mainScene = new MainScene(scene, camera)

let isRunning = true

function init() {
  mainScene.init()
  
  // 隐藏加载屏幕
  const loadingScreen = document.getElementById('loading-screen')
  if (loadingScreen) {
    loadingScreen.classList.add('hidden')
  }
  
  // 通知平台
  bridge.sendReady()
  bridge.sendStateChange({ status: 'running', tick: 0, fps: 60, objectCount: 0 })
  
  // 开始渲染循环
  animate()
}

function animate() {
  requestAnimationFrame(animate)
  
  if (isRunning) {
    mainScene.update()
  }
  
  renderer.render(scene, camera)
}

// 窗口大小调整
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// 平台消息处理
bridge.onMessage((msg) => {
  switch (msg.type) {
    case 'play':
      isRunning = true
      bridge.sendStateChange({ status: 'running' })
      break
    case 'pause':
      isRunning = false
      bridge.sendStateChange({ status: 'paused' })
      break
    case 'reset':
      location.reload()
      break
  }
})

// 启动游戏
init()
