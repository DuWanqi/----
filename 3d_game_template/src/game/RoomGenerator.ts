// 《逃离后室：山屋惊魂》- 房间生成系统

import * as THREE from 'three'
import {
  Room, RoomType, RoomPosition, Direction, Item, ItemType, EntityType,
  GAME_CONFIG, COLORS, ITEMS_DATA, getRoomKey, getDirectionOffset,
  getOppositeDirection, generateId
} from './types'

export class RoomGenerator {
  private scene: THREE.Scene
  private rooms: Map<string, Room> = new Map()
  private basicRoomsGenerated = 0
  private lastRoomType: RoomType = RoomType.BASIC
  private totalRoomsGenerated = 0  // 总共生成的房间数
  private exitGenerated = false     // 是否已生成出口
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  getRooms(): Map<string, Room> {
    return this.rooms
  }

  getRoom(pos: RoomPosition): Room | undefined {
    return this.rooms.get(getRoomKey(pos))
  }

  // 生成初始房间
  generateStartRoom(): Room {
    const startPos: RoomPosition = { gridX: 0, gridZ: 0 }
    const room = this.createRoom(startPos, RoomType.BASIC, [
      Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST
    ])
    room.visited = true
    
    // 初始房间给玩家一个煤油灯和杏仁水
    room.items = [
      { id: generateId(), ...ITEMS_DATA[ItemType.OIL_LAMP] },
      { id: generateId(), ...ITEMS_DATA[ItemType.ALMOND_WATER] }
    ]
    
    this.rooms.set(getRoomKey(startPos), room)
    this.buildRoomMesh(room)
    return room
  }

  // 穿过门后生成新房间
  generateRoom(fromPos: RoomPosition, direction: Direction): Room {
    const offset = getDirectionOffset(direction)
    const newPos: RoomPosition = {
      gridX: fromPos.gridX + offset.gridX,
      gridZ: fromPos.gridZ + offset.gridZ
    }
    
    // 检查是否已存在
    const existingRoom = this.rooms.get(getRoomKey(newPos))
    if (existingRoom) {
      return existingRoom
    }
    
    // 决定房间类型
    const roomType = this.decideRoomType()
    
    // 生成门的方向（至少要有回去的门）
    const doors = this.generateDoors(direction)
    
    // 创建房间
    const room = this.createRoom(newPos, roomType, doors)
    
    // 生成道具
    room.items = this.generateItems(roomType)
    
    // 生成实体
    this.generateEntity(room)
    
    // 决定是否是循环房间
    room.isLoopRoom = roomType === RoomType.BASIC && Math.random() < 0.15
    
    this.rooms.set(getRoomKey(newPos), room)
    this.buildRoomMesh(room)
    
    this.basicRoomsGenerated++
    this.totalRoomsGenerated++
    this.lastRoomType = roomType
    
    return room
  }

  private decideRoomType(): RoomType {
    // 探索10个房间后，有概率生成EXIT出口房间
    if (!this.exitGenerated && this.totalRoomsGenerated >= 10) {
      // 探索越多，出口概率越高
      const exitChance = Math.min(0.3, (this.totalRoomsGenerated - 10) * 0.05 + 0.1)
      if (Math.random() < exitChance) {
        this.exitGenerated = true
        return RoomType.EXIT
      }
    }
    
    // 避免连续生成相同类型
    if (this.lastRoomType === RoomType.BASIC && this.basicRoomsGenerated >= 2) {
      const roll = Math.random()
      if (roll < 0.6) return RoomType.DANGER
      if (roll < 0.9) return RoomType.HUB
      return RoomType.SECRET
    }
    
    // 危险格子需要探索一定基础格子后才出现
    if (this.basicRoomsGenerated < 3) {
      return RoomType.BASIC
    }
    
    const roll = Math.random()
    if (roll < GAME_CONFIG.ROOM_PROBS.basic) return RoomType.BASIC
    if (roll < GAME_CONFIG.ROOM_PROBS.basic + GAME_CONFIG.ROOM_PROBS.danger) return RoomType.DANGER
    if (roll < GAME_CONFIG.ROOM_PROBS.basic + GAME_CONFIG.ROOM_PROBS.danger + GAME_CONFIG.ROOM_PROBS.hub) return RoomType.HUB
    return RoomType.SECRET
  }

