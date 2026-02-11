# AI导演系统（AI Director System）设计文档

## 项目：《逃离后室：山屋惊魂》

---

## 1. 系统概述

### 1.1 设计目标

AI导演系统是一个智能化的游戏叙事控制器，负责：
- **动态调节恐怖氛围** - 根据玩家状态实时调整游戏恐怖强度
- **管理剧本流程** - 控制短篇剧本的触发、推进和结束
- **生成恐怖效果** - 调用视觉/听觉效果增强沉浸感
- **AI与降级模式** - 有API时使用AI，无API时使用预设剧本

### 1.2 核心设计理念

```
┌─────────────────────────────────────────────────────────────┐
│                     AI导演系统架构                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │  剧本管理器  │◄──►│  氛围调节器  │◄──►│   恐怖效果生成器 │ │
│  └──────┬──────┘    └──────┬──────┘    └────────┬────────┘ │
│         │                  │                    │          │
│         ▼                  ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  AI服务层 (可选)                      │   │
│  │  ┌─────────────┐    ┌─────────────────────────────┐ │   │
│  │  │ Gemini API  │    │      固定剧本库 (降级)        │ │   │
│  │  │  动态生成    │    │   预设恐怖效果+剧情节点       │ │   │
│  │  └─────────────┘    └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 剧本系统设计

### 2.1 剧本结构

```typescript
// 剧本模板
interface StoryTemplate {
  id: string                    // 唯一标识
  name: string                  // 剧本名称
  description: string           // 剧本简介
  
  // 触发配置
  trigger: {
    type: 'random' | 'condition' | 'event'  // 触发类型
    probability: number                     // 基础概率 (0-1)
    conditions: TriggerCondition[]          // 触发条件
    cooldown: number                        // 冷却时间(秒)
  }
  
  // 剧本参数
  duration: {                    // 剧本时长
    min: number                 // 最短时长(秒)
    max: number                 // 最长时长(秒)
  }
  
  // 恐怖强度曲线
  intensityCurve: {
    start: number               // 起始强度 (0-100)
    peak: number                // 峰值强度 (0-100)
    progression: 'linear' | 'exponential' | 'wave'  // 递进方式
  }
  
  // 剧情节点
  nodes: StoryNode[]
  
  // AI提示词 (AI模式使用)
  aiContext: string
  
  // 降级模式数据 (无API时使用)
  fallbackData: FallbackStoryData
}

// 剧情节点
interface StoryNode {
  id: string
  type: 'dialogue' | 'event' | 'choice' | 'ending'
  
  // 触发条件
  trigger: {
    type: 'time' | 'action' | 'condition' | 'random'
    value: number | string
  }
  
  // 节点内容
  content: {
    dialogue?: string           // 对话文本
    speaker?: 'companion' | 'narrator' | 'entity' | 'system'
    choices?: Choice[]          // 玩家选项
  }
  
  // 恐怖效果
  horrorEffects: HorrorEffect[]
  
  // 分支
  nextNodes: string[]           // 可能的下一个节点
  weights?: number[]            // 分支权重
}

// 玩家选择
interface Choice {
  id: string
  text: string
  consequence: Consequence
  required?: {
    item?: ItemType
    sanity?: number
    trust?: number
  }
}
```

### 2.2 剧本触发机制（突发事件机制）

参考《山屋惊魂》的预兆机制，采用**"探索-触发-爆发"**三段式：

```typescript
// 剧本触发管理器
class StoryTriggerManager {
  private explorationMeter: number = 0    // 探索计量表 (0-100)
  private anomalyTokens: number = 0       // 异常标记数
  private lastTriggerTime: number = 0
  
  // 探索计量表增长因素
  private readonly EXPLORATION_FACTORS = {
    roomEntered: 10,           // 进入新房间
    itemFound: 5,              // 发现道具
    entityEncountered: 20,     // 遭遇实体
    npcMet: 8,                 // 遇到NPC
    timeElapsed: 2,            // 每过10秒
    sanityDrop: 15             // 精神值骤降(一次降>20)
  }
  
