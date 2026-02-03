// 《逃离后室：山屋惊魂》- AI对话服务
// 支持Google Gemini API，无API时使用固定对话模式

import { CompanionType, RoomType, EntityType } from '../game/types'
import { logger, EventType } from './Logger'

// 固定对话库（无AI时使用）
const FIXED_DIALOGUES = {
  // 开场对话
  intro: [
    '这里的空间不对劲，我们得找到离开的方法。',
    '小心点...我感觉到有什么东西在看着我们。',
    '这是...后室？我听说过这个地方的传说。'
  ],
  
  // 探索提示
  explore: {
    [RoomType.BASIC]: [
      '这些黄色墙纸...典型的后室特征。',
      '保持警惕，这种地方经常有实体出没。',
      '我们需要找到杏仁水，它能帮我们保持清醒。'
    ],
    [RoomType.DANGER]: [
      '这里很危险...我们快速通过吧。',
      '那些管道里可能藏着东西，别靠太近。',
      '我听到了奇怪的声音...'
    ],
    [RoomType.HUB]: [
      '这是枢纽区域！这些门可能通向不同的层级。',
      '在这里休息一下吧，相对安全些。',
      '仔细看看这些门，也许有出口的线索。'
    ],
    [RoomType.SECRET]: [
      '等等...这个空间有些不对劲。',
      '这些颜色...这不像是正常的后室层级。',
      '小心那些看起来友好的东西，可能是陷阱。'
    ],
    [RoomType.EXIT]: [
      '这可能是出口！快走！',
      '我感觉到了...外面的世界就在那扇门后面！'
    ]
  },
  
  // 遭遇实体
  entity: {
    [EntityType.SMILER]: [
      '别出声！那是笑魇！',
      '保持安静...它只在你发出声音时才会攻击。',
      '不要看它的眼睛...'
    ],
    [EntityType.SKIN_STEALER]: [
      '那个人影...不对劲！',
      '快跑！是窃皮者！',
      '用硬物攻击它的头部！'
    ],
    [EntityType.SHADOW]: [
      '点亮灯！影怪害怕光！',
      '快...光源...它在靠近！',
      '在黑暗中不要停留！'
    ],
    [EntityType.PARTYGOER]: [
      '不要相信它！那是派对客！',
      '别碰那些糖果！',
      '它在假装友好...快离开这里！'
    ]
  },
  
  // 精神值低
  lowSanity: [
    '我...我看到了不存在的影子...',
    '这里的墙壁在动吗...？',
    '我需要休息...精神快崩溃了...'
  ],
  
  // 求助
  needHelp: [
    '我精神值太低了，能给我一瓶杏仁水吗？',
    '帮帮我...我快坚持不住了...',
    '有没有什么能让我冷静下来的东西？'
  ],
  
  // 道具提示
  itemHint: [
    '那里好像有东西，去看看？',
    '我看到了闪光，可能是资源。',
    '检查一下那个箱子。'
  ],
  
  // 信任度相关
  trust: {
    high: [
      '谢谢你一直照顾我，我们一定能逃出去的。',
      '有你在我感觉安心多了。',
      '我会尽我所能帮助你的。'
    ],
    low: [
      '你...你能信任吗？',
      '我需要独处一下...',
      '别靠近我...'
    ]
  },
  
  // 循环房间
  loop: [
    '等等...我们好像走回来了？',
    '这个房间...我见过！',
    '空间在循环...找找有没有不对劲的地方。'
  ],
  
  // 发现出口线索
  exitHint: [
    '传说13号房间是通往外界的出口...',
    '我听说过一个封印仪式可以关闭这里的通道。',
    '寻找蓝色的光，那可能是离开的关键。'
  ]
}

// 根据队友类型调整对话风格
const COMPANION_STYLE = {
  [CompanionType.PSYCHIC]: {
    prefix: ['我感应到...', '有一种预感...', '灵视告诉我...'],
    suffix: ['命运指引着我们。', '跟随直觉。', '']
  },
  [CompanionType.EXPLORER]: {
    prefix: ['根据我的经验...', '作为探险家...', '我之前探索过...'],
    suffix: ['保持冷静，我们能做到。', '继续前进。', '']
  },
  [CompanionType.HISTORIAN]: {
    prefix: ['根据历史记载...', '文献中提到...', '研究表明...'],
    suffix: ['知识就是力量。', '历史会指引我们。', '']
  }
}

export interface AIDialogueContext {
  companionType: CompanionType
  roomType: RoomType
  entityPresent: EntityType | null
  playerSanity: number
  companionSanity: number
  companionTrust: number
  isLoopRoom: boolean
  hasItems: boolean
  roomsExplored: number
}