  private generateDoors(fromDirection: Direction): Direction[] {
    const oppositeDir = getOppositeDirection(fromDirection)
    const doors: Direction[] = [oppositeDir] // 至少有回去的门
    
    // 随机添加其他门
    const otherDirs = [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST]
      .filter(d => d !== oppositeDir)
    
    for (const dir of otherDirs) {
      if (Math.random() < 0.5) {
        doors.push(dir)
      }
    }
    
    // 确保至少有2扇门
    if (doors.length < 2 && otherDirs.length > 0) {
      const randomDir = otherDirs[Math.floor(Math.random() * otherDirs.length)]
      if (!doors.includes(randomDir)) {
        doors.push(randomDir)
      }
    }
    
    return doors
  }

  private generateItems(roomType: RoomType): Item[] {
    const items: Item[] = []
    
    // 根据房间类型决定道具
    switch (roomType) {
      case RoomType.BASIC:
        if (Math.random() < 0.3) {
          items.push({ id: generateId(), ...ITEMS_DATA[ItemType.ALMOND_WATER] })
        }
        if (Math.random() < 0.1) {
          items.push({ id: generateId(), ...ITEMS_DATA[ItemType.BATTERY] })
        }
        break
        
      case RoomType.DANGER:
        if (Math.random() < 0.4) {
          items.push({ id: generateId(), ...ITEMS_DATA[ItemType.KEY] })
        }
        break
        
      case RoomType.HUB:
        // 枢纽房间有更多资源
        items.push({ id: generateId(), ...ITEMS_DATA[ItemType.ALMOND_WATER] })
        if (Math.random() < 0.5) {
          items.push({ id: generateId(), ...ITEMS_DATA[ItemType.BATTERY] })
        }
        break
        
      case RoomType.SECRET:
        // 隐秘房间有稀有道具
        items.push({ id: generateId(), ...ITEMS_DATA[ItemType.LIGHTER] })
        items.push({ id: generateId(), ...ITEMS_DATA[ItemType.NEWSPAPER] })
        break
    }
    
    return items
  }

  private generateEntity(room: Room): void {
    room.hasEntity = false
    
    switch (room.type) {
      case RoomType.BASIC:
        if (Math.random() < 0.15) {
          room.hasEntity = true
          room.entityType = EntityType.SMILER
        }
        break
        
      case RoomType.DANGER:
        if (Math.random() < 0.4) {
          room.hasEntity = true
          room.entityType = Math.random() < 0.5 ? EntityType.SKIN_STEALER : EntityType.SHADOW
        }
        break
        
      case RoomType.SECRET:
        if (Math.random() < 0.3) {
          room.hasEntity = true
          room.entityType = EntityType.PARTYGOER
        }
        break
    }
  }

  private createRoom(pos: RoomPosition, type: RoomType, doors: Direction[]): Room {
    return {
      id: generateId(),
      type,
      position: pos,
      doors,
      items: [],
      hasEntity: false,
      visited: false,
      isLoopRoom: false
    }
  }