  // 触发检查
  checkTrigger(gameState: GameState): StoryTemplate | null {
    // 1. 更新探索计量表
    this.updateExplorationMeter(gameState)
    
    // 2. 检查冷却时间
    if (Date.now() - this.lastTriggerTime < 60000) return null  // 1分钟冷却
    
    // 3. 计算触发概率
    const triggerChance = this.calculateTriggerChance()
    
    // 4. 随机触发
    if (Math.random() < triggerChance) {
      return this.selectStory(gameState)
    }
    
    return null
  }
  
  private calculateTriggerChance(): number {
    // 基础概率 5%
    let chance = 0.05
    
    // 探索计量表增加概率 (最高+25%)
    chance += Math.min(0.25, this.explorationMeter / 400)
    
    // 异常标记增加概率 (每个+5%)
    chance += this.anomalyTokens * 0.05
    
    return Math.min(0.5, chance)  // 最高50%
  }
}
```

### 2.3 短篇剧本示例（5-10分钟）

#### 剧本1: "无尽回廊" (The Endless Corridor)

```typescript
const story_endless_corridor: StoryTemplate = {
  id: 'endless_corridor',
  name: '无尽回廊',
  description: '玩家发现自己在一个不断重复的走廊中，必须找到打破循环的方法',
  
  trigger: {
    type: 'condition',
    probability: 0.15,
    conditions: [
      { type: 'room_count', value: 5, operator: 'gte' },
      { type: 'room_type', value: RoomType.BASIC }
    ],
    cooldown: 300  // 5分钟冷却
  },
  
  duration: { min: 300, max: 600 },  // 5-10分钟
  
  intensityCurve: {
    start: 20,
    peak: 80,
    progression: 'exponential'
  },
  
  nodes: [
    {
      id: 'enter_loop',
      type: 'event',
      trigger: { type: 'time', value: 0 },
      content: {
        dialogue: '等等...这个房间我们刚才来过。',
        speaker: 'companion'
      },
      horrorEffects: [
        { type: 'light_flicker', intensity: 0.3, duration: 3000 },
        { type: 'ambient_sound', sound: 'static_buzz' }
      ],
      nextNodes: ['realization', 'dismiss']
    },
    {
      id: 'realization',
      type: 'dialogue',
      trigger: { type: 'time', value: 15 },
      content: {
        dialogue: '不对...我们在循环里。看墙上的那个污渍，一模一样！',
        speaker: 'companion'
      },
      horrorEffects: [
        { type: 'screen_static', intensity: 0.2 },
        { type: 'whisper', text: '永远...留在这里...' }
      ],
      nextNodes: ['search_exit']
    },
    {
      id: 'search_exit',
      type: 'event',
      trigger: { type: 'action', value: 'player_move' },
      content: {},
      horrorEffects: [
        { type: 'loop_visual', intensity: 0.5 }  // 循环视觉效果
      ],
      nextNodes: ['find_clue', 'entity_appear']
    },
    {
      id: 'find_clue',
      type: 'choice',
      trigger: { type: 'time', value: 60 },
      content: {
        dialogue: '我发现了！墙上的符号...如果我们按照相反顺序走...',
        speaker: 'companion',
        choices: [
          {
            id: 'trust',
            text: '相信你，按你说的做',
            consequence: { type: 'story_progress', value: 'break_loop_success' }
          },
          {
            id: 'doubt',
            text: '这可能是陷阱',
            consequence: { type: 'story_progress', value: 'break_loop_fail' }
          }
        ]
      },
      horrorEffects: [],
      nextNodes: ['ending_success', 'ending_fail']
    },
    {
      id: 'ending_success',
      type: 'ending',
      trigger: { type: 'condition', value: 'break_loop_success' },
      content: {
        dialogue: '循环打破了！快，趁门还开着！',
        speaker: 'companion'
      },
      horrorEffects: [
        { type: 'light_blast', intensity: 1.0 },
        { type: 'portal_open' }
      ],
      nextNodes: []
    }
  ],
  
  aiContext: `
    这是一个关于空间循环的恐怖剧本。
    玩家被困在重复的走廊中，必须找到打破循环的方法。
    恐怖氛围应该逐渐增强：从疑惑→不安→恐慌→绝望→解脱/失败。
    可以暗示循环是某种"实体"造成的陷阱。
  `,
  
  fallbackData: {
    // 预设的恐怖效果序列
    effectSequence: [
      { time: 0, effects: ['light_flicker_0.3'] },
      { time: 15, effects: ['screen_static_0.2', 'whisper_loop'] },
      { time: 60, effects: ['loop_visual_0.5'] },
      { time: 120, effects: ['entity_shadow_appear'] },
      { time: 180, effects: ['light_blast', 'portal_open'] }
    ],
    // 预设对话
    dialogues: {
      companion: [
        '等等...这个房间我们刚才来过。',
        '不对...我们在循环里。看墙上的那个污渍，一模一样！',
        '我发现了！墙上的符号...如果我们按照相反顺序走...',
        '循环打破了！快，趁门还开着！'
      ],
      entity: [
        '永远...留在这里...',
        '没有人能逃出去...'
      ]
    }
  }
}
```

#### 剧本2: "镜中倒影" (Reflection in the Mirror)

```typescript
const story_mirror_reflection: StoryTemplate = {
  id: 'mirror_reflection',
  name: '镜中倒影',
  description: '房间里的镜子显示出玩家的倒影...但倒影的动作慢了半拍',
  
  trigger: {
    type: 'random',
    probability: 0.12,
    conditions: [
      { type: 'room_count', value: 8, operator: 'gte' },
      { type: 'sanity', value: 70, operator: 'lte' }
    ],
    cooldown: 240
  },
  
  duration: { min: 240, max: 480 },
  
  intensityCurve: {
    start: 30,
    peak: 90,
    progression: 'wave'  // 波浪式递进
  },
  
  nodes: [
    {
      id: 'mirror_notice',
      type: 'event',
      trigger: { type: 'time', value: 0 },
      content: {
        dialogue: '那面镜子...你的倒影好像...不太对劲。',
        speaker: 'companion'
      },
      horrorEffects: [
        { type: 'mirror_glow', color: '#8B0000' },
        { type: 'reflection_delay', delay: 500 }  // 倒影延迟500ms
      ],
      nextNodes: ['investigate', 'ignore']
    },
    {
      id: 'investigate',
      type: 'choice',
      trigger: { type: 'action', value: 'approach_mirror' },
      content: {
        dialogue: '别靠太近！它在...模仿你？',
        speaker: 'companion',
        choices: [
          {
            id: 'touch',
            text: '触摸镜子',
            consequence: { type: 'sanity_change', value: -20 }
          },
          {
            id: 'break',
            text: '打碎镜子',
            consequence: { type: 'entity_spawn', value: EntityType.SHADOW }
          }
        ]
      },
      horrorEffects: [
        { type: 'reflection_smile', intensity: 0.8 }  // 倒影诡笑
      ],
      nextNodes: ['mirror_break', 'entity_release']
    }
  ],
  
  aiContext: `
    这是一个关于镜子和双重自我的心理恐怖剧本。
    玩家的倒影逐渐获得自我意识，试图取代玩家。
    恐怖点：延迟的倒影、倒影的诡异表情、试图触碰玩家的倒影。
  `,
  
  fallbackData: {
    effectSequence: [
      { time: 0, effects: ['mirror_red_glow', 'reflection_delay_500'] },
      { time: 30, effects: ['reflection_smile'] },
      { time: 60, effects: ['reflection_wave'] },
      { time: 120, effects: ['reflection_reach'] },
      { time: 180, effects: ['mirror_shatter', 'shadow_entity'] }
    ]
  }
}
```

---

## 3. AI恐怖氛围调节系统

### 3.1 氛围评估模型

```typescript
// 恐怖氛围评估器
class AtmosphereEvaluator {
  // 计算当前恐怖强度 (0-100)
  calculateIntensity(state: GameState): number {
    let intensity = 0
    
    // 基础因素
    intensity += state.roomsExplored * 2           // 探索房间 (+2/间)
    intensity += (100 - state.player.sanity) * 0.3 // 精神值 (-0.3/点)
    intensity += state.timeElapsed * 0.1           // 游戏时间 (+0.1/秒)
    
    // 环境因素
    if (state.currentRoom?.hasEntity) intensity += 25
    if (state.currentRoom?.type === RoomType.DANGER) intensity += 15
    if (state.currentRoom?.isLoopRoom) intensity += 20
    if (!state.player.hasLamp || !state.player.lampLit) intensity += 10  // 黑暗
    
    // 队友因素
    if (state.companion.trust < 30) intensity += 15
    if (state.companion.sanity < 40) intensity += 10
    
    // 剧本因素
    if (state.activeStory) {
      intensity += state.activeStory.currentIntensity
    }
    
    return Math.min(100, intensity)
  }
  
