// 《逃离后室：山屋惊魂》- 游戏UI系统

import { PlayerState, CompanionState, Item, ItemType, COLORS, GAME_CONFIG, CompanionType } from '../game/types'

export class GameUI {
  private container: HTMLDivElement
  private hudContainer: HTMLDivElement
  private dialogueContainer: HTMLDivElement
  private inventoryContainer: HTMLDivElement
  private messageContainer: HTMLDivElement
  private menuContainer: HTMLDivElement
  private settingsContainer: HTMLDivElement
  
  private currentDialogue = ''
  private dialogueTimeout: number | null = null
  
  constructor() {
    // 创建主容器
    this.container = document.createElement('div')
    this.container.id = 'game-ui'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
    `
    document.body.appendChild(this.container)
    
    // 创建各个UI组件
    this.hudContainer = this.createHUD()
    this.dialogueContainer = this.createDialogueBox()
    this.inventoryContainer = this.createInventory()
    this.messageContainer = this.createMessageBox()
    this.menuContainer = this.createMenu()
    this.settingsContainer = this.createSettings()
    
    this.container.appendChild(this.hudContainer)
    this.container.appendChild(this.dialogueContainer)
    this.container.appendChild(this.inventoryContainer)
    this.container.appendChild(this.messageContainer)
    this.container.appendChild(this.menuContainer)
    this.container.appendChild(this.settingsContainer)
  }

  private createHUD(): HTMLDivElement {
    const hud = document.createElement('div')
    hud.id = 'hud'
    hud.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      padding: 15px 20px;
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(40, 35, 45, 0.9) 100%);
      border: 1px solid rgba(201, 180, 88, 0.3);
      border-radius: 8px;
      color: #e0d5c0;
      font-size: 14px;
      min-width: 200px;
      backdrop-filter: blur(5px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
      display: none;
    `
    hud.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; color: #c9b458; margin-bottom: 12px; 
                  border-bottom: 1px solid rgba(201, 180, 88, 0.3); padding-bottom: 8px;">
        🏚️ 逃离后室：山屋惊魂
      </div>
      <div id="hud-sanity" style="margin-bottom: 8px;">
        <span style="color: #888;">精神值：</span>
        <div style="display: inline-block; width: 100px; height: 12px; background: #333; border-radius: 6px; overflow: hidden; vertical-align: middle;">
          <div id="sanity-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #00ff88, #00cc66); transition: width 0.3s;"></div>
        </div>
        <span id="sanity-text" style="color: #00ff88; margin-left: 5px;">100%</span>
      </div>
      <div id="hud-companion" style="margin-bottom: 8px;">
        <span style="color: #888;">队友：</span>
        <span id="companion-name" style="color: #9932cc;">--</span>
        <div style="display: inline-block; width: 60px; height: 8px; background: #333; border-radius: 4px; overflow: hidden; vertical-align: middle; margin-left: 5px;">
          <div id="companion-sanity-bar" style="width: 100%; height: 100%; background: #9932cc; transition: width 0.3s;"></div>
        </div>
      </div>
      <div id="hud-trust" style="margin-bottom: 8px;">
        <span style="color: #888;">信任度：</span>
        <span id="trust-text" style="color: #ffaa00;">70%</span>
      </div>
      <div id="hud-rooms" style="margin-bottom: 8px;">
        <span style="color: #888;">已探索：</span>
        <span id="rooms-text" style="color: #87ceeb;">0 个房间</span>
      </div>
      <div id="hud-lamp" style="display: none;">
        <span style="color: #ffa500;">🔦 煤油灯：</span>
        <span id="lamp-status" style="color: #ffa500;">已点亮</span>
      </div>
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(201, 180, 88, 0.2); font-size: 11px; color: #666;">
        WASD 移动 | Shift 奔跑 | E 煤油灯 | I 背包 | ESC 菜单
      </div>
    `
    return hud
  }

  private createDialogueBox(): HTMLDivElement {
    const dialogue = document.createElement('div')
    dialogue.id = 'dialogue-box'
    dialogue.style.cssText = `
      position: absolute;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 600px;
      padding: 15px 25px;
      background: linear-gradient(135deg, rgba(30, 25, 40, 0.95) 0%, rgba(50, 40, 60, 0.9) 100%);
      border: 1px solid rgba(153, 50, 204, 0.5);
      border-radius: 10px;
      color: #e0d5c0;
      font-size: 15px;
      line-height: 1.6;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: auto;
      box-shadow: 0 4px 20px rgba(153, 50, 204, 0.3);
    `
    dialogue.innerHTML = `
      <div id="dialogue-speaker" style="color: #9932cc; font-weight: bold; margin-bottom: 5px;"></div>
      <div id="dialogue-text"></div>
    `
    return dialogue
  }

  private createInventory(): HTMLDivElement {
    const inventory = document.createElement('div')
    inventory.id = 'inventory'
    inventory.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(40, 35, 45, 0.95) 100%);
      border: 2px solid rgba(201, 180, 88, 0.5);
      border-radius: 12px;
      color: #e0d5c0;
      display: none;
      pointer-events: auto;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
    `
    inventory.innerHTML = `
      <div style="font-size: 18px; font-weight: bold; color: #c9b458; margin-bottom: 15px; 
                  border-bottom: 1px solid rgba(201, 180, 88, 0.3); padding-bottom: 10px;">
        🎒 背包 <span id="inventory-count" style="font-size: 14px; color: #888;">(0/${GAME_CONFIG.MAX_INVENTORY})</span>
      </div>
      <div id="inventory-items" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; min-height: 150px;"></div>
      <div style="margin-top: 15px; text-align: center; color: #666; font-size: 12px;">
        点击道具使用 | 按 I 关闭
      </div>
    `
    return inventory
  }

