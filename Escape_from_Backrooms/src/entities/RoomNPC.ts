// 《逃离后室：山屋惊魂》- 房间NPC实体

import * as THREE from 'three'
import { 
  NPCState, NPCType, Position, Item, ItemType,
  GAME_CONFIG, COLORS, ITEMS_DATA, NPC_DATA, generateId
} from '../game/types'

export class RoomNPC {
  public mesh: THREE.Group
  public state: NPCState
  
  private bodyMesh: THREE.Mesh
  private headMesh: THREE.Mesh
  private floatOffset = 0
  private idleAnimation = 0
  
  constructor(type: NPCType, position: Position) {
    this.mesh = new THREE.Group()
    
    // 获取NPC信息
    const npcInfo = NPC_DATA[type]
    
    // 初始化状态
    this.state = {
      id: generateId(),
      type,
      name: this.generateNPCName(type),
      personality: npcInfo.personality,
      disposition: this.getInitialDisposition(type),
      inventory: this.generateInventory(type),
      dialogueHistory: [],
      canGiveItem: false,
      position: { ...position },
      hasGivenItem: false
    }
    
    // 创建NPC模型
    this.bodyMesh = this.createBody(type)
    this.headMesh = this.createHead()
    
    this.mesh.add(this.bodyMesh)
    this.mesh.add(this.headMesh)
    
    // 添加NPC名牌
    this.addNameTag()
    
    this.mesh.position.set(position.x, 0, position.z)
  }

  // 生成NPC名字
  private generateNPCName(type: NPCType): string {
    const names = {
      [NPCType.WANDERER]: ['小明', '阿杰', '老王', '小红', '阿强'],
      [NPCType.COLLECTOR]: ['收藏家张', '道具商人', '交易者李', '收集者陈'],
      [NPCType.SCHOLAR]: ['研究员王', '李博士', '档案员', '记录者刘']
    }
    const nameList = names[type]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  // 根据NPC类型获取初始好感度
  private getInitialDisposition(type: NPCType): number {
    switch (type) {
      case NPCType.WANDERER:
        return 50 + Math.floor(Math.random() * 20) // 50-70
      case NPCType.COLLECTOR:
        return 30 + Math.floor(Math.random() * 20) // 30-50 (更难说服)
      case NPCType.SCHOLAR:
        return 40 + Math.floor(Math.random() * 20) // 40-60
      default:
        return 50
    }
  }

  // 生成NPC携带的道具
  private generateInventory(type: NPCType): Item[] {
    const items: Item[] = []
    const npcInfo = NPC_DATA[type]
    
    // 从NPC类型对应的道具列表中随机选择1-2个
    const availableTypes = [...npcInfo.itemTypes]
    const numItems = 1 + Math.floor(Math.random() * 2)
    
    for (let i = 0; i < numItems && availableTypes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableTypes.length)
      const itemType = availableTypes.splice(randomIndex, 1)[0]
      items.push({
        id: generateId(),
        ...ITEMS_DATA[itemType]
      })
    }
    
    return items
  }

  private createBody(type: NPCType): THREE.Mesh {
    const geom = new THREE.BoxGeometry(0.5, 0.85, 0.3)
    
    // 根据NPC类型选择颜色
    let color: number
    switch (type) {
      case NPCType.WANDERER:
        color = COLORS.npcWanderer
        break
      case NPCType.COLLECTOR:
        color = COLORS.npcCollector
        break
      case NPCType.SCHOLAR:
        color = COLORS.npcScholar
        break
      default:
        color = 0x888888
    }
    
    const mat = new THREE.MeshLambertMaterial({ color })
    const body = new THREE.Mesh(geom, mat)
    body.position.y = 0.5
    body.castShadow = true
    return body
  }

  private createHead(): THREE.Mesh {
    const geom = new THREE.SphereGeometry(0.2, 16, 16)
    const mat = new THREE.MeshLambertMaterial({ color: 0xffe0bd })
    const head = new THREE.Mesh(geom, mat)
    head.position.y = 1.1
    head.castShadow = true
    return head
  }

