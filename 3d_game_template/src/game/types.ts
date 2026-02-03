// 《逃离后室：山屋惊魂》- 类型定义

import * as THREE from 'three'

// ========== 游戏常量 ==========
export const GAME_CONFIG = {
  // 房间设置
  ROOM_SIZE: 8,           // 房间大小
  WALL_HEIGHT: 3,         // 墙高
  DOOR_WIDTH: 1.5,        // 门宽
  DOOR_HEIGHT: 2.5,       // 门高
  
  // 玩家设置
  PLAYER_SPEED: 4,        // 移动速度
  PLAYER_RUN_SPEED: 6,    // 奔跑速度
  MAX_SANITY: 100,        // 最大精神值
  SANITY_DECAY_RATE: 0.5, // 精神值衰减速率（每秒）
  
  // 队友设置
  COMPANION_FOLLOW_DIST: 2,
  
  // 资源设置
  MAX_INVENTORY: 6,       // 最大背包容量
  
  // 房间生成概率
  ROOM_PROBS: {
    basic: 0.70,
    danger: 0.20,
    hub: 0.05,
    secret: 0.05
  }
}

// ========== 枚举类型 ==========
export enum RoomType {
  BASIC = 'basic',       // 基础格子（Level 0/Level 5）
  DANGER = 'danger',     // 危险格子（Level 2/Level 3）
  HUB = 'hub',           // 枢纽格子（The Hub）
  SECRET = 'secret',     // 隐秘格子（Level 94/Level Fun）
  EXIT = 'exit'          // 出口格子
}

export enum Direction {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west'
}

export enum ItemType {
  ALMOND_WATER = 'almond_water',  // 杏仁水
  OIL_LAMP = 'oil_lamp',          // 煤油灯
  BATTERY = 'battery',            // 电池
  KEY = 'key',                    // 钥匙
  LIGHTER = 'lighter',            // 打火机
  NEWSPAPER = 'newspaper'         // 旧报纸
}

export enum EntityType {
  SMILER = 'smiler',        // 笑魇
  SKIN_STEALER = 'skin_stealer',  // 窃皮者
  SHADOW = 'shadow',        // 影怪
  PARTYGOER = 'partygoer'   // 派对客
}

export enum CompanionType {
  PSYCHIC = 'psychic',      // 通灵者
  EXPLORER = 'explorer',    // 探险家
  HISTORIAN = 'historian'   // 历史学家
}

export enum GamePhase {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  WIN = 'win'
}

// ========== 接口定义 ==========
export interface Position {
  x: number
  z: number
}

export interface RoomPosition {
  gridX: number
  gridZ: number
}

export interface Item {
  id: string
  type: ItemType
  name: string
  description: string
  usable: boolean
}

export interface Room {
  id: string
  type: RoomType
  position: RoomPosition
  doors: Direction[]      // 哪些方向有门
  items: Item[]           // 房间内的道具
  hasEntity: boolean      // 是否有实体
  entityType?: EntityType // 实体类型
  visited: boolean        // 是否已访问
  mesh?: THREE.Group      // 3D网格对象
  isLoopRoom: boolean     // 是否是循环房间
}

export interface PlayerState {
  position: Position
  sanity: number          // 精神值
  inventory: Item[]       // 背包
  hasLamp: boolean        // 是否有煤油灯
  lampLit: boolean        // 煤油灯是否点亮
  isRunning: boolean      // 是否在奔跑
  noiseLevel: number      // 噪音等级
}

export interface CompanionState {
  type: CompanionType
  name: string
  sanity: number
  trust: number           // 信任度 (0-100)
  position: Position
  isHiding: boolean       // 是否躲藏中
  dialogue: string        // 当前对话
}

export interface GameState {
  phase: GamePhase
  currentRoom: Room | null
  rooms: Map<string, Room>
  player: PlayerState
  companion: CompanionState
  roomsExplored: number
  almondWaterCollected: number
  timeElapsed: number
  score: number
}

// ========== 道具数据 ==========
export const ITEMS_DATA: Record<ItemType, Omit<Item, 'id'>> = {
  [ItemType.ALMOND_WATER]: {
    type: ItemType.ALMOND_WATER,
    name: '杏仁水',
    description: '恢复30点精神值',
    usable: true
  },
  [ItemType.OIL_LAMP]: {
    type: ItemType.OIL_LAMP,
    name: '煤油灯',
    description: '驱散影怪，照亮黑暗',
    usable: true
  },
  [ItemType.BATTERY]: {
    type: ItemType.BATTERY,
    name: '电池',
    description: '为煤油灯补充能量',
    usable: true
  },
  [ItemType.KEY]: {
    type: ItemType.KEY,
    name: '钥匙',
    description: '可以攻击窃皮者',
    usable: true
  },
  [ItemType.LIGHTER]: {
    type: ItemType.LIGHTER,
    name: '打火机',
    description: '可与报纸组合生成火把',
    usable: false
  },
  [ItemType.NEWSPAPER]: {
    type: ItemType.NEWSPAPER,
    name: '旧报纸',
    description: '可与打火机组合生成火把',
    usable: false
  }
}

// ========== 颜色主题 ==========
export const COLORS = {
  // 后室风格黄色墙纸
  wallpaperYellow: 0xc9b458,
  wallpaperDark: 0xa89648,
  floorCarpet: 0x5c4a32,
  floorWood: 0x8b6914,
  
  // 危险区域
  dangerWall: 0x4a4a4a,
  dangerFloor: 0x2a2a2a,
  dangerPipe: 0x8b4513,
  
  // 枢纽区域
  hubWall: 0x1a3a5c,
  hubFloor: 0x0a2a4c,
  hubGlow: 0x00aaff,
  
  // 隐秘区域
  secretWall: 0xff69b4,
  secretFloor: 0xffb6c1,
  
  // 实体颜色
  smiler: 0xff0000,
  skinStealer: 0x8b4513,
  shadow: 0x1a1a1a,
  
  // 道具颜色
  almondWater: 0x87ceeb,
  lamp: 0xffa500,
  
  // UI颜色
  sanityHigh: 0x00ff88,
  sanityMid: 0xffaa00,
  sanityLow: 0xff3333,
  
  // 灯光
  ambientDim: 0x2a2a1a,
  lampLight: 0xffcc66,
}

// ========== 工具函数 ==========
export function getRoomKey(pos: RoomPosition): string {
  return `${pos.gridX},${pos.gridZ}`
}

export function getOppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case Direction.NORTH: return Direction.SOUTH
    case Direction.SOUTH: return Direction.NORTH
    case Direction.EAST: return Direction.WEST
    case Direction.WEST: return Direction.EAST
  }
}

export function getDirectionOffset(dir: Direction): RoomPosition {
  switch (dir) {
    case Direction.NORTH: return { gridX: 0, gridZ: -1 }
    case Direction.SOUTH: return { gridX: 0, gridZ: 1 }
    case Direction.EAST: return { gridX: 1, gridZ: 0 }
    case Direction.WEST: return { gridX: -1, gridZ: 0 }
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