  // 评估玩家情绪状态
  assessPlayerState(state: GameState): PlayerEmotionalState {
    return {
      stress: this.calculateStress(state),
      engagement: this.calculateEngagement(state),
      fear: this.calculateFear(state),
      confusion: this.calculateConfusion(state)
    }
  }
}
```

### 3.2 AI恐怖效果生成

```typescript
// AI恐怖效果生成器
class AIHorrorGenerator {
  private availableEffects: HorrorEffect[] = [
    // 视觉类
    { type: 'light_flicker', category: 'visual', intensity: [0.1, 1.0] },
    { type: 'screen_static', category: 'visual', intensity: [0.1, 0.8] },
    { type: 'color_shift', category: 'visual', intensity: [0.2, 0.9] },
    { type: 'shadow_movement', category: 'visual', intensity: [0.3, 1.0] },
    { type: 'peripheral_figure', category: 'visual', intensity: [0.4, 0.9] },
    
    // 听觉类
    { type: 'whisper', category: 'audio', intensity: [0.2, 0.8] },
    { type: 'footsteps', category: 'audio', intensity: [0.3, 0.9] },
    { type: 'heartbeat', category: 'audio', intensity: [0.4, 1.0] },
    { type: 'static_noise', category: 'audio', intensity: [0.2, 0.7] },
    { type: 'distant_scream', category: 'audio', intensity: [0.5, 1.0] },
    
    // 环境类
    { type: 'door_slam', category: 'environment', intensity: [0.6, 1.0] },
    { type: 'temperature_drop', category: 'environment', intensity: [0.3, 0.8] },
    { type: 'fog_increase', category: 'environment', intensity: [0.2, 0.9] },
    
    // 实体类
    { type: 'entity_shadow', category: 'entity', intensity: [0.5, 0.9] },
    { type: 'entity_glimpse', category: 'entity', intensity: [0.4, 0.8] },
    { type: 'entity_approach', category: 'entity', intensity: [0.7, 1.0] }
  ]
  