  private createMessageBox(): HTMLDivElement {
    const message = document.createElement('div')
    message.id = 'message-box'
    message.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 40px 60px;
      background: rgba(0, 0, 0, 0.95);
      border: 3px solid #c9b458;
      border-radius: 15px;
      color: white;
      font-size: 28px;
      text-align: center;
      display: none;
      pointer-events: auto;
      box-shadow: 0 0 50px rgba(201, 180, 88, 0.3);
    `
    return message
  }

  private createMenu(): HTMLDivElement {
    const menu = document.createElement('div')
    menu.id = 'game-menu'
    menu.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      pointer-events: auto;
      overflow-y: auto;
      padding: 30px 0;
    `
    menu.innerHTML = `
      <div style="text-align: center;">
        <h1 style="font-size: 48px; color: #c9b458; margin-bottom: 10px; text-shadow: 0 0 20px rgba(201, 180, 88, 0.5);">
          🏚️ 逃离后室
        </h1>
        <h2 style="font-size: 24px; color: #888; margin-bottom: 40px;">山屋惊魂</h2>
        
        <div style="margin-bottom: 30px;">
          <div style="color: #888; margin-bottom: 15px;">选择你的队友：</div>
          <div id="companion-select" style="display: flex; gap: 15px; justify-content: center;">
            <button class="companion-btn" data-type="psychic" style="
              padding: 15px 25px; background: rgba(153, 50, 204, 0.3); border: 2px solid #9932cc;
              color: #9932cc; border-radius: 8px; cursor: pointer; font-size: 14px;
              transition: all 0.3s;
            ">
              🔮 艾琳<br><span style="font-size: 11px; color: #888;">通灵者</span>
            </button>
            <button class="companion-btn selected" data-type="explorer" style="
              padding: 15px 25px; background: rgba(34, 139, 34, 0.3); border: 2px solid #228b22;
              color: #228b22; border-radius: 8px; cursor: pointer; font-size: 14px;
              transition: all 0.3s;
            ">
              🧭 马克<br><span style="font-size: 11px; color: #888;">探险家</span>
            </button>
            <button class="companion-btn" data-type="historian" style="
              padding: 15px 25px; background: rgba(139, 69, 19, 0.3); border: 2px solid #8b4513;
              color: #8b4513; border-radius: 8px; cursor: pointer; font-size: 14px;
              transition: all 0.3s;
            ">
              📚 李博士<br><span style="font-size: 11px; color: #888;">历史学家</span>
            </button>
          </div>
        </div>
        
        <button id="start-btn" style="
          padding: 18px 50px; background: linear-gradient(135deg, #c9b458, #a89648);
          border: none; color: #1a1a2e; font-size: 20px; font-weight: bold;
          border-radius: 10px; cursor: pointer; margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(201, 180, 88, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        ">
          开始探索
        </button>
        
        <div>
          <button id="settings-btn" style="
            padding: 10px 25px; background: transparent; border: 1px solid #666;
            color: #888; font-size: 14px; border-radius: 5px; cursor: pointer;
            transition: all 0.3s;
          ">
            ⚙️ 设置
          </button>
        </div>
        
        <div style="margin-top: 30px; color: #555; font-size: 12px; max-width: 400px; line-height: 1.6;">
          山屋是后室的Level 5层级，一个19世纪因家族崇拜外神而意外打通后室通道的废弃酒店。
          <br>你与AI同伴误入此处，必须在空间循环与实体威胁中寻找出口...
        </div>
        
        <div style="margin-top: 25px; padding: 15px 20px; background: rgba(50, 50, 60, 0.5); border-radius: 8px; border: 1px solid rgba(100, 100, 120, 0.3);">
          <div style="color: #c9b458; font-size: 14px; font-weight: bold; margin-bottom: 12px;">🎮 操作指南</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #aaa;">
            <div><span style="color: #87ceeb; font-weight: bold;">WASD / 方向键</span> - 移动</div>
            <div><span style="color: #87ceeb; font-weight: bold;">Shift</span> - 奔跑</div>
            <div><span style="color: #87ceeb; font-weight: bold;">Space</span> - 拾取物品</div>
            <div><span style="color: #87ceeb; font-weight: bold;">E</span> - 互动/煤油灯</div>
            <div><span style="color: #87ceeb; font-weight: bold;">I</span> - 打开背包</div>
            <div><span style="color: #87ceeb; font-weight: bold;">F</span> - 与队友交谈</div>
            <div><span style="color: #87ceeb; font-weight: bold;">~</span> - 查看日志</div>
            <div><span style="color: #87ceeb; font-weight: bold;">ESC</span> - 暂停菜单</div>
          </div>
        </div>
      </div>
    `
    return menu
  }

