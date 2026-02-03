// 《逃离后室：山屋惊魂》- AI队友实体

import * as THREE from 'three'
import { CompanionState, CompanionType, Position, Item, GAME_CONFIG, COLORS } from '../game/types'

export class Companion {
  public mesh: THREE.Group
  public state: CompanionState
  
  private bodyMesh: THREE.Mesh
  private headMesh: THREE.Mesh
  private targetPosition: Position
  private floatOffset = 0
  
  constructor(type: CompanionType, startPos: Position) {
    this.mesh = new THREE.Group()
    
    // 获取队友信息
    const companionInfo = this.getCompanionInfo(type)
    
    // 初始化状态
    this.state = {
      type,
      name: companionInfo.name,
      sanity: 100,
      trust: 70, // 初始信任度
      position: { x: startPos.x + 1.5, z: startPos.z + 1.5 },
      isHiding: false,
      dialogue: ''
    }
    
    this.targetPosition = { ...this.state.position }
    
    // 创建队友模型
    this.bodyMesh = this.createBody(companionInfo.color)
    this.headMesh = this.createHead()
    
    this.mesh.add(this.bodyMesh)
    this.mesh.add(this.headMesh)
    
    this.mesh.position.set(this.state.position.x, 0, this.state.position.z)
  }

  private getCompanionInfo(type: CompanionType): { name: string, color: number } {
    switch (type) {
      case CompanionType.PSYCHIC:
        return { name: '艾琳（通灵者）', color: 0x9932cc }
      case CompanionType.EXPLORER:
        return { name: '马克（探险家）', color: 0x228b22 }
      case CompanionType.HISTORIAN:
        return { name: '李博士（历史学家）', color: 0x8b4513 }
      default:
        return { name: '队友', color: 0x666666 }
    }
  }

  private createBody(color: number): THREE.Mesh {
    const geom = new THREE.BoxGeometry(0.45, 0.75, 0.28)
    const mat = new THREE.MeshLambertMaterial({ color })
    const body = new THREE.Mesh(geom, mat)
    body.position.y = 0.45
    body.castShadow = true
    return body
  }

  private createHead(): THREE.Mesh {
    const geom = new THREE.SphereGeometry(0.18, 16, 16)
    const mat = new THREE.MeshLambertMaterial({ color: 0xffcc99 })
    const head = new THREE.Mesh(geom, mat)
    head.position.y = 1.0
    head.castShadow = true
    return head
  }

  update(deltaTime: number, playerPos: Position): void {
    if (this.state.isHiding) {
      // 躲藏状态：不移动
      this.updateHidingAnimation(deltaTime)
      return
    }
    
    // 跟随玩家
    this.followPlayer(deltaTime, playerPos)
    
    // 精神值随时间缓慢下降
    this.state.sanity = Math.max(0, this.state.sanity - deltaTime * 0.05)
    
    // 更新浮动动画
    this.floatOffset += deltaTime * 2
    this.mesh.position.y = Math.sin(this.floatOffset) * 0.02
  }

  private followPlayer(deltaTime: number, playerPos: Position): void {
    // 计算目标位置（玩家后方一定距离）
    const followDist = GAME_CONFIG.COMPANION_FOLLOW_DIST
    
    const dx = playerPos.x - this.state.position.x
    const dz = playerPos.z - this.state.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    // 只有距离超过跟随距离时才移动
    if (dist > followDist) {
      const speed = GAME_CONFIG.PLAYER_SPEED * 0.9 // 稍慢于玩家
      const moveSpeed = speed * deltaTime
      
      // 向玩家方向移动
      const dirX = dx / dist
      const dirZ = dz / dist
      
      this.state.position.x += dirX * moveSpeed
      this.state.position.z += dirZ * moveSpeed
      
      this.mesh.position.x = this.state.position.x
      this.mesh.position.z = this.state.position.z
      
      // 面向玩家
      this.mesh.rotation.y = Math.atan2(dirX, dirZ)
    }
  }