  // 构建房间3D网格
  buildRoomMesh(room: Room): void {
    const group = new THREE.Group()
    const size = GAME_CONFIG.ROOM_SIZE
    const wallHeight = GAME_CONFIG.WALL_HEIGHT
    const worldX = room.position.gridX * size
    const worldZ = room.position.gridZ * size
    
    // 获取房间颜色
    const colors = this.getRoomColors(room.type)
    
    // 创建地板
    const floorGeom = new THREE.PlaneGeometry(size, size)
    const floorMat = new THREE.MeshLambertMaterial({ 
      color: colors.floor,
      side: THREE.DoubleSide
    })
    const floor = new THREE.Mesh(floorGeom, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(worldX, 0, worldZ)
    floor.receiveShadow = true
    group.add(floor)
    
    // 俯视角游戏不需要天花板，这样可以看到房间内部
    
    // 创建墙壁（根据门的位置）
    this.createWalls(group, room, worldX, worldZ, size, wallHeight, colors)
    
    // 添加房间装饰
    this.addRoomDecorations(group, room, worldX, worldZ, colors)
    
    // 添加道具到场景
    this.addItemMeshes(group, room, worldX, worldZ)
    
    // 添加房间照明
    this.addRoomLighting(group, room, worldX, worldZ, wallHeight)
    
    room.mesh = group
    this.scene.add(group)
  }

  private getRoomColors(type: RoomType): { wall: number, floor: number, accent: number } {
    switch (type) {
      case RoomType.BASIC:
        return { wall: COLORS.wallpaperYellow, floor: COLORS.floorCarpet, accent: COLORS.wallpaperDark }
      case RoomType.DANGER:
        return { wall: COLORS.dangerWall, floor: COLORS.dangerFloor, accent: COLORS.dangerPipe }
      case RoomType.HUB:
        return { wall: COLORS.hubWall, floor: COLORS.hubFloor, accent: COLORS.hubGlow }
      case RoomType.SECRET:
        return { wall: COLORS.secretWall, floor: COLORS.secretFloor, accent: 0xffffff }
      case RoomType.EXIT:
        return { wall: 0x228b22, floor: 0x006400, accent: 0x00ff00 }
      default:
        return { wall: COLORS.wallpaperYellow, floor: COLORS.floorCarpet, accent: COLORS.wallpaperDark }
    }
  }

  private createWalls(
    group: THREE.Group, 
    room: Room, 
    worldX: number, 
    worldZ: number, 
    size: number, 
    wallHeight: number,
    colors: { wall: number, floor: number, accent: number }
  ): void {
    const wallMat = new THREE.MeshLambertMaterial({ color: colors.wall })
    const doorWidth = GAME_CONFIG.DOOR_WIDTH
    const doorHeight = GAME_CONFIG.DOOR_HEIGHT
    
    // 墙壁配置：方向 -> 位置和旋转
    const wallConfigs = [
      { dir: Direction.NORTH, pos: [worldX, wallHeight/2, worldZ - size/2], rot: 0 },
      { dir: Direction.SOUTH, pos: [worldX, wallHeight/2, worldZ + size/2], rot: 0 },
      { dir: Direction.EAST, pos: [worldX + size/2, wallHeight/2, worldZ], rot: Math.PI/2 },
      { dir: Direction.WEST, pos: [worldX - size/2, wallHeight/2, worldZ], rot: Math.PI/2 }
    ]
    
    for (const config of wallConfigs) {
      const hasDoor = room.doors.includes(config.dir)
      
      if (hasDoor) {
        // 有门的墙，分成两部分 + 门框
        const sideWidth = (size - doorWidth) / 2
        
        // 左边墙
        const leftGeom = new THREE.BoxGeometry(sideWidth, wallHeight, 0.2)
        const leftWall = new THREE.Mesh(leftGeom, wallMat)
        leftWall.position.set(
          config.pos[0] + (config.rot === 0 ? -size/4 - doorWidth/4 : 0),
          config.pos[1],
          config.pos[2] + (config.rot !== 0 ? -size/4 - doorWidth/4 : 0)
        )
        leftWall.rotation.y = config.rot
        leftWall.castShadow = true
        leftWall.receiveShadow = true
        group.add(leftWall)
        
        // 右边墙
        const rightGeom = new THREE.BoxGeometry(sideWidth, wallHeight, 0.2)
        const rightWall = new THREE.Mesh(rightGeom, wallMat)
        rightWall.position.set(
          config.pos[0] + (config.rot === 0 ? size/4 + doorWidth/4 : 0),
          config.pos[1],
          config.pos[2] + (config.rot !== 0 ? size/4 + doorWidth/4 : 0)
        )
        rightWall.rotation.y = config.rot
        rightWall.castShadow = true
        rightWall.receiveShadow = true
        group.add(rightWall)
        
        // 门上方墙
        const topHeight = wallHeight - doorHeight
        const topGeom = new THREE.BoxGeometry(doorWidth, topHeight, 0.2)
        const topWall = new THREE.Mesh(topGeom, wallMat)
        topWall.position.set(
          config.pos[0],
          doorHeight + topHeight/2,
          config.pos[2]
        )
        topWall.rotation.y = config.rot
        group.add(topWall)
        
        // 门框
        const frameMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 })
        const frameGeom = new THREE.BoxGeometry(doorWidth + 0.2, doorHeight, 0.3)
        const frame = new THREE.Mesh(frameGeom, frameMat)
        frame.position.set(config.pos[0], doorHeight/2, config.pos[2])
        frame.rotation.y = config.rot
        group.add(frame)
        
      } else {
        // 没有门的完整墙
        const wallGeom = new THREE.BoxGeometry(size, wallHeight, 0.2)
        const wall = new THREE.Mesh(wallGeom, wallMat)
        wall.position.set(config.pos[0], config.pos[1], config.pos[2])
        wall.rotation.y = config.rot
        wall.castShadow = true
        wall.receiveShadow = true
        group.add(wall)
      }
    }
  }

  private addRoomDecorations(
    group: THREE.Group, 
    room: Room, 
    worldX: number, 
    worldZ: number,
    colors: { wall: number, floor: number, accent: number }
  ): void {
    // 根据房间类型添加不同装饰
    switch (room.type) {
      case RoomType.BASIC:
        // 添加一些箱子
        if (Math.random() < 0.5) {
          const boxGeom = new THREE.BoxGeometry(0.8, 0.6, 0.8)
          const boxMat = new THREE.MeshLambertMaterial({ color: 0x5c4a32 })
          const box = new THREE.Mesh(boxGeom, boxMat)
          box.position.set(
            worldX + (Math.random() - 0.5) * 4,
            0.3,
            worldZ + (Math.random() - 0.5) * 4
          )
          box.castShadow = true
          group.add(box)
        }
        break
        
      case RoomType.DANGER:
        // 添加管道
        const pipeGeom = new THREE.CylinderGeometry(0.15, 0.15, GAME_CONFIG.WALL_HEIGHT)
        const pipeMat = new THREE.MeshLambertMaterial({ color: COLORS.dangerPipe })
        for (let i = 0; i < 2; i++) {
          const pipe = new THREE.Mesh(pipeGeom, pipeMat)
          pipe.position.set(
            worldX + (i === 0 ? -2 : 2),
            GAME_CONFIG.WALL_HEIGHT / 2,
            worldZ + (Math.random() - 0.5) * 4
          )
          group.add(pipe)
        }
        break
        
      case RoomType.HUB:
        // 添加发光指示牌
        const signGeom = new THREE.BoxGeometry(1.5, 0.8, 0.1)
        const signMat = new THREE.MeshLambertMaterial({ 
          color: COLORS.hubGlow,
          emissive: COLORS.hubGlow,
          emissiveIntensity: 0.5
        })
        const sign = new THREE.Mesh(signGeom, signMat)
        sign.position.set(worldX, 2.2, worldZ - 3.8)
        group.add(sign)
        break
        
      case RoomType.SECRET:
        // 添加气球装饰
        for (let i = 0; i < 3; i++) {
          const balloonGeom = new THREE.SphereGeometry(0.3, 16, 16)
          const balloonColors = [0xff69b4, 0x00ff00, 0xffff00]
          const balloonMat = new THREE.MeshLambertMaterial({ 
            color: balloonColors[i],
            emissive: balloonColors[i],
            emissiveIntensity: 0.2
          })
          const balloon = new THREE.Mesh(balloonGeom, balloonMat)
          balloon.position.set(
            worldX + (i - 1) * 1.5,
            2.5,
            worldZ + (Math.random() - 0.5) * 2
          )
          group.add(balloon)
        }
        break
        
      case RoomType.EXIT:
        // ====== EXIT出口房间特殊标志 ======
        
        // 1. 发光的"EXIT"标志牌
        const exitSignGeom = new THREE.BoxGeometry(2.5, 0.8, 0.1)
        const exitSignMat = new THREE.MeshLambertMaterial({ 
          color: 0x00ff00,
          emissive: 0x00ff00,
          emissiveIntensity: 1.0
        })
        const exitSign = new THREE.Mesh(exitSignGeom, exitSignMat)
        exitSign.position.set(worldX, 2.5, worldZ - 3.8)
        group.add(exitSign)
        
        // 2. 中央发光的传送门效果（环形）
        const portalGeom = new THREE.TorusGeometry(1.5, 0.2, 16, 32)
        const portalMat = new THREE.MeshBasicMaterial({ 
          color: 0x00ff88,
          transparent: true,
          opacity: 0.8
        })
        const portal = new THREE.Mesh(portalGeom, portalMat)
        portal.rotation.x = -Math.PI / 2
        portal.position.set(worldX, 0.1, worldZ)
        group.add(portal)
        
        // 3. 传送门内部发光圆
        const portalInnerGeom = new THREE.CircleGeometry(1.3, 32)
        const portalInnerMat = new THREE.MeshBasicMaterial({ 
          color: 0x88ffcc,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        })
        const portalInner = new THREE.Mesh(portalInnerGeom, portalInnerMat)
        portalInner.rotation.x = -Math.PI / 2
        portalInner.position.set(worldX, 0.15, worldZ)
        group.add(portalInner)
        
        // 4. 四个发光柱子标记出口区域
        for (let i = 0; i < 4; i++) {
          const pillarGeom = new THREE.CylinderGeometry(0.15, 0.15, 3, 8)
          const pillarMat = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
          })
          const pillar = new THREE.Mesh(pillarGeom, pillarMat)
          const angle = (i / 4) * Math.PI * 2
          pillar.position.set(
            worldX + Math.cos(angle) * 2.5,
            1.5,
            worldZ + Math.sin(angle) * 2.5
          )
          group.add(pillar)
          
          // 柱子顶部发光球
          const orbGeom = new THREE.SphereGeometry(0.25, 16, 16)
          const orbMat = new THREE.MeshBasicMaterial({ 
            color: 0xaaffaa,
            transparent: true,
            opacity: 0.9
          })
          const orb = new THREE.Mesh(orbGeom, orbMat)
          orb.position.set(
            worldX + Math.cos(angle) * 2.5,
            3.2,
            worldZ + Math.sin(angle) * 2.5
          )
          group.add(orb)
        }
        
        // 5. 强烈的点光源
        const exitLight = new THREE.PointLight(0x00ff88, 2, 15)
        exitLight.position.set(worldX, 2, worldZ)
        group.add(exitLight)
        break
    }
  }

  private addItemMeshes(
    group: THREE.Group, 
    room: Room, 
    worldX: number, 
    worldZ: number
  ): void {
    room.items.forEach((item, index) => {
      let mesh: THREE.Mesh
      
      switch (item.type) {
        case ItemType.ALMOND_WATER:
          const bottleGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8)
          const bottleMat = new THREE.MeshLambertMaterial({ 
            color: COLORS.almondWater,
            transparent: true,
            opacity: 0.8
          })
          mesh = new THREE.Mesh(bottleGeom, bottleMat)
          break
          
        case ItemType.OIL_LAMP:
          const lampGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.35, 8)
          const lampMat = new THREE.MeshLambertMaterial({ color: COLORS.lamp })
          mesh = new THREE.Mesh(lampGeom, lampMat)
          break
          
        case ItemType.BATTERY:
          const batteryGeom = new THREE.BoxGeometry(0.15, 0.3, 0.1)
          const batteryMat = new THREE.MeshLambertMaterial({ color: 0x333333 })
          mesh = new THREE.Mesh(batteryGeom, batteryMat)
          break
          
        case ItemType.KEY:
          const keyGeom = new THREE.BoxGeometry(0.3, 0.1, 0.05)
          const keyMat = new THREE.MeshLambertMaterial({ color: 0xffd700 })
          mesh = new THREE.Mesh(keyGeom, keyMat)
          break
          
        default:
          const defaultGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2)
          const defaultMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
          mesh = new THREE.Mesh(defaultGeom, defaultMat)
      }
      
      // 放置在房间内随机位置
      const angle = (index / room.items.length) * Math.PI * 2
      const radius = 2
      mesh.position.set(
        worldX + Math.cos(angle) * radius,
        0.3,
        worldZ + Math.sin(angle) * radius
      )
      mesh.userData = { itemId: item.id, itemType: item.type }
      mesh.castShadow = true
      group.add(mesh)
    })
  }

  private addRoomLighting(
    group: THREE.Group,
    room: Room,
    worldX: number,
    worldZ: number,
    wallHeight: number
  ): void {
    // 添加点光源
    let intensity = 0.5
    let color = 0xfff5e0
    
    switch (room.type) {
      case RoomType.BASIC:
        intensity = 0.4
        color = 0xfff0c0
        break
      case RoomType.DANGER:
        intensity = 0.2
        color = 0xff6666
        break
      case RoomType.HUB:
        intensity = 0.7
        color = COLORS.hubGlow
        break
      case RoomType.SECRET:
        intensity = 0.6
        color = 0xff69b4
        break
    }
    
    const light = new THREE.PointLight(color, intensity, 12)
    light.position.set(worldX, wallHeight - 0.5, worldZ)
    light.castShadow = true
    group.add(light)
  }

  // 清理房间
  removeRoom(pos: RoomPosition): void {
    const key = getRoomKey(pos)
    const room = this.rooms.get(key)
    if (room && room.mesh) {
      this.scene.remove(room.mesh)
      room.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
    this.rooms.delete(key)
  }

  // 清理所有房间
  clearAll(): void {
    this.rooms.forEach((room, key) => {
      if (room.mesh) {
        this.scene.remove(room.mesh)
      }
    })
    this.rooms.clear()
    this.basicRoomsGenerated = 0
    this.totalRoomsGenerated = 0
    this.exitGenerated = false
    this.lastRoomType = RoomType.BASIC
  }
}
