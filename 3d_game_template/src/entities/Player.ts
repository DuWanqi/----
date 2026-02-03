// 《逃离后室：山屋惊魂》- 玩家实体

import * as THREE from 'three'
import { PlayerState, Position, Item, ItemType, GAME_CONFIG, COLORS, ITEMS_DATA, generateId } from '../game/types'

export class Player {
  public mesh: THREE.Group
  public state: PlayerState
  
  private bodyMesh: THREE.Mesh
  private headMesh: THREE.Mesh
  private lampLight: THREE.PointLight | null = null
  private keys: { [key: string]: boolean } = {}
  
  constructor(startPos: Position) {
    this.mesh = new THREE.Group()
    
    // 初始化状态
    this.state = {
      position: { ...startPos },
      sanity: GAME_CONFIG.MAX_SANITY,
      inventory: [],
      hasLamp: false,
      lampLit: false,
      isRunning: false,
      noiseLevel: 0
    }
    
    // 创建玩家模型
    this.bodyMesh = this.createBody()
    this.headMesh = this.createHead()
    
    this.mesh.add(this.bodyMesh)
    this.mesh.add(this.headMesh)
    
    this.mesh.position.set(startPos.x, 0, startPos.z)
    
    // 设置输入
    this.setupInput()
  }

  private createBody(): THREE.Mesh {
    const geom = new THREE.BoxGeometry(0.5, 0.8, 0.3)
    const mat = new THREE.MeshLambertMaterial({ color: 0x2244aa })
    const body = new THREE.Mesh(geom, mat)
    body.position.y = 0.5
    body.castShadow = true
    return body
  }

