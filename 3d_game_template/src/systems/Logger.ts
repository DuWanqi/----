// 《逃离后室：山屋惊魂》- 日志系统

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  EVENT = 4  // 游戏事件专用
}

export enum EventType {
  GAME_START = '🎮 游戏开始',
  GAME_PAUSE = '⏸️ 游戏暂停',
  GAME_RESUME = '▶️ 游戏继续',
  GAME_OVER = '💀 游戏结束',
  GAME_WIN = '🎉 游戏胜利',
  
  ROOM_ENTER = '🚪 进入房间',
  ROOM_GENERATE = '🏠 生成房间',
  
  PLAYER_MOVE = '🏃 玩家移动',
  PLAYER_PICKUP = '✨ 拾取道具',
  PLAYER_USE_ITEM = '🎒 使用道具',
  PLAYER_DAMAGE = '💔 受到伤害',
  
  COMPANION_DIALOGUE = '💬 队友对话',
  COMPANION_HELP = '🆘 队友求助',
  COMPANION_HIDE = '😨 队友躲藏',
  
  ENTITY_SPAWN = '👹 实体生成',
  ENTITY_ATTACK = '⚔️ 实体攻击',
  ENTITY_DEFEATED = '✅ 实体击败',
  
  AI_REQUEST = '🤖 AI请求',
  AI_RESPONSE = '📝 AI响应',
  AI_ERROR = '❌ AI错误',
  AI_FALLBACK = '📋 使用固定对话',
  
  UI_UPDATE = '🖥️ UI更新',
  INPUT_KEY = '⌨️ 按键输入'
}

class GameLogger {
  private logLevel: LogLevel = LogLevel.DEBUG
  private logHistory: { time: Date, level: LogLevel, message: string }[] = []
  private maxHistory = 100
  private logContainer: HTMLDivElement | null = null
  private showOnScreen = true

  constructor() {
    this.createLogContainer()
  }

  private createLogContainer(): void {
    this.logContainer = document.createElement('div')
    this.logContainer.id = 'game-log'
    this.logContainer.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 400px;
      max-height: 200px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid #444;
      border-radius: 8px;
      padding: 10px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      color: #0f0;
      z-index: 9999;
      pointer-events: auto;
      display: none;
    `
    document.body.appendChild(this.logContainer)

    // 按 ~ 键切换日志显示
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') { // ~ 键
        this.toggleLogDisplay()
      }
    })
  }

  toggleLogDisplay(): void {
    if (this.logContainer) {
      this.showOnScreen = !this.showOnScreen
      this.logContainer.style.display = this.showOnScreen ? 'block' : 'none'
    }
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private formatTime(): string {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
  }

  private log(level: LogLevel, levelName: string, message: string, color: string): void {
    if (level < this.logLevel) return

    const time = this.formatTime()
    const formattedMessage = `[${time}] [${levelName}] ${message}`
    
    // 控制台输出
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`%c${formattedMessage}`, `color: ${color}`)
        break
      case LogLevel.INFO:
        console.info(`%c${formattedMessage}`, `color: ${color}`)
        break
      case LogLevel.WARN:
        console.warn(formattedMessage)
        break
      case LogLevel.ERROR:
        console.error(formattedMessage)
        break
      case LogLevel.EVENT:
        console.log(`%c${formattedMessage}`, `color: ${color}; font-weight: bold`)
        break
    }

    // 保存历史
    this.logHistory.push({ time: new Date(), level, message: formattedMessage })
    if (this.logHistory.length > this.maxHistory) {
      this.logHistory.shift()
    }

    // 屏幕显示
    if (this.logContainer && this.showOnScreen) {
      const logLine = document.createElement('div')
      logLine.style.color = color
      logLine.style.marginBottom = '2px'
      logLine.style.borderBottom = '1px solid #333'
      logLine.style.paddingBottom = '2px'
      logLine.textContent = formattedMessage
      this.logContainer.appendChild(logLine)
      
      // 保持最新日志可见
      this.logContainer.scrollTop = this.logContainer.scrollHeight
      
      // 限制显示行数
      while (this.logContainer.children.length > 20) {
        this.logContainer.removeChild(this.logContainer.firstChild!)
      }
    }
  }

  debug(message: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, '#888')
  }

  info(message: string): void {
    this.log(LogLevel.INFO, 'INFO', message, '#0af')
  }

  warn(message: string): void {
    this.log(LogLevel.WARN, 'WARN', message, '#fa0')
  }

  error(message: string): void {
    this.log(LogLevel.ERROR, 'ERROR', message, '#f44')
  }

  // 游戏事件日志
  event(type: EventType, details?: string): void {
    const message = details ? `${type}: ${details}` : type
    this.log(LogLevel.EVENT, 'EVENT', message, '#0f0')
  }

  // 清除日志
  clear(): void {
    this.logHistory = []
    if (this.logContainer) {
      this.logContainer.innerHTML = ''
    }
    console.clear()
  }

  // 获取日志历史
  getHistory(): string[] {
    return this.logHistory.map(h => h.message)
  }
}

// 单例导出
export const logger = new GameLogger()