  // AI模式：动态生成恐怖效果
  async generateAIEffects(
    context: HorrorContext
  ): Promise<HorrorEffectCommand> {
    const prompt = `
      你是后室恐怖游戏的AI导演。根据以下情况生成恐怖效果：
      
      当前剧本：${context.storyName}
      剧本节点：${context.nodeId}
      恐怖强度：${context.intensity}/100
      玩家精神值：${context.playerSanity}/100
      玩家状态：${context.playerState}
      
      可用效果类型：
      - 视觉：灯光闪烁、屏幕噪点、颜色偏移、阴影移动、余光人影
      - 听觉：低语、脚步声、心跳声、静电噪音、远处尖叫
      - 环境：门 slam、温度下降、雾气增加
      - 实体：阴影实体、实体惊鸿一瞥、实体逼近
      
      要求：
      1. 生成1-3个恐怖效果
      2. 效果要与当前剧本主题匹配
      3. 考虑玩家精神值（越低越容易出现幻觉）
      4. 返回JSON格式
      
      返回格式：
      {
        "effects": [
          {"type": "效果名", "intensity": 0.5, "duration": 3000, "delay": 0}
        ],
        "reasoning": "选择这些效果的原因",
        "narrativeHint": "给玩家的暗示文本"
      }
    `
    
    return this.callAI(prompt)
  }
  
