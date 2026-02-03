// 《逃离后室：山屋惊魂》- 主游戏场景

import * as THREE from 'three'
import { 
  GamePhase, CompanionType, RoomType, Direction, Room, 
  GAME_CONFIG, COLORS, getRoomKey, getDirectionOffset, ItemType, EntityType
} from './types'
import { RoomGenerator } from './RoomGenerator'
import { Player } from '../entities/Player'
import { Companion } from '../entities/Companion'
import { BaseEntity, createEntity, Smiler } from '../entities/Entity'
import { aiService, AIDialogueContext } from '../systems/AIService'
import { GameUI } from '../ui/GameUI'
import { logger, EventType } from '../systems/Logger'

export class MainScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  
  // 游戏状态
  private phase: GamePhase = GamePhase.MENU
  private roomsExplored = 0
  private timeElapsed = 0
  private difficulty = 'normal'
  
  // 游戏对象
  private roomGenerator: RoomGenerator
  private player: Player | null = null
  private companion: Companion | null = null
  private currentRoom: Room | null = null
  private entities: BaseEntity[] = []
  
  // UI
  private ui: GameUI
  
  // 输入状态
  private keys: { [key: string]: boolean } = {}
  private inventoryOpen = false
  private lastRoomKey = ''
  private roomTransitionCooldown = 0  // 房间切换冷却时间
  private smilerWarningShown = false  // Smiler警告是否已显示（防止每帧调用）

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.camera = camera
    this.roomGenerator = new RoomGenerator(scene)
    this.ui = new GameUI()
  }

  init(): void {
    // 设置场景背景
    this.scene.background = new THREE.Color(0x1a1a1a)
    
    // 添加环境光 - 增强可见性
    const ambientLight = new THREE.AmbientLight(0xfff5e0, 0.6)
    this.scene.add(ambientLight)

    // 添加方向光
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    this.scene.add(dirLight)

    // 设置俯视角相机
    this.setupCamera()

    // 设置输入
    this.setupInput()

    // 设置UI事件
    this.ui.setupEventListeners({
      onStart: (companionType) => this.startGame(companionType),
      onRestart: () => this.restartGame(),
      onSettingsSave: (apiKey, difficulty) => {
        if (apiKey) {
          aiService.setApiKey(apiKey)
        }
        this.difficulty = difficulty
      }
    })
    
    // 显示主菜单
    this.ui.showMenu()
  }

  private setupCamera(): void {
    // 俯视角相机设置
    this.camera.position.set(0, 12, 8)
    this.camera.lookAt(0, 0, 0)
    this.camera.fov = 60
    this.camera.updateProjectionMatrix()
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true
      
      // ESC 暂停/继续
      if (e.code === 'Escape') {
        if (this.phase === GamePhase.PLAYING) {
          this.phase = GamePhase.PAUSED
          this.ui.showPauseMenu()
        } else if (this.phase === GamePhase.PAUSED) {
          this.phase = GamePhase.PLAYING
          this.ui.hideMessage()
        }
      }
      
      // I 背包
      if (e.code === 'KeyI' && this.phase === GamePhase.PLAYING) {
        this.inventoryOpen = !this.inventoryOpen
        if (this.inventoryOpen) {
          this.ui.showInventory()
          this.ui.updateInventory(
            this.player?.getInventory() || [],
            (itemId) => this.useItem(itemId)
          )
        } else {
          this.ui.hideInventory()
        }
      }
      
      // F 与队友交互
      if (e.code === 'KeyF' && this.phase === GamePhase.PLAYING) {
        this.interactWithCompanion()
      }
      
      // E 互动（煤油灯/出口传送门）
      if (e.code === 'KeyE' && this.phase === GamePhase.PLAYING) {
        // 如果在出口房间，触发逃离
        if (this.currentRoom?.type === RoomType.EXIT) {
          this.triggerExit()
        } else if (this.player) {
          // 否则切换煤油灯
          this.player.toggleLamp()
        }
      }
      
      // 空格 拾取物品
      if (e.code === 'Space' && this.phase === GamePhase.PLAYING) {
        this.tryPickupItem()
      }
    })
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false
    })
  }

  private startGame(companionType: CompanionType): void {
    logger.event(EventType.GAME_START, `队友类型: ${companionType}`)
    
    this.phase = GamePhase.PLAYING
    this.roomsExplored = 0
    this.timeElapsed = 0
    this.entities = []
    
    // 隐藏菜单
    this.ui.hideMenu()
    
    // 清理之前的游戏
    this.roomGenerator.clearAll()
    
    // 生成起始房间
    logger.event(EventType.ROOM_GENERATE, '生成起始房间')
    this.currentRoom = this.roomGenerator.generateStartRoom()
    this.lastRoomKey = getRoomKey(this.currentRoom.position)
    
    // 创建玩家
    const startPos = { x: 0, z: 0 }
    this.player = new Player(startPos)
    this.scene.add(this.player.mesh)
    logger.info('玩家已创建')
    
    // 创建AI队友
    this.companion = new Companion(companionType, startPos)
    this.scene.add(this.companion.mesh)
    logger.info(`AI队友已创建: ${this.companion.state.name}`)
    
    // 显示开场对话（使用同步方式，不阻塞）
    this.showCompanionDialogueSync()
    
    // 更新相机
    this.updateCamera()
    
    logger.info('游戏初始化完成')
  }

  private restartGame(): void {
    // 清理
    if (this.player) {
      this.scene.remove(this.player.mesh)
    }
    if (this.companion) {
      this.scene.remove(this.companion.mesh)
    }
    this.entities.forEach(e => this.scene.remove(e.mesh))
    this.entities = []
    this.roomGenerator.clearAll()
    
    // 重置状态
    this.phase = GamePhase.MENU
    this.ui.hideMessage()
    this.ui.showMenu()
  }

  update(): void {
    try {
      const delta = this.clock.getDelta()
      
      if (this.phase !== GamePhase.PLAYING) return
      
      this.timeElapsed += delta
      
      // 更新玩家
      if (this.player) {
        this.player.update(delta)
        
        // 检测玩家是否进入新房间
        this.checkRoomTransition()
        
        // 更新相机跟随
        this.updateCamera()
      }
      
      // 更新AI队友
      if (this.companion && this.player) {
        this.companion.update(delta, this.player.state.position)
      }
      
      // 更新实体
      this.updateEntities(delta)
      
      // 更新AI服务
      aiService.update(delta)
      
      // 检测碰撞和交互
      this.checkCollisions()
      
      // 检测游戏状态
      this.checkGameState()
      
      // 更新UI
      this.updateUI()
    } catch (error) {
      console.error('游戏更新错误:', error)
      logger.error(`游戏更新错误: ${error}`)
    }
  }

  private checkRoomTransition(): void {
    if (!this.player || !this.currentRoom) return
    
    // 防止过于频繁的房间切换
    if (this.roomTransitionCooldown > 0) {
      this.roomTransitionCooldown -= 0.016 // 约60fps
      return
    }
    
    const gridPos = this.player.getGridPosition()
    const currentKey = getRoomKey({ gridX: gridPos.gridX, gridZ: gridPos.gridZ })
    
    // 检测是否进入新房间
    if (currentKey !== this.lastRoomKey) {
      const direction = this.getTransitionDirection(gridPos)
      
      // 检查当前房间是否有这个方向的门
      if (direction && !this.currentRoom.doors.includes(direction)) {
        // 没有门，不允许通过，将玩家推回
        logger.debug(`尝试穿过没有门的墙壁 (方向: ${direction})`)
        this.pushPlayerBack(direction)
        return
      }
      
      const existingRoom = this.roomGenerator.getRoom({ gridX: gridPos.gridX, gridZ: gridPos.gridZ })
      
      if (existingRoom) {
        // 已存在的房间 - 检查目标房间是否有对应的门
        const oppositeDir = getDirectionOffset(direction!)
        const targetDoorDir = this.getOppositeDirection(direction!)
        
        if (!existingRoom.doors.includes(targetDoorDir)) {
          // 目标房间没有对应的门，动态添加
          existingRoom.doors.push(targetDoorDir)
          logger.debug(`为房间 [${existingRoom.position.gridX}, ${existingRoom.position.gridZ}] 添加门: ${targetDoorDir}`)
        }
        
        this.enterRoom(existingRoom, direction!)
      } else {
        // 需要生成新房间
        if (direction) {
          const newRoom = this.roomGenerator.generateRoom(this.currentRoom.position, direction)
          this.enterRoom(newRoom, direction)
          this.roomsExplored++
        }
      }
      
      this.lastRoomKey = currentKey
      this.roomTransitionCooldown = 0.5 // 0.5秒冷却，防止反复切换
    }
  }
  
  // 获取相反方向
  private getOppositeDirection(dir: Direction): Direction {
    switch (dir) {
      case Direction.NORTH: return Direction.SOUTH
      case Direction.SOUTH: return Direction.NORTH
      case Direction.EAST: return Direction.WEST
      case Direction.WEST: return Direction.EAST
    }
  }
  
  // 将玩家推回房间内
  private pushPlayerBack(attemptedDirection: Direction): void {
    if (!this.player || !this.currentRoom) return
    
    const playerPos = this.player.state.position
    const roomSize = GAME_CONFIG.ROOM_SIZE
    const roomCenterX = this.currentRoom.position.gridX * roomSize
    const roomCenterZ = this.currentRoom.position.gridZ * roomSize
    const pushDist = 0.5
    
    switch (attemptedDirection) {
      case Direction.NORTH:
        playerPos.z = roomCenterZ - roomSize / 2 + pushDist + 0.5
        break
      case Direction.SOUTH:
        playerPos.z = roomCenterZ + roomSize / 2 - pushDist - 0.5
        break
      case Direction.EAST:
        playerPos.x = roomCenterX + roomSize / 2 - pushDist - 0.5
        break
      case Direction.WEST:
        playerPos.x = roomCenterX - roomSize / 2 + pushDist + 0.5
        break
    }
    
    this.player.mesh.position.x = playerPos.x
    this.player.mesh.position.z = playerPos.z
  }

  private getTransitionDirection(newGridPos: { gridX: number, gridZ: number }): Direction | null {
    if (!this.currentRoom) return null
    
    const dx = newGridPos.gridX - this.currentRoom.position.gridX
    const dz = newGridPos.gridZ - this.currentRoom.position.gridZ
    
    if (dz < 0) return Direction.NORTH
    if (dz > 0) return Direction.SOUTH
    if (dx > 0) return Direction.EAST
    if (dx < 0) return Direction.WEST
    
    return null
  }

  private enterRoom(room: Room, fromDirection?: Direction): void {
    logger.event(EventType.ROOM_ENTER, `进入房间 [${room.position.gridX}, ${room.position.gridZ}] 类型: ${room.type}`)
    
    this.currentRoom = room
    room.visited = true
    
    // ====== 将玩家正确定位到房间入口处 ======
    if (fromDirection) {
      this.positionPlayerAtEntrance(fromDirection)
    }
    
    // 生成实体（延迟一帧，避免影响碰撞检测）
    if (room.hasEntity && room.entityType) {
      // 使用setTimeout确保不阻塞当前帧
      setTimeout(() => this.spawnEntity(room), 100)
    }
    
    // 触发对话（使用同步版本，不阻塞）- 也延迟以避免冲突
    setTimeout(() => this.showCompanionDialogueSync(), 50)
    
    // 检测循环房间
    if (room.isLoopRoom) {
      logger.event(EventType.ROOM_ENTER, '循环房间！')
      this.ui.showWarning('这个空间似乎在循环...寻找不对劲的地方！')
    }
    
    // 检测是否是出口（必须是EXIT房间才能逃离）
    if (room.type === RoomType.EXIT) {
      logger.info('进入出口房间！')
      this.ui.showWarning('🚪 这是出口！按 E 键与传送门互动逃离！')
    }
  }
  
  // 将玩家定位到房间入口处（安全位置）
  private positionPlayerAtEntrance(fromDirection: Direction): void {
    if (!this.player || !this.currentRoom) return
    
    const playerPos = this.player.state.position
    const roomSize = GAME_CONFIG.ROOM_SIZE
    const roomCenterX = this.currentRoom.position.gridX * roomSize
    const roomCenterZ = this.currentRoom.position.gridZ * roomSize
    const entranceOffset = roomSize / 2 - 1.5 // 距离门1.5单位
    
    // 根据进入方向，将玩家放在入口处
    switch (fromDirection) {
      case Direction.NORTH:
        // 从南边进入（玩家向北走）
        playerPos.z = roomCenterZ + entranceOffset
        playerPos.x = roomCenterX
        break
      case Direction.SOUTH:
        // 从北边进入（玩家向南走）
        playerPos.z = roomCenterZ - entranceOffset
        playerPos.x = roomCenterX
        break
      case Direction.EAST:
        // 从西边进入（玩家向东走）
        playerPos.x = roomCenterX - entranceOffset
        playerPos.z = roomCenterZ
        break
      case Direction.WEST:
        // 从东边进入（玩家向西走）
        playerPos.x = roomCenterX + entranceOffset
        playerPos.z = roomCenterZ
        break
    }
    
    this.player.mesh.position.x = playerPos.x
    this.player.mesh.position.z = playerPos.z
    
    logger.debug(`玩家定位到入口: (${playerPos.x.toFixed(2)}, ${playerPos.z.toFixed(2)})`)
  }

  private spawnEntity(room: Room): void {
    try {
      if (!room.entityType) return
      
      // 根据难度调整生成概率
      let spawnChance = 1
      if (this.difficulty === 'easy') spawnChance = 0.5
      if (this.difficulty === 'hard') spawnChance = 1.5
      
      if (Math.random() > spawnChance) {
        logger.debug(`实体生成被跳过 (难度: ${this.difficulty})`)
        return
      }
      
      const worldX = room.position.gridX * GAME_CONFIG.ROOM_SIZE
      const worldZ = room.position.gridZ * GAME_CONFIG.ROOM_SIZE
      
      logger.event(EventType.ENTITY_SPAWN, `生成实体: ${room.entityType}`)
      
      const entity = createEntity(room.entityType, {
        x: worldX + (Math.random() - 0.5) * 4,
        z: worldZ + (Math.random() - 0.5) * 4
      })
      
      this.entities.push(entity)
      this.scene.add(entity.mesh)
      
      // 显示警告对话（不阻塞）
      try {
        const context = this.getDialogueContext()
        context.entityPresent = room.entityType
        const dialogue = aiService.getImmediateDialogue(context)
        if (dialogue) {
          this.ui.showDialogue(this.companion?.state.name.split('（')[0] || '队友', dialogue, 4000)
        }
      } catch (dialogueError) {
        console.error('对话错误:', dialogueError)
      }
    } catch (error) {
      console.error('实体生成错误:', error)
      logger.error(`实体生成错误: ${error}`)
    }
  }

  private updateEntities(delta: number): void {
    if (!this.player) return
    
    const playerPos = this.player.state.position
    const hasLight = this.player.state.lampLit
    const noiseLevel = this.player.state.noiseLevel
    
    // 使用filter代替forEach+splice，避免索引问题
    this.entities = this.entities.filter((entity) => {
      if (!entity.isActive()) {
        this.scene.remove(entity.mesh)
        return false // 移除此实体
      }
      
      try {
        entity.update(delta, playerPos, noiseLevel, hasLight)
        
        // 检测与玩家的碰撞
        const dist = entity.getDistanceToPlayer(playerPos)
        if (dist < 0.8 && entity.canDamagePlayer()) {
          const damage = entity.getDamage()
          this.player!.takeDamage(damage)
          
          // 也影响队友
          if (this.companion) {
            this.companion.scare(damage * 0.5)
          }
        }
        
        // 笑魇特殊处理：空间锁定（只显示一次警告）
        if (entity instanceof Smiler && (entity as Smiler).isPlayerLocked()) {
          if (!this.smilerWarningShown) {
            this.smilerWarningShown = true
            this.ui.showWarning('保持安静！你被笑魇锁定了！')
          }
        } else if (entity instanceof Smiler) {
          this.smilerWarningShown = false
        }
      } catch (error) {
        console.error('实体更新错误:', error)
      }
      
      return true // 保留此实体
    })
  }

  private checkCollisions(): void {
    if (!this.player || !this.currentRoom) return
    
    // ======= 墙壁碰撞检测 =======
    this.checkWallCollisions()
    
    // 检测与道具的碰撞
    const playerPos = this.player.state.position
    const roomWorldX = this.currentRoom.position.gridX * GAME_CONFIG.ROOM_SIZE
    const roomWorldZ = this.currentRoom.position.gridZ * GAME_CONFIG.ROOM_SIZE
    
    // 道具拾取半径
    const pickupRadius = 1.5
    
    this.currentRoom.items.forEach((item, index) => {
      const angle = (index / this.currentRoom!.items.length) * Math.PI * 2
      const radius = 2
      const itemX = roomWorldX + Math.cos(angle) * radius
      const itemZ = roomWorldZ + Math.sin(angle) * radius
      
      const dist = Math.sqrt(
        Math.pow(playerPos.x - itemX, 2) + 
        Math.pow(playerPos.z - itemZ, 2)
      )
      
      if (dist < pickupRadius) {
        // 显示拾取提示
        // 按空格拾取
      }
    })
  }

  // 检测墙壁碰撞，防止玩家穿墙
  private checkWallCollisions(): void {
    if (!this.player || !this.currentRoom) return
    
    const playerPos = this.player.state.position
    const roomSize = GAME_CONFIG.ROOM_SIZE
    const doorWidth = GAME_CONFIG.DOOR_WIDTH
    const playerRadius = 0.4 // 玩家碰撞半径
    
    // 当前房间的世界坐标
    const roomCenterX = this.currentRoom.position.gridX * roomSize
    const roomCenterZ = this.currentRoom.position.gridZ * roomSize
    
    // 玩家在房间内的相对坐标
    const localX = playerPos.x - roomCenterX
    const localZ = playerPos.z - roomCenterZ
    
    // 房间边界（从中心到边缘的距离）
    const halfSize = roomSize / 2 - playerRadius
    const doorHalfWidth = doorWidth / 2
    
    // 检查并修正X轴边界
    if (localX > halfSize) {
      // 东墙
      if (!this.currentRoom.doors.includes(Direction.EAST) || Math.abs(localZ) > doorHalfWidth) {
        playerPos.x = roomCenterX + halfSize
        this.player.mesh.position.x = playerPos.x
      }
    } else if (localX < -halfSize) {
      // 西墙
      if (!this.currentRoom.doors.includes(Direction.WEST) || Math.abs(localZ) > doorHalfWidth) {
        playerPos.x = roomCenterX - halfSize
        this.player.mesh.position.x = playerPos.x
      }
    }
    
    // 检查并修正Z轴边界
    if (localZ > halfSize) {
      // 南墙
      if (!this.currentRoom.doors.includes(Direction.SOUTH) || Math.abs(localX) > doorHalfWidth) {
        playerPos.z = roomCenterZ + halfSize
        this.player.mesh.position.z = playerPos.z
      }
    } else if (localZ < -halfSize) {
      // 北墙
      if (!this.currentRoom.doors.includes(Direction.NORTH) || Math.abs(localX) > doorHalfWidth) {
        playerPos.z = roomCenterZ - halfSize
        this.player.mesh.position.z = playerPos.z
      }
    }
  }

  private tryPickupItem(): void {
    if (!this.player || !this.currentRoom) return
    
    const playerPos = this.player.state.position
    const roomWorldX = this.currentRoom.position.gridX * GAME_CONFIG.ROOM_SIZE
    const roomWorldZ = this.currentRoom.position.gridZ * GAME_CONFIG.ROOM_SIZE
    
    const pickupRadius = 1.5
    
    for (let i = this.currentRoom.items.length - 1; i >= 0; i--) {
      const item = this.currentRoom.items[i]
      const angle = (i / this.currentRoom.items.length) * Math.PI * 2
      const radius = 2
      const itemX = roomWorldX + Math.cos(angle) * radius
      const itemZ = roomWorldZ + Math.sin(angle) * radius
      
      const dist = Math.sqrt(
        Math.pow(playerPos.x - itemX, 2) + 
        Math.pow(playerPos.z - itemZ, 2)
      )
      
      if (dist < pickupRadius) {
        if (this.player.pickupItem(item)) {
          logger.event(EventType.PLAYER_PICKUP, `拾取: ${item.name}`)
          this.currentRoom.items.splice(i, 1)
          this.ui.showPickupHint(item.name)
          
          // 从场景中移除道具mesh（安全检查）
          if (this.currentRoom.mesh && typeof this.currentRoom.mesh.traverse === 'function') {
            try {
              const toRemove: THREE.Object3D[] = []
              this.currentRoom.mesh.traverse((child) => {
                if (child.userData && child.userData.itemId === item.id) {
                  toRemove.push(child)
                }
              })
              toRemove.forEach(child => {
                if (child.parent) {
                  child.parent.remove(child)
                }
              })
            } catch (error) {
              console.error('移除道具mesh错误:', error)
            }
          }
          
          return
        } else {
          logger.warn('背包已满，无法拾取')
          this.ui.showCriticalWarning('⚠️ 背包已满！请先使用或丢弃物品')
        }
      }
    }
  }

  private useItem(itemId: string): void {
    if (!this.player) return
    
    const item = this.player.getInventory().find(i => i.id === itemId)
    if (!item) return
    
    switch (item.type) {
      case ItemType.ALMOND_WATER:
        this.player.useItem(itemId)
        this.ui.showPickupHint('恢复了30点精神值')
        break
        
      case ItemType.OIL_LAMP:
        this.player.toggleLamp()
        break
        
      case ItemType.KEY:
        // 检测附近是否有窃皮者
        this.entities.forEach(entity => {
          if (entity.type === EntityType.SKIN_STEALER) {
            const dist = entity.getDistanceToPlayer(this.player!.state.position)
            if (dist < 2) {
              entity.deactivate()
              this.ui.showPickupHint('击退了窃皮者！')
            }
          }
        })
        break
    }
    
    // 更新背包UI
    this.ui.updateInventory(
      this.player.getInventory(),
      (id) => this.useItem(id)
    )
  }

  private interactWithCompanion(): void {
    if (!this.companion || !this.player) return
    
    // 检测距离
    const playerPos = this.player.state.position
    const companionPos = this.companion.state.position
    const dist = Math.sqrt(
      Math.pow(playerPos.x - companionPos.x, 2) + 
      Math.pow(playerPos.z - companionPos.z, 2)
    )
    
    if (dist > 3) {
      this.ui.showWarning('队友太远了')
      return
    }
    
    // 如果队友需要帮助且玩家有杏仁水
    if (this.companion.needsHelp()) {
      const almondWater = this.player.getItem(ItemType.ALMOND_WATER)
      if (almondWater) {
        this.player.removeItem(almondWater.id)
        this.companion.receiveItem(almondWater)
        this.companion.increaseTrust(15)
        this.ui.showDialogue(
          this.companion.state.name.split('（')[0],
          '谢谢你...这真的很有帮助。我感觉好多了。',
          3000
        )
        return
      }
    }
    
    // 普通互动 - 获取线索
    if (this.companion.willShareClue() && this.currentRoom) {
      const hint = this.companion.getDialogueHint(this.currentRoom.type)
      if (hint) {
        this.ui.showDialogue(
          this.companion.state.name.split('（')[0],
          hint,
          4000
        )
        return
      }
    }
    
    // 躲藏状态
    if (this.companion.state.isHiding) {
      this.ui.showDialogue(
        this.companion.state.name.split('（')[0],
        '我...我现在不想动...',
        2000
      )
    }
  }

  // 对话显示（优先使用AI，不阻塞游戏）
  private showCompanionDialogueSync(): void {
    if (!this.companion || !this.currentRoom) {
      logger.debug('无法显示对话：队友或房间不存在')
      return
    }
    
    logger.event(EventType.COMPANION_DIALOGUE, '触发对话')
    
    const context = this.getDialogueContext()
    const companionName = this.companion.state.name.split('（')[0]
    
    // 如果有API key，直接使用异步AI对话（不先显示固定对话）
    if (aiService.isUsingAI()) {
      logger.info('使用AI生成对话...')
      
      // 直接异步获取AI对话
      aiService.getDialogue(context).then(aiDialogue => {
        if (aiDialogue && this.companion) {
          logger.info(`AI对话成功: ${aiDialogue.substring(0, 30)}...`)
          this.ui.showDialogue(companionName, aiDialogue, 6000)
        } else if (!aiDialogue) {
          logger.debug('AI对话为空（可能在冷却中）')
        }
      }).catch(error => {
        logger.error(`AI对话获取失败: ${error}`)
        // 失败时显示固定对话
        const fixedDialogue = aiService.getFixedDialoguePublic(context)
        if (fixedDialogue) {
          this.ui.showDialogue(companionName, fixedDialogue, 5000)
        }
      })
    } else {
      // 无API时使用固定对话
      const dialogue = aiService.getDialogueSync(context)
      if (dialogue) {
        this.ui.showDialogue(companionName, dialogue, 5000)
        logger.debug(`固定对话: ${dialogue.substring(0, 30)}...`)
      }
    }
  }

  private getDialogueContext(): AIDialogueContext {
    return {
      companionType: this.companion?.state.type || CompanionType.EXPLORER,
      roomType: this.currentRoom?.type || RoomType.BASIC,
      entityPresent: this.entities.length > 0 ? this.entities[0].type : null,
      playerSanity: this.player?.state.sanity || 100,
      companionSanity: this.companion?.state.sanity || 100,
      companionTrust: this.companion?.state.trust || 70,
      isLoopRoom: this.currentRoom?.isLoopRoom || false,
      hasItems: (this.currentRoom?.items.length || 0) > 0,
      roomsExplored: this.roomsExplored
    }
  }

  private checkGameState(): void {
    if (!this.player) return
    
    // 检测精神值归零
    if (this.player.state.sanity <= 0) {
      logger.event(EventType.GAME_OVER, '精神值归零')
      this.phase = GamePhase.GAME_OVER
      this.ui.showGameOver('你的精神崩溃了...被空间同化')
      return
    }
    
    // 检测队友状态
    if (this.companion && this.companion.state.sanity <= 0 && !this.companion.state.isHiding) {
      logger.event(EventType.COMPANION_HIDE, '队友精神值过低，开始躲藏')
      this.companion.startHiding()
      this.ui.showDialogue(
        this.companion.state.name.split('（')[0],
        '我...我不行了...',
        3000
      )
    }
  }

  private triggerExit(): void {
    logger.event(EventType.GAME_WIN, `探索房间数: ${this.roomsExplored}`)
    this.phase = GamePhase.WIN
    this.ui.showWin({
      roomsExplored: this.roomsExplored,
      timeElapsed: this.timeElapsed
    })
  }

  private updateCamera(): void {
    if (!this.player) return
    
    // 俯视角跟随玩家 - 从上方45度角观察
    const targetX = this.player.state.position.x
    const targetZ = this.player.state.position.z + 10
    const targetY = 15
    
    // 平滑跟随
    this.camera.position.x += (targetX - this.camera.position.x) * 0.08
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.08
    this.camera.position.y += (targetY - this.camera.position.y) * 0.08
    
    // 看向玩家
    this.camera.lookAt(
      this.player.state.position.x,
      1,
      this.player.state.position.z
    )
  }

  private updateUI(): void {
    if (!this.player || !this.companion) return
    
    this.ui.updateHUD(
      this.player.state,
      this.companion.state,
      this.roomsExplored
    )
  }
}