  private createSettings(): HTMLDivElement {
    const settings = document.createElement('div')
    settings.id = 'settings-panel'
    settings.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      padding: 25px;
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(40, 35, 45, 0.95) 100%);
      border: 2px solid rgba(201, 180, 88, 0.5);
      border-radius: 12px;
      color: #e0d5c0;
      display: none;
      pointer-events: auto;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
    `
    settings.innerHTML = `
      <div style="font-size: 18px; font-weight: bold; color: #c9b458; margin-bottom: 20px; 
                  border-bottom: 1px solid rgba(201, 180, 88, 0.3); padding-bottom: 10px;">
        ⚙️ 设置
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #888; margin-bottom: 8px;">Google Gemini API Key（可选）:</label>
        <input id="api-key-input" type="password" placeholder="输入API Key启用AI对话" style="
          width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #444;
          border-radius: 5px; color: #e0d5c0; font-size: 13px;
        ">
        <div style="font-size: 11px; color: #666; margin-top: 5px;">
          不填写则使用固定对话模式，游戏照常运行
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #888; margin-bottom: 8px;">难度:</label>
        <select id="difficulty-select" style="
          width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #444;
          border-radius: 5px; color: #e0d5c0; font-size: 13px;
        ">
          <option value="easy">新手 - 实体刷新率低，资源丰富</option>
          <option value="normal" selected>普通 - 标准体验</option>
          <option value="hard">专家 - 高威胁，资源稀缺</option>
        </select>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="settings-save" style="
          padding: 10px 25px; background: #c9b458; border: none;
          color: #1a1a2e; font-size: 14px; border-radius: 5px; cursor: pointer;
        ">
          保存
        </button>
        <button id="settings-close" style="
          padding: 10px 25px; background: transparent; border: 1px solid #666;
          color: #888; font-size: 14px; border-radius: 5px; cursor: pointer;
        ">
          取消
        </button>
      </div>
    `
    return settings
  }

  // 更新HUD
  updateHUD(player: PlayerState, companion: CompanionState, roomsExplored: number): void {
    // 更新精神值
    const sanityBar = document.getElementById('sanity-bar')
    const sanityText = document.getElementById('sanity-text')
    if (sanityBar && sanityText) {
      const sanityPercent = Math.max(0, Math.min(100, player.sanity))
      sanityBar.style.width = `${sanityPercent}%`
      sanityText.textContent = `${Math.round(sanityPercent)}%`
      
      // 根据精神值改变颜色
      if (sanityPercent > 60) {
        sanityBar.style.background = 'linear-gradient(90deg, #00ff88, #00cc66)'
        sanityText.style.color = '#00ff88'
      } else if (sanityPercent > 30) {
        sanityBar.style.background = 'linear-gradient(90deg, #ffaa00, #ff8800)'
        sanityText.style.color = '#ffaa00'
      } else {
        sanityBar.style.background = 'linear-gradient(90deg, #ff3333, #cc0000)'
        sanityText.style.color = '#ff3333'
      }
    }
    
    // 更新队友信息
    const companionName = document.getElementById('companion-name')
    const companionSanityBar = document.getElementById('companion-sanity-bar')
    const trustText = document.getElementById('trust-text')
    
    if (companionName) {
      companionName.textContent = companion.name.split('（')[0]
    }
    if (companionSanityBar) {
      companionSanityBar.style.width = `${companion.sanity}%`
    }
    if (trustText) {
      trustText.textContent = `${Math.round(companion.trust)}%`
      trustText.style.color = companion.trust > 60 ? '#00ff88' : companion.trust > 30 ? '#ffaa00' : '#ff3333'
    }
    
    // 更新探索房间数
    const roomsText = document.getElementById('rooms-text')
    if (roomsText) {
      roomsText.textContent = `${roomsExplored} 个房间`
    }
    
    // 更新煤油灯状态
    const lampDiv = document.getElementById('hud-lamp')
    const lampStatus = document.getElementById('lamp-status')
    if (lampDiv && lampStatus) {
      if (player.hasLamp) {
        lampDiv.style.display = 'block'
        lampStatus.textContent = player.lampLit ? '已点亮' : '已熄灭'
        lampStatus.style.color = player.lampLit ? '#ffa500' : '#666'
      } else {
        lampDiv.style.display = 'none'
      }
    }
  }

  // 显示对话
  showDialogue(speaker: string, text: string, duration = 5000): void {
    if (!text) return
    
    const speakerEl = document.getElementById('dialogue-speaker')
    const textEl = document.getElementById('dialogue-text')
    
    if (speakerEl && textEl) {
      speakerEl.textContent = speaker
      textEl.textContent = text
      this.dialogueContainer.style.opacity = '1'
      
      // 清除之前的定时器
      if (this.dialogueTimeout) {
        clearTimeout(this.dialogueTimeout)
      }
      
      // 设置自动隐藏
      this.dialogueTimeout = window.setTimeout(() => {
        this.hideDialogue()
      }, duration)
    }
  }

  hideDialogue(): void {
    this.dialogueContainer.style.opacity = '0'
  }

  // 更新背包
  updateInventory(items: Item[], onUse: (itemId: string) => void): void {
    const itemsContainer = document.getElementById('inventory-items')
    const countEl = document.getElementById('inventory-count')
    
    if (!itemsContainer || !countEl) return
    
    countEl.textContent = `(${items.length}/${GAME_CONFIG.MAX_INVENTORY})`
    
    itemsContainer.innerHTML = ''
    
    items.forEach(item => {
      const itemEl = document.createElement('div')
      itemEl.style.cssText = `
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(201, 180, 88, 0.3);
        border-radius: 8px;
        text-align: center;
        cursor: ${item.usable ? 'pointer' : 'default'};
        transition: all 0.2s;
      `
      
      const icon = this.getItemIcon(item.type)
      itemEl.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 5px;">${icon}</div>
        <div style="font-size: 12px; color: #c9b458;">${item.name}</div>
        <div style="font-size: 10px; color: #666; margin-top: 3px;">${item.description}</div>
      `
      