  // 降级模式：使用预设效果
  generateFallbackEffects(
    storyId: string,
    nodeId: string,
    intensity: number
  ): HorrorEffectCommand {
    const fallbackData = STORY_FALLBACK_DATABASE[storyId]
    if (!fallbackData) {
      return this.generateGenericEffects(intensity)
    }
    
    // 根据节点ID查找预设效果
    const nodeData = fallbackData.nodes[nodeId]
    if (!nodeData) {
      return this.generateGenericEffects(intensity)
    }
    
    return {
      effects: nodeData.effects,
      reasoning: '使用预设剧本效果',
      narrativeHint: nodeData.hint || ''
    }
  }
  
  // 通用效果生成（无剧本时）
  private generateGenericEffects(intensity: number): HorrorEffectCommand {
    const effects: HorrorEffect[] = []
    
    // 根据强度选择效果数量
    const count = intensity < 30 ? 1 : intensity < 60 ? 2 : 3
    
    for (let i = 0; i < count; i++) {
      const effect = this.selectEffectByIntensity(intensity)
      effects.push(effect)
    }
    
    return {
      effects,
      reasoning: '基于当前恐怖强度生成通用效果',
      narrativeHint: ''
    }
  }
}
```

### 3.3 恐怖效果执行器

```typescript
// 恐怖效果执行器
class HorrorEffectExecutor {
  private renderer: HorrorRenderer
  private audioManager: AudioManager
  
  constructor(renderer: HorrorRenderer, audioManager: AudioManager) {
    this.renderer = renderer
    this.audioManager = audioManager
  }
  
  // 执行恐怖效果
  async executeEffects(command: HorrorEffectCommand): Promise<void> {
    for (const effect of command.effects) {
      await this.executeEffect(effect)
    }
  }
  
  private async executeEffect(effect: HorrorEffect): Promise<void> {
    switch (effect.type) {
      case 'light_flicker':
        await this.renderer.flickerLights(effect.intensity, effect.duration)
        break
      case 'screen_static':
        await this.renderer.showStatic(effect.intensity, effect.duration)
        break
      case 'whisper':
        await this.audioManager.playWhisper(effect.text, effect.intensity)
        break
      case 'shadow_movement':
        await this.renderer.showShadowMovement(effect.position, effect.intensity)
        break
      case 'entity_shadow':
        await this.renderer.spawnShadowEntity(effect.position)
        break
      // ... 更多效果
    }
  }
}
```

---

## 4. 降级模式设计

### 4.1 降级策略

```typescript
// AI服务降级管理器
class AIServiceFallback {
  private useAI: boolean = false
  private storyDatabase: Map<string, FallbackStoryData> = new Map()
  
  constructor() {
    this.loadStoryDatabase()
    this.checkAPIAvailability()
  }
  
  private checkAPIAvailability(): void {
    const apiKey = localStorage.getItem('gemini_api_key')
    this.useAI = !!apiKey
  }
  