  private updateHidingAnimation(deltaTime: number): void {
    // 躲藏时蹲下动画
    this.bodyMesh.scale.y = 0.5
    this.bodyMesh.position.y = 0.2
    this.headMesh.position.y = 0.5
  }

  // 接收玩家给的道具
  receiveItem(item: Item): void {
    // 根据道具类型增加信任度或恢复精神值
    switch (item.type) {
      case 'almond_water':
        this.state.sanity = Math.min(100, this.state.sanity + 25)
        this.state.trust = Math.min(100, this.state.trust + 10)
        this.state.dialogue = '谢谢你...这真的很有帮助。'
        break
      default:
        this.state.trust = Math.min(100, this.state.trust + 5)
        this.state.dialogue = '这个...或许会派上用场。'
    }
  }

  // 降低信任度
  decreaseTrust(amount: number): void {
    this.state.trust = Math.max(0, this.state.trust - amount)
    
    if (this.state.trust <= 0 && !this.state.isHiding) {
      this.startHiding()
    }
  }

  // 增加信任度
  increaseTrust(amount: number): void {
    this.state.trust = Math.min(100, this.state.trust + amount)
    
    if (this.state.trust > 20 && this.state.isHiding) {
      this.stopHiding()
    }
  }

  // 开始躲藏
  startHiding(): void {
    this.state.isHiding = true
    this.state.dialogue = '我不敢动了...你自己小心...'
  }

  // 停止躲藏
  stopHiding(): void {
    this.state.isHiding = false
    this.bodyMesh.scale.y = 1
    this.bodyMesh.position.y = 0.45
    this.headMesh.position.y = 1.0
    this.state.dialogue = '我...我好一些了。继续走吧。'
  }

  // 受到惊吓
  scare(amount: number): void {
    this.state.sanity = Math.max(0, this.state.sanity - amount)
    
    if (this.state.sanity < 30) {
      this.state.dialogue = '我...我看到了不存在的影子...'
    }
  }

  // 获取当前对话提示
  getDialogueHint(roomType: string): string {
    if (this.state.trust < 20) {
      return ''
    }
    
    // 根据队友类型和房间类型给出提示
    switch (this.state.type) {
      case CompanionType.PSYCHIC:
        if (roomType === 'danger') {
          return '我感觉到...这里有不好的东西。小心点。'
        }
        if (roomType === 'secret') {
          return '等等...这个空间有些不对劲。可能有隐藏的东西。'
        }
        break
        
      case CompanionType.EXPLORER:
        if (roomType === 'hub') {
          return '这是个枢纽区域！这些门可能通向不同的层级。'
        }
        return '我们要注意资源消耗，别走太快。'
        
      case CompanionType.HISTORIAN:
        if (roomType === 'basic') {
          return '这些黄色墙纸...这是Level 5的特征。我们在废弃酒店层级。'
        }
        if (roomType === 'danger') {
          return '根据记录，这种管道区域经常有猎犬出没...'
        }
        break
    }
    
    return ''
  }

  // 是否愿意分享线索
  willShareClue(): boolean {
    return this.state.trust >= 60 && !this.state.isHiding
  }

  // 需要帮助
  needsHelp(): boolean {
    return this.state.sanity <= 30 && !this.state.isHiding
  }

  // 获取求助对话
  getHelpDialogue(): string {
    if (this.state.sanity <= 20) {
      return `${this.state.name.split('（')[0]}：我精神值太低了...能给我一瓶杏仁水吗？`
    }
    if (this.state.sanity <= 30) {
      return `${this.state.name.split('（')[0]}：我感觉不太好...`
    }
    return ''
  }

  // 重置队友
  reset(startPos: Position): void {
    this.state.sanity = 100
    this.state.trust = 70
    this.state.position = { x: startPos.x + 1.5, z: startPos.z + 1.5 }
    this.state.isHiding = false
    this.state.dialogue = ''
    
    this.mesh.position.set(this.state.position.x, 0, this.state.position.z)
    this.bodyMesh.scale.y = 1
    this.bodyMesh.position.y = 0.45
    this.headMesh.position.y = 1.0
  }
}
