/**
 * 平台通信桥接器
 * 用于 iframe 内的游戏与外部平台通信
 */

export interface GameState {
  status: 'running' | 'paused' | 'stopped'
  tick?: number
  fps?: number
  objectCount?: number
}

export interface PlatformMessage {
  type: 'play' | 'pause' | 'reset' | 'debug' | 'setSpeed'
  enabled?: boolean
  speed?: number
}

type MessageHandler = (msg: PlatformMessage) => void

export class PlatformBridge {
  private handlers: MessageHandler[] = []
  private isEmbedded: boolean

  constructor() {
    this.isEmbedded = window.parent !== window
    
    if (this.isEmbedded) {
      window.addEventListener('message', this.handleMessage.bind(this))
    }
  }

  /**
   * 发送就绪消息
   */
  sendReady() {
    this.sendToParent({ type: 'ready' })
  }

  /**
   * 发送状态变化
   */
  sendStateChange(state: Partial<GameState>) {
    this.sendToParent({ type: 'stateChange', state })
  }

  /**
   * 发送错误信息
   */
  sendError(message: string) {
    this.sendToParent({ type: 'error', message })
  }

  /**
   * 发送日志
   */
  sendLog(level: 'info' | 'warn' | 'error', message: string) {
    this.sendToParent({ type: 'log', level, message })
  }

  /**
   * 监听平台消息
   */
  onMessage(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  private handleMessage(event: MessageEvent) {
    const data = event.data
    if (!data || typeof data.type !== 'string') return

    for (const handler of this.handlers) {
      handler(data as PlatformMessage)
    }
  }

  private sendToParent(data: Record<string, unknown>) {
    if (this.isEmbedded) {
      window.parent.postMessage(data, '*')
    }
  }
}