  // 获取剧本内容（自动选择AI或降级模式）
  async getStoryContent(request: StoryRequest): Promise<StoryContent> {
    if (this.useAI) {
      try {
        return await this.getAIContent(request)
      } catch (error) {
        console.warn('AI请求失败，切换到降级模式')
        return this.getFallbackContent(request)
      }
    } else {
      return this.getFallbackContent(request)
    }
  }
  
  // 降级模式：从预设数据库获取
  private getFallbackContent(request: StoryRequest): StoryContent {
    const storyData = this.storyDatabase.get(request.storyId)
    if (!storyData) {
      return this.getGenericContent(request)
    }
    
    // 根据节点获取内容
    const nodeData = storyData.nodes[request.nodeId]
    return {
      dialogue: nodeData.dialogue,
      speaker: nodeData.speaker,
      effects: nodeData.effects,
      choices: nodeData.choices,
      nextNodes: nodeData.nextNodes
    }
  }
  
  // 通用内容（无匹配剧本时）
  private getGenericContent(request: StoryRequest): StoryContent {
    const genericDialogues = {
      companion: [
        '这里有些不对劲...',
        '小心点，我感觉有东西在附近。',
        '我们得快点找到出口。',
        '你听到了吗？那是什么声音？'
      ],
      narrator: [
        '空气中弥漫着一股腐朽的气息。',
        '墙壁似乎在微微颤动。',
        '远处传来若有若无的脚步声。'
      ]
    }
    
    return {
      dialogue: this.getRandomDialogue(genericDialogues),
      speaker: 'companion',
      effects: this.getGenericEffects(request.intensity),
      choices: [],
      nextNodes: []
    }
  }
}
```

### 4.2 预设剧本数据库

```typescript
// 剧本降级数据库
const STORY_FALLBACK_DATABASE: Record<string, FallbackStoryData> = {
  'endless_corridor': {
    name: '无尽回廊',
    nodes: {
      'enter_loop': {
        dialogue: '等等...这个房间我们刚才来过。',
        speaker: 'companion',
        effects: [
          { type: 'light_flicker', intensity: 0.3, duration: 3000 },
          { type: 'ambient_sound', sound: 'static_buzz', volume: 0.4 }
        ],
        hint: '你注意到房间的布局有些熟悉...'
      },
      'realization': {
        dialogue: '不对...我们在循环里。看墙上的那个污渍，一模一样！',
        speaker: 'companion',
        effects: [
          { type: 'screen_static', intensity: 0.2, duration: 2000 },
          { type: 'whisper', text: '永远...留在这里...', volume: 0.3 }
        ],
        hint: '一种不祥的预感笼罩着你...'
      },
      'find_clue': {
        dialogue: '我发现了！墙上的符号...如果我们按照相反顺序走...',
        speaker: 'companion',
        effects: [
          { type: 'symbol_glow', color: '#00FF00', duration: 5000 }
        ],
        choices: [
          { id: 'trust', text: '相信你，按你说的做', nextNode: 'ending_success' },
          { id: 'doubt', text: '这可能是陷阱', nextNode: 'ending_fail' }
        ]
      },
      'ending_success': {
        dialogue: '循环打破了！快，趁门还开着！',
        speaker: 'companion',
        effects: [
          { type: 'light_blast', intensity: 1.0, duration: 3000 },
          { type: 'portal_effect', color: '#4A90E2' }
        ],
        hint: '一道光芒撕裂了循环的空间...'
      },
      'ending_fail': {
        dialogue: '不...循环加强了！我们被困住了！',
        speaker: 'companion',
        effects: [
          { type: 'red_pulse', intensity: 0.8, duration: 5000 },
          { type: 'entity_spawn', type: 'shadow', count: 3 }
        ],
        hint: '空间开始扭曲，黑暗从四面八方涌来...'
      }
    }
  },
  
  'mirror_reflection': {
    name: '镜中倒影',
    nodes: {
      'mirror_notice': {
        dialogue: '那面镜子...你的倒影好像...不太对劲。',
        speaker: 'companion',
        effects: [
          { type: 'mirror_glow', color: '#8B0000', intensity: 0.6 },
          { type: 'reflection_delay', delay: 500 }
        ]
      },
      'investigate': {
        dialogue: '别靠太近！它在...模仿你？',
        speaker: 'companion',
        effects: [
          { type: 'reflection_smile', intensity: 0.8, duration: 3000 }
        ],
        choices: [
          { id: 'touch', text: '触摸镜子', nextNode: 'touch_mirror' },
          { id: 'break', text: '打碎镜子', nextNode: 'break_mirror' }
        ]
      },
      'touch_mirror': {
        dialogue: '你的手...穿过去了？！不，有什么东西抓住了你！',
        speaker: 'companion',
        effects: [
          { type: 'hand_through_mirror', duration: 2000 },
          { type: 'sanity_drain', amount: 20 },
          { type: 'screen_shake', intensity: 0.5, duration: 3000 }
        ]
      },
      'break_mirror': {
        dialogue: '镜子碎了！但是...倒影还在那里！',
        speaker: 'companion',
        effects: [
          { type: 'mirror_shatter', particleCount: 50 },
          { type: 'entity_spawn', type: 'shadow', position: 'mirror_location' },
          { type: 'audio_scream', volume: 0.8 }
        ]
      }
    }
  }
}
```

---

## 5. 系统集成方案

### 5.1 核心类图

```typescript
// 主控制器
class AIDirectorSystem {
  private storyManager: StoryManager
  private atmosphereEvaluator: AtmosphereEvaluator
  private horrorGenerator: AIHorrorGenerator
  private effectExecutor: HorrorEffectExecutor
  private aiService: AIService
  private fallbackService: AIServiceFallback
  