export class AIService {
  private apiKey: string | null = null
  private useAI = false
  private lastDialogue = ''
  private dialogueCooldown = 0
  private conversationHistory: { role: string, content: string }[] = []
  private isRequesting = false // 防止重复请求
  
  constructor() {
    // 尝试从localStorage获取API Key
    this.apiKey = localStorage.getItem('gemini_api_key')
    this.useAI = !!this.apiKey
    logger.info(`AI服务初始化 - 使用AI: ${this.useAI}`)
  }

  // 设置API Key
  setApiKey(key: string): void {
    this.apiKey = key
    this.useAI = !!key
    localStorage.setItem('gemini_api_key', key)
    logger.info(`API Key已设置 - 使用AI: ${this.useAI}`)
  }

  // 获取API Key
  getApiKey(): string | null {
    return this.apiKey
  }

  // 检查是否使用AI
  isUsingAI(): boolean {
    return this.useAI
  }

  // 更新冷却时间
  update(deltaTime: number): void {
    if (this.dialogueCooldown > 0) {
      this.dialogueCooldown -= deltaTime
    }
  }

  // 获取对话（同步版本，不会阻塞游戏）
  getDialogueSync(context: AIDialogueContext): string {
    // 冷却期间不生成新对话
    if (this.dialogueCooldown > 0) {
      return ''
    }
    
    // 设置冷却时间（增加到15秒减少刷屏）
    this.dialogueCooldown = 15
    
    logger.event(EventType.AI_FALLBACK, '使用固定对话模式')
    return this.getFixedDialogue(context)
  }

  // 获取对话（异步版本，带超时保护）
  async getDialogue(context: AIDialogueContext): Promise<string> {
    // 冷却期间不生成新对话（使用更长的冷却时间）
    if (this.dialogueCooldown > 0) {
      logger.debug(`对话冷却中，剩余 ${this.dialogueCooldown.toFixed(1)}秒`)
      return ''
    }
    
    // 防止重复请求
    if (this.isRequesting) {
      logger.warn('已有进行中的AI请求，跳过')
      return ''
    }
    
    // 设置冷却时间（增加到20秒减少API调用频率）
    this.dialogueCooldown = 20
    
    if (this.useAI && this.apiKey) {
      this.isRequesting = true
      logger.event(EventType.AI_REQUEST, '开始AI对话请求')
      
      try {
        // 添加超时保护（3秒）
        const dialogue = await this.getAIDialogueWithTimeout(context, 3000)
        this.lastDialogue = dialogue
        logger.event(EventType.AI_RESPONSE, dialogue.substring(0, 50) + '...')
        return dialogue
      } catch (error) {
        logger.event(EventType.AI_ERROR, `${error}`)
        logger.event(EventType.AI_FALLBACK, '切换到固定对话')
        return this.getFixedDialogue(context)
      } finally {
        this.isRequesting = false
      }
    } else {
      logger.event(EventType.AI_FALLBACK, '使用固定对话模式')
      return this.getFixedDialogue(context)
    }
  }