      if (item.usable) {
        itemEl.addEventListener('mouseenter', () => {
          itemEl.style.background = 'rgba(201, 180, 88, 0.2)'
          itemEl.style.borderColor = '#c9b458'
        })
        itemEl.addEventListener('mouseleave', () => {
          itemEl.style.background = 'rgba(255, 255, 255, 0.05)'
          itemEl.style.borderColor = 'rgba(201, 180, 88, 0.3)'
        })
        itemEl.addEventListener('click', () => onUse(item.id))
      }
      
      itemsContainer.appendChild(itemEl)
    })
    
    // 填充空格子
    for (let i = items.length; i < GAME_CONFIG.MAX_INVENTORY; i++) {
      const emptyEl = document.createElement('div')
      emptyEl.style.cssText = `
        padding: 12px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px dashed rgba(100, 100, 100, 0.3);
        border-radius: 8px;
        min-height: 60px;
      `
      itemsContainer.appendChild(emptyEl)
    }
  }

  private getItemIcon(type: ItemType): string {
    switch (type) {
      case ItemType.ALMOND_WATER: return '💧'
      case ItemType.OIL_LAMP: return '🔦'
      case ItemType.BATTERY: return '🔋'
      case ItemType.KEY: return '🔑'
      case ItemType.LIGHTER: return '🔥'
      case ItemType.NEWSPAPER: return '📰'
      default: return '📦'
    }
  }

  // 切换背包显示
  toggleInventory(): void {
    const isVisible = this.inventoryContainer.style.display === 'block'
    this.inventoryContainer.style.display = isVisible ? 'none' : 'block'
  }

  showInventory(): void {
    this.inventoryContainer.style.display = 'block'
  }

  hideInventory(): void {
    this.inventoryContainer.style.display = 'none'
  }

  // 显示消息
  showMessage(text: string, duration = 3000): void {
    this.messageContainer.innerHTML = text
    this.messageContainer.style.display = 'block'
    
    if (duration > 0) {
      setTimeout(() => {
        this.messageContainer.style.display = 'none'
      }, duration)
    }
  }

  hideMessage(): void {
    this.messageContainer.style.display = 'none'
  }

  // 显示菜单
  showMenu(): void {
    this.menuContainer.style.display = 'flex'
    this.hudContainer.style.display = 'none'
  }

  hideMenu(): void {
    console.log('[GameUI] hideMenu called')
    this.menuContainer.style.display = 'none'
    this.hudContainer.style.display = 'block'
    console.log('[GameUI] menuContainer display:', this.menuContainer.style.display)
  }

  // 显示设置
  showSettings(): void {
    this.settingsContainer.style.display = 'block'
  }

  hideSettings(): void {
    this.settingsContainer.style.display = 'none'
  }

  // 显示暂停菜单
  showPauseMenu(): void {
    this.showMessage(`
      <div style="font-size: 24px; margin-bottom: 20px;">⏸️ 游戏暂停</div>
      <div style="font-size: 14px; color: #888;">按 ESC 继续游戏</div>
    `, 0)
  }

  // 显示游戏结束
  showGameOver(reason: string): void {
    this.showMessage(`
      <div style="font-size: 36px; color: #ff3333; margin-bottom: 20px;">💀 游戏结束</div>
      <div style="font-size: 16px; color: #888; margin-bottom: 20px;">${reason}</div>
      <button id="restart-btn" style="
        padding: 12px 30px; background: #c9b458; border: none;
        color: #1a1a2e; font-size: 16px; border-radius: 8px; cursor: pointer;
      ">
        重新开始
      </button>
    `, 0)
  }

  // 显示胜利
  showWin(stats: { roomsExplored: number, timeElapsed: number }): void {
    const minutes = Math.floor(stats.timeElapsed / 60)
    const seconds = Math.floor(stats.timeElapsed % 60)
    
    this.showMessage(`
      <div style="font-size: 36px; color: #00ff88; margin-bottom: 20px;">🎉 逃离成功！</div>
      <div style="font-size: 14px; color: #888; margin-bottom: 10px;">
        探索房间: ${stats.roomsExplored} | 用时: ${minutes}分${seconds}秒
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 20px;">
        你成功逃离了后室，回到了现实世界...
      </div>
      <button id="restart-btn" style="
        padding: 12px 30px; background: #c9b458; border: none;
        color: #1a1a2e; font-size: 16px; border-radius: 8px; cursor: pointer;
      ">
        再来一次
      </button>
    `, 0)
  }

  // 获取选中的队友类型
  getSelectedCompanion(): CompanionType {
    const selected = document.querySelector('.companion-btn.selected')
    const type = selected?.getAttribute('data-type') || 'explorer'
    
    switch (type) {
      case 'psychic': return CompanionType.PSYCHIC
      case 'historian': return CompanionType.HISTORIAN
      default: return CompanionType.EXPLORER
    }
  }

  // 设置事件监听
  setupEventListeners(callbacks: {
    onStart: (companionType: CompanionType) => void
    onRestart: () => void
    onSettingsSave: (apiKey: string, difficulty: string) => void
  }): void {
    // 使用container内部查找元素，确保找到正确的元素
    const container = this.container
    
    // 队友选择
    const companionBtns = container.querySelectorAll('.companion-btn')
    companionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        companionBtns.forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
      })
    })
    
    // 开始按钮
    const startBtn = container.querySelector('#start-btn')
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        console.log('开始游戏按钮被点击')
        callbacks.onStart(this.getSelectedCompanion())
      })
    }
    
    // 设置按钮
    const settingsBtn = container.querySelector('#settings-btn')
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.hideMenu()
        this.showSettings()
      })
    }
    
    // 设置保存
    const saveBtn = container.querySelector('#settings-save')
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const apiKey = (container.querySelector('#api-key-input') as HTMLInputElement)?.value || ''
        const difficulty = (container.querySelector('#difficulty-select') as HTMLSelectElement)?.value || 'normal'
        callbacks.onSettingsSave(apiKey, difficulty)
        this.hideSettings()
        this.showMenu()
      })
    }
    
    // 设置取消
    const closeBtn = container.querySelector('#settings-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.hideSettings()
        this.showMenu()
      })
    }
    
    // 重启按钮（动态添加）
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'restart-btn') {
        callbacks.onRestart()
      }
    })
  }

  // 显示拾取提示
  showPickupHint(itemName: string): void {
    this.showMessage(`
      <div style="font-size: 18px;">✨ 获得: ${itemName}</div>
    `, 1500)
  }

  // 显示警告
  showWarning(text: string): void {
    this.showDialogue('⚠️ 警告', text, 3000)
  }

  // 显示重要警告（屏幕中央红色闪烁）
  showCriticalWarning(text: string): void {
    const warning = document.createElement('div')
    warning.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px 40px;
      background: linear-gradient(135deg, rgba(180, 30, 30, 0.95) 0%, rgba(120, 20, 20, 0.9) 100%);
      border: 3px solid #ff4444;
      border-radius: 12px;
      color: #fff;
      font-size: 22px;
      font-weight: bold;
      text-align: center;
      z-index: 9999;
      box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
      animation: warningPulse 0.5s ease-in-out 3;
    `
    warning.textContent = text
    
    // 添加动画样式
    const style = document.createElement('style')
    style.textContent = `
      @keyframes warningPulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.8; }
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(warning)
    
    setTimeout(() => {
      warning.remove()
      style.remove()
    }, 2500)
  }

  // 清理
  destroy(): void {
    this.container.remove()
  }
}