  constructor(gameState: GameState) {
    this.storyManager = new StoryManager()
    this.atmosphereEvaluator = new AtmosphereEvaluator()
    this.horrorGenerator = new AIHorrorGenerator()
    this.effectExecutor = new HorrorEffectExecutor()
    this.aiService = new AIService()
    this.fallbackService = new AIServiceFallback()
  }
  
  // 主更新循环
  update(deltaTime: number, gameState: GameState): void {
    // 1. 评估当前氛围
    const intensity = this.atmosphereEvaluator.calculateIntensity(gameState)
    
    // 2. 检查剧本触发
    const triggeredStory = this.storyManager.checkTrigger(gameState)
    if (triggeredStory) {
      this.startStory(triggeredStory, gameState)
    }
    
    // 3. 更新活跃剧本
    if (gameState.activeStory) {
      this.updateActiveStory(deltaTime, gameState)
    }
    
    // 4. 生成氛围效果
    this.generateAtmosphereEffects(gameState, intensity)
  }
  
  // 启动剧本
  private async startStory(story: StoryTemplate, gameState: GameState): Promise<void> {
    gameState.activeStory = {
      template: story,
      currentNode: story.nodes[0],
      startTime: Date.now(),
      currentIntensity: story.intensityCurve.start
    }
    
    // 执行起始节点
    await this.executeNode(story.nodes[0], gameState)
  }
  
  // 执行剧情节点
  private async executeNode(node: StoryNode, gameState: GameState): Promise<void> {
    // 1. 生成恐怖效果
    const effectCommand = await this.generateEffects(node, gameState)
    
    // 2. 执行效果
    await this.effectExecutor.executeEffects(effectCommand)
    
    // 3. 显示对话
    if (node.content.dialogue) {
      this.showDialogue(node.content)
    }
    
    // 4. 显示选项
    if (node.content.choices) {
      this.showChoices(node.content.choices)
    }
  }
  