  private addNameTag(): void {
    // 创建一个简单的名牌指示器（小方块）
    const tagGeom = new THREE.BoxGeometry(0.6, 0.15, 0.02)
    const tagMat = new THREE.MeshBasicMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    })
    const tag = new THREE.Mesh(tagGeom, tagMat)
    tag.position.y = 1.5
    this.mesh.add(tag)
    
    // 添加一个问号标记表示可以对话
    const markerGeom = new THREE.SphereGeometry(0.12, 8, 8)
    const markerMat = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.9
    })
    const marker = new THREE.Mesh(markerGeom, markerMat)
    marker.position.y = 1.7
    this.mesh.add(marker)
  }

  update(deltaTime: number, playerPos: Position): void {
    // 更新空闲动画
    this.idleAnimation += deltaTime * 2
    this.floatOffset = Math.sin(this.idleAnimation) * 0.03
    this.mesh.position.y = this.floatOffset
    
    // 面向玩家
    const dx = playerPos.x - this.state.position.x
    const dz = playerPos.z - this.state.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist < 6) {
      // 玩家靠近时面向玩家
      this.mesh.rotation.y = Math.atan2(dx, dz)
    }
    
    // 轻微的左右摇摆
    this.bodyMesh.rotation.z = Math.sin(this.idleAnimation * 0.5) * 0.05
  }

  // 获取与玩家的距离
  getDistanceToPlayer(playerPos: Position): number {
    const dx = playerPos.x - this.state.position.x
    const dz = playerPos.z - this.state.position.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  // 增加好感度
  increaseDisposition(amount: number): void {
    this.state.disposition = Math.min(100, this.state.disposition + amount)
    
    // 好感度达到70以上时愿意给道具
    if (this.state.disposition >= 70 && !this.state.hasGivenItem) {
      this.state.canGiveItem = true
    }
  }

  // 减少好感度
  decreaseDisposition(amount: number): void {
    this.state.disposition = Math.max(0, this.state.disposition - amount)
    this.state.canGiveItem = false
  }

  // 添加对话历史
  addDialogue(role: 'player' | 'npc', content: string): void {
    const prefix = role === 'player' ? '玩家: ' : `${this.state.name}: `
    this.state.dialogueHistory.push(prefix + content)
    
    // 保持历史长度合理
    if (this.state.dialogueHistory.length > 20) {
      this.state.dialogueHistory = this.state.dialogueHistory.slice(-20)
    }
  }

  // 获取NPC携带的道具列表（用于UI显示）
  getInventoryDisplay(): { name: string, description: string }[] {
    return this.state.inventory.map(item => ({
      name: item.name,
      description: item.description
    }))
  }

  // 检查是否可以给道具
  canGiveItemToPlayer(): boolean {
    return this.state.canGiveItem && 
           !this.state.hasGivenItem && 
           this.state.inventory.length > 0
  }

  // 赠送道具给玩家
  giveItemToPlayer(): Item | null {
    if (!this.canGiveItemToPlayer()) {
      return null
    }
    
    // 随机选择一个道具赠送
    const randomIndex = Math.floor(Math.random() * this.state.inventory.length)
    const item = this.state.inventory.splice(randomIndex, 1)[0]
    
    this.state.hasGivenItem = true
    this.state.canGiveItem = false
    
    return item
  }

  // 获取NPC的开场白
  getGreeting(): string {
    const greetings = {
      [NPCType.WANDERER]: [
        '你好...你也是困在这里的吗？',
        '终于见到活人了...这里太可怕了。',
        '嘿，小心点，这地方不安全。'
      ],
      [NPCType.COLLECTOR]: [
        '想要交易吗？我这里有些好东西。',
        '你有什么有价值的东西吗？',
        '每样东西都有它的价值...包括信息。'
      ],
      [NPCType.SCHOLAR]: [
        '你好，我正在研究这个空间的规律。',
        '有趣的...你是怎么进来的？',
        '我在这里记录了很多发现，有兴趣听听吗？'
      ]
    }
    
    const greetingList = greetings[this.state.type]
    return greetingList[Math.floor(Math.random() * greetingList.length)]
  }

  // 获取NPC的固定回复（无AI模式）
  getFixedResponse(playerMessage: string): { response: string, dispositionChange: number } {
    const lowerMessage = playerMessage.toLowerCase()
    
    // 关键词匹配
    const positiveKeywords = ['帮助', '朋友', '合作', '谢谢', '感谢', '请', '分享', '需要', '拜托']
    const negativeKeywords = ['滚', '笨', '蠢', '死', '讨厌', '闭嘴', '无聊']
    const askKeywords = ['道具', '东西', '给我', '送我', '能给', '有没有', '可以给']
    
    let dispositionChange = 0
    let response = ''
    
    // 检查负面关键词
    for (const keyword of negativeKeywords) {
      if (lowerMessage.includes(keyword)) {
        dispositionChange = -15
        response = this.getNegativeResponse()
        return { response, dispositionChange }
      }
    }
    
    // 检查请求道具的关键词
    for (const keyword of askKeywords) {
      if (lowerMessage.includes(keyword)) {
        if (this.state.disposition >= 70) {
          dispositionChange = 5
          response = this.getGiveItemResponse()
        } else if (this.state.disposition >= 50) {
          dispositionChange = 3
          response = '嗯...我考虑一下。再聊聊吧，让我更了解你。'
        } else {
          dispositionChange = -5
          response = '我们还不太熟，我不太放心把东西给陌生人。'
        }
        return { response, dispositionChange }
      }
    }
    
    // 检查正面关键词
    for (const keyword of positiveKeywords) {
      if (lowerMessage.includes(keyword)) {
        dispositionChange = 8
        response = this.getPositiveResponse()
        return { response, dispositionChange }
      }
    }
    
    // 默认中性回复
    dispositionChange = 2
    response = this.getNeutralResponse()
    return { response, dispositionChange }
  }

  private getPositiveResponse(): string {
    const responses = {
      [NPCType.WANDERER]: [
        '谢谢你的好意...在这个地方遇到友善的人真不容易。',
        '你是个好人。我会记住你的。',
        '说实话，有个伴让我安心多了。'
      ],
      [NPCType.COLLECTOR]: [
        '嗯，你看起来是个可靠的人。',
        '好吧，我开始喜欢你了。',
        '合作愉快，希望我们都能活着出去。'
      ],
      [NPCType.SCHOLAR]: [
        '你的态度让我想起了外面世界的人们。',
        '很高兴遇到你这样有礼貌的人。',
        '谢谢，你的善意在这里很珍贵。'
      ]
    }
    
    const responseList = responses[this.state.type]
    return responseList[Math.floor(Math.random() * responseList.length)]
  }

  private getNegativeResponse(): string {
    const responses = [
      '...我不想跟你说话了。',
      '你这样说话很不礼貌。',
      '算了，我还是一个人待着吧。'
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  private getNeutralResponse(): string {
    const responses = {
      [NPCType.WANDERER]: [
        '是啊...这里真的很诡异。',
        '我也不知道怎么出去...',
        '你有什么计划吗？'
      ],
      [NPCType.COLLECTOR]: [
        '嗯哼，继续说。',
        '有意思...',
        '我在听。'
      ],
      [NPCType.SCHOLAR]: [
        '这是个有趣的观点。',
        '我会把这个记录下来。',
        '让我想想...'
      ]
    }
    
    const responseList = responses[this.state.type]
    return responseList[Math.floor(Math.random() * responseList.length)]
  }

  private getGiveItemResponse(): string {
    if (this.state.inventory.length === 0) {
      return '抱歉，我已经没有什么可以给你的了。'
    }
    
    const responses = {
      [NPCType.WANDERER]: [
        '好吧，既然你这么需要...拿去吧，希望对你有帮助。',
        '我觉得你是个好人。这个给你。'
      ],
      [NPCType.COLLECTOR]: [
        '看在我们聊得还不错的份上，这个送你。',
        '难得遇到能说话的人，这个归你了。'
      ],
      [NPCType.SCHOLAR]: [
        '为了科学研究的进展，我愿意分享这个。',
        '你似乎比我更需要这个，拿去吧。'
      ]
    }
    
    const responseList = responses[this.state.type]
    return responseList[Math.floor(Math.random() * responseList.length)]
  }

  // 获取NPC类型的描述
  getTypeDescription(): string {
    switch (this.state.type) {
      case NPCType.WANDERER:
        return '流浪者'
      case NPCType.COLLECTOR:
        return '收集者'
      case NPCType.SCHOLAR:
        return '学者'
      default:
        return '陌生人'
    }
  }
}