  // 带超时的AI对话请求
  private async getAIDialogueWithTimeout(context: AIDialogueContext, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`AI请求超时 (${timeoutMs}ms)`))
      }, timeoutMs)
      
      this.getAIDialogue(context)
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  // 使用Google Gemini API获取对话
  private async getAIDialogue(context: AIDialogueContext): Promise<string> {
    const prompt = this.buildPrompt(context)
    
    // 添加到对话历史
    this.conversationHistory.push({ role: 'user', content: prompt })
    
    // 保持历史长度合理
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10)
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 100,
              topP: 0.9
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ]
          }),
          signal: controller.signal
        }
      )
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }
      
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      // 添加到对话历史
      this.conversationHistory.push({ role: 'assistant', content: text })
      
      return text.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  // 构建AI提示词
  private buildPrompt(context: AIDialogueContext): string {
    const companionInfo = this.getCompanionDescription(context.companionType)
    
    let situationDesc = ''
    
    // 描述当前情况
    if (context.entityPresent) {
      situationDesc = `警告！遭遇了${this.getEntityName(context.entityPresent)}！`
    } else if (context.isLoopRoom) {
      situationDesc = '这个房间看起来很熟悉，可能是空间循环。'
    } else if (context.companionSanity < 30) {
      situationDesc = '你的精神状态很差，急需帮助。'
    } else {
      situationDesc = `正在探索${this.getRoomTypeName(context.roomType)}。`
    }
    
    return `你是《逃离后室》游戏中的AI队友，${companionInfo.name}。
性格特点：${companionInfo.personality}
当前情况：${situationDesc}
玩家精神值：${context.playerSanity}%
你的精神值：${context.companionSanity}%
对玩家的信任度：${context.companionTrust}%
已探索房间数：${context.roomsExplored}

请用1-2句话做出符合角色性格的反应。要求：
- 保持角色一致性
- 反映当前情绪状态
- 如果信任度低，表现出疏离
- 如果精神值低，表现出恐惧或幻觉
- 简短自然，像真人对话`
  }

  // 获取固定模式对话
  private getFixedDialogue(context: AIDialogueContext): string {
    const style = COMPANION_STYLE[context.companionType]
    let dialogue = ''
    
    // 优先级判断
    if (context.entityPresent) {
      // 遭遇实体
      const entityDialogues = FIXED_DIALOGUES.entity[context.entityPresent]
      dialogue = this.randomPick(entityDialogues)
    } else if (context.companionSanity < 30) {
      // 队友精神值低
      dialogue = this.randomPick(FIXED_DIALOGUES.lowSanity)
    } else if (context.companionTrust < 20) {
      // 信任度低
      dialogue = this.randomPick(FIXED_DIALOGUES.trust.low)
    } else if (context.isLoopRoom) {
      // 循环房间
      dialogue = this.randomPick(FIXED_DIALOGUES.loop)
    } else if (context.roomsExplored === 0) {
      // 开场
      dialogue = this.randomPick(FIXED_DIALOGUES.intro)
    } else if (context.hasItems && Math.random() < 0.3) {
      // 道具提示
      dialogue = this.randomPick(FIXED_DIALOGUES.itemHint)
    } else if (context.roomsExplored > 10 && Math.random() < 0.2) {
      // 出口线索
      dialogue = this.randomPick(FIXED_DIALOGUES.exitHint)
    } else {
      // 普通探索对话
      const roomDialogues = FIXED_DIALOGUES.explore[context.roomType] || FIXED_DIALOGUES.explore[RoomType.BASIC]
      dialogue = this.randomPick(roomDialogues)
    }
    
    // 添加角色风格前缀（30%概率）
    if (Math.random() < 0.3 && style.prefix.length > 0) {
      dialogue = this.randomPick(style.prefix) + dialogue
    }
    
    this.lastDialogue = dialogue
    return dialogue
  }

  // 辅助函数
  private randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  private getCompanionDescription(type: CompanionType): { name: string, personality: string } {
    switch (type) {
      case CompanionType.PSYCHIC:
        return { name: '艾琳（通灵者）', personality: '神秘、直觉敏锐、说话时常带有预言性质' }
      case CompanionType.EXPLORER:
        return { name: '马克（探险家）', personality: '勇敢、务实、冷静分析局势' }
      case CompanionType.HISTORIAN:
        return { name: '李博士（历史学家）', personality: '学识渊博、谨慎、喜欢引用历史记录' }
      default:
        return { name: '队友', personality: '普通' }
    }
  }

  private getEntityName(type: EntityType): string {
    switch (type) {
      case EntityType.SMILER: return '笑魇'
      case EntityType.SKIN_STEALER: return '窃皮者'
      case EntityType.SHADOW: return '影怪'
      case EntityType.PARTYGOER: return '派对客'
      default: return '未知实体'
    }
  }

  private getRoomTypeName(type: RoomType): string {
    switch (type) {
      case RoomType.BASIC: return '基础走廊（Level 5 废弃客房）'
      case RoomType.DANGER: return '危险区域（管道间）'
      case RoomType.HUB: return '枢纽区域（The Hub）'
      case RoomType.SECRET: return '隐秘空间（Level Fun？）'
      case RoomType.EXIT: return '出口区域'
      default: return '未知区域'
    }
  }

  // 获取立即对话（不等待冷却，用于重要事件如遭遇实体）
  getImmediateDialogue(context: AIDialogueContext): string {
    this.dialogueCooldown = 10 // 重要事件后设置10秒冷却
    logger.event(EventType.COMPANION_DIALOGUE, '触发立即对话（重要事件）')
    return this.getFixedDialogue(context)
  }

  // 公开的固定对话获取（用于AI失败时的回退）
  getFixedDialoguePublic(context: AIDialogueContext): string {
    return this.getFixedDialogue(context)
  }

  // 清除对话历史
  clearHistory(): void {
    this.conversationHistory = []
  }
}

// 单例
export const aiService = new AIService()