  // 生成恐怖效果（AI或降级）
  private async generateEffects(
    node: StoryNode, 
    gameState: GameState
  ): Promise<HorrorEffectCommand> {
    const context: HorrorContext = {
      storyName: gameState.activeStory?.template.name || '',
      nodeId: node.id,
      intensity: gameState.activeStory?.currentIntensity || 50,
      playerSanity: gameState.player.sanity,
      playerState: this.atmosphereEvaluator.assessPlayerState(gameState)
    }
    
    if (this.aiService.isAvailable()) {
      return await this.horrorGenerator.generateAIEffects(context)
    } else {
      return this.fallbackService.getEffects(context)
    }
  }
}
```

### 5.2 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                        游戏主循环                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Director System                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. 氛围评估器 (AtmosphereEvaluator)                       │  │
│  │     - 计算恐怖强度                                         │  │
│  │     - 评估玩家状态                                         │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  2. 剧本管理器 (StoryManager)                              │  │
│  │     - 检查触发条件                                         │  │
│  │     - 选择随机剧本                                         │  │
│  │     - 管理剧本状态                                         │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  3. 恐怖效果生成器 (AI/降级)                                │  │
│  │     ┌─────────────┐    ┌─────────────────┐                │  │
│  │     │  AI模式     │    │    降级模式      │                │  │
│  │     │ Gemini API  │    │ 预设剧本数据库   │                │  │
│  │     │ 动态生成    │    │ 固定效果序列     │                │  │
│  │     └─────────────┘    └─────────────────┘                │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4. 效果执行器 (EffectExecutor)                            │  │
│  │     - 视觉渲染 (Three.js/CSS)                              │  │
│  │     - 音频播放                                             │  │
│  │     - 环境变化                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 实现计划

### Phase 1: 基础架构 (2-3天)
- [ ] 创建 `StoryManager` 类
- [ ] 创建 `AtmosphereEvaluator` 类
- [ ] 创建 `HorrorEffectExecutor` 类
- [ ] 定义所有类型接口

### Phase 2: 降级模式 (2-3天)
- [ ] 编写2-3个完整剧本的降级数据
- [ ] 实现 `AIServiceFallback` 类
- [ ] 实现基础恐怖效果（灯光闪烁、屏幕噪点、低语）

### Phase 3: AI集成 (2-3天)
- [ ] 扩展 `AIService` 支持恐怖效果生成
- [ ] 编写AI Prompt模板
- [ ] 实现AI与降级模式切换逻辑

### Phase 4: 剧本内容 (3-4天)
- [ ] 编写5-8个短篇剧本
- [ ] 每个剧本包含完整节点和效果序列
- [ ] 测试剧本触发和流程

### Phase 5: 集成测试 (2天)
- [ ] 与现有游戏系统集成
- [ ] 测试AI模式和降级模式
- [ ] 平衡恐怖强度曲线

---

## 7. 技术要点

### 7.1 API成本控制
```typescript
// API调用频率限制
const API_RATE_LIMIT = {
  maxRequestsPerMinute: 3,      // 每分钟最多3次
  maxRequestsPerStory: 10,      // 每个剧本最多10次
  cooldownBetweenRequests: 20000 // 每次间隔20秒
}
```

### 7.2 性能优化
- 恐怖效果使用对象池复用
- AI请求使用Web Worker避免阻塞主线程
- 降级数据预加载到内存

### 7.3 可扩展性
- 剧本数据使用JSON格式，便于热更新
- 恐怖效果使用插件系统，易于添加新效果
- AI Prompt使用模板系统，支持多语言

---

## 8. 待讨论问题

1. **剧本数量**：初期实现几个剧本比较合适？（建议3-5个）
2. **恐怖效果优先级**：哪些视觉效果是必须优先实现的？
3. **AI Prompt优化**：是否需要针对中文语境优化Prompt？
4. **难度曲线**：恐怖强度增长曲线应该如何设计？
5. **玩家反馈**：是否需要添加玩家反馈机制来调整AI生成？

---

*文档版本: 1.0*
*创建日期: 2026-02-11*
*作者: AI Assistant*