  private createHead(): THREE.Mesh {
    const geom = new THREE.SphereGeometry(0.2, 16, 16)
    const mat = new THREE.MeshLambertMaterial({ color: 0xffcc99 })
    const head = new THREE.Mesh(geom, mat)
    head.position.y = 1.1
    head.castShadow = true
    return head
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => { 
      this.keys[e.code] = true
      
      // Shift奔跑
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.state.isRunning = true
      }
      
      // E键使用道具
      if (e.code === 'KeyE') {
        this.toggleLamp()
      }
    })
    
    window.addEventListener('keyup', (e) => { 
      this.keys[e.code] = false
      
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.state.isRunning = false
      }
    })
  }

  update(deltaTime: number): void {
    // 处理移动
    this.handleMovement(deltaTime)
    
    // 更新噪音等级
    this.updateNoiseLevel(deltaTime)
    
    // 更新灯光
    this.updateLampLight()
    
    // 精神值自然衰减
    this.state.sanity = Math.max(0, this.state.sanity - GAME_CONFIG.SANITY_DECAY_RATE * deltaTime * 0.1)
  }

  private handleMovement(deltaTime: number): void {
    let dx = 0
    let dz = 0
    
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1
    
    if (dx !== 0 || dz !== 0) {
      // 归一化
      const len = Math.sqrt(dx * dx + dz * dz)
      dx /= len
      dz /= len
      
      // 计算速度（根据负重和精神值调整）
      let speed = this.state.isRunning ? GAME_CONFIG.PLAYER_RUN_SPEED : GAME_CONFIG.PLAYER_SPEED
      
      // 负重影响速度
      if (this.state.inventory.length >= GAME_CONFIG.MAX_INVENTORY) {
        speed *= 0.7
      }
      
      // 低精神值影响速度
      if (this.state.sanity < 30) {
        speed *= 0.8
      }
      
      const moveX = dx * speed * deltaTime
      const moveZ = dz * speed * deltaTime
      
      this.state.position.x += moveX
      this.state.position.z += moveZ
      this.mesh.position.x = this.state.position.x
      this.mesh.position.z = this.state.position.z
      
      // 面向移动方向
      this.mesh.rotation.y = Math.atan2(dx, dz)
      
      // 奔跑增加噪音
      if (this.state.isRunning) {
        this.state.noiseLevel = Math.min(100, this.state.noiseLevel + deltaTime * 20)
      }
    }
  }

  private updateNoiseLevel(deltaTime: number): void {
    // 噪音自然衰减
    this.state.noiseLevel = Math.max(0, this.state.noiseLevel - deltaTime * 10)
  }

  private updateLampLight(): void {
    if (this.state.lampLit && this.lampLight) {
      // 灯光闪烁效果
      this.lampLight.intensity = 1.5 + Math.sin(Date.now() * 0.01) * 0.2
    }
  }

  // 拾取道具
  pickupItem(item: Item): boolean {
    if (this.state.inventory.length >= GAME_CONFIG.MAX_INVENTORY) {
      return false // 背包满了
    }
    
    this.state.inventory.push(item)
    
    // 检查是否是煤油灯
    if (item.type === ItemType.OIL_LAMP) {
      this.state.hasLamp = true
    }
    
    return true
  }

  // 使用道具
  useItem(itemId: string): boolean {
    const index = this.state.inventory.findIndex(i => i.id === itemId)
    if (index === -1) return false
    
    const item = this.state.inventory[index]
    
    switch (item.type) {
      case ItemType.ALMOND_WATER:
        this.state.sanity = Math.min(GAME_CONFIG.MAX_SANITY, this.state.sanity + 30)
        this.state.inventory.splice(index, 1)
        return true
        
      case ItemType.OIL_LAMP:
        this.toggleLamp()
        return true
        
      case ItemType.BATTERY:
        // 延长灯油
        return true
    }
    
    return false
  }

  // 切换煤油灯
  toggleLamp(): void {
    if (!this.state.hasLamp) return
    
    this.state.lampLit = !this.state.lampLit
    
    if (this.state.lampLit) {
      if (!this.lampLight) {
        this.lampLight = new THREE.PointLight(COLORS.lampLight, 1.5, 8)
        this.lampLight.position.set(0, 1, 0)
        this.lampLight.castShadow = true
        this.mesh.add(this.lampLight)
      }
      this.lampLight.visible = true
    } else {
      if (this.lampLight) {
        this.lampLight.visible = false
      }
    }
  }

  // 受到伤害（精神值下降）
  takeDamage(amount: number): void {
    this.state.sanity = Math.max(0, this.state.sanity - amount)
  }

  // 恢复精神值
  heal(amount: number): void {
    this.state.sanity = Math.min(GAME_CONFIG.MAX_SANITY, this.state.sanity + amount)
  }

  // 获取背包中的道具
  getInventory(): Item[] {
    return this.state.inventory
  }

  // 检查是否有某类道具
  hasItem(type: ItemType): boolean {
    return this.state.inventory.some(i => i.type === type)
  }

  // 获取某类道具
  getItem(type: ItemType): Item | undefined {
    return this.state.inventory.find(i => i.type === type)
  }

  // 移除道具
  removeItem(itemId: string): void {
    const index = this.state.inventory.findIndex(i => i.id === itemId)
    if (index !== -1) {
      const item = this.state.inventory[index]
      this.state.inventory.splice(index, 1)
      
      if (item.type === ItemType.OIL_LAMP) {
        this.state.hasLamp = this.hasItem(ItemType.OIL_LAMP)
        if (!this.state.hasLamp) {
          this.state.lampLit = false
          if (this.lampLight) {
            this.lampLight.visible = false
          }
        }
      }
    }
  }

  // 获取玩家当前所在格子坐标
  getGridPosition(): { gridX: number, gridZ: number } {
    return {
      gridX: Math.round(this.state.position.x / GAME_CONFIG.ROOM_SIZE),
      gridZ: Math.round(this.state.position.z / GAME_CONFIG.ROOM_SIZE)
    }
  }

  // 检查是否靠近门
  isNearDoor(): boolean {
    const roomSize = GAME_CONFIG.ROOM_SIZE
    const gridPos = this.getGridPosition()
    const localX = this.state.position.x - gridPos.gridX * roomSize
    const localZ = this.state.position.z - gridPos.gridZ * roomSize
    
    const doorThreshold = roomSize / 2 - 0.5
    
    return Math.abs(localX) > doorThreshold || Math.abs(localZ) > doorThreshold
  }

  // 获取输入状态
  isKeyDown(code: string): boolean {
    return this.keys[code] || false
  }

  // 重置玩家
  reset(startPos: Position): void {
    this.state = {
      position: { ...startPos },
      sanity: GAME_CONFIG.MAX_SANITY,
      inventory: [],
      hasLamp: false,
      lampLit: false,
      isRunning: false,
      noiseLevel: 0
    }
    
    this.mesh.position.set(startPos.x, 0, startPos.z)
    
    if (this.lampLight) {
      this.lampLight.visible = false
    }
  }
}
