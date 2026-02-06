// 《逃离后室：山屋惊魂》- 游戏UI系统

import { PlayerState, CompanionState, Item, ItemType, COLORS, GAME_CONFIG, CompanionType, BackroomsLevel } from '../game/types'

// NPC对话回调接口
export interface NPCDialogueCallbacks {
  onSendMessage: (message: string) => void
  onClose: () => void
}

// ========== 教程数据 ==========
// 开发者可在此编辑教程内容
export const TUTORIAL_PAGES = [
  {
    title: '🏚️ 欢迎来到后室',
    content: `
      <p><b>《逃离后室：山屋惊魂》</b>是一款基于后室都市传说的恐怖探索游戏。</p>
      <p>你与AI同伴误入了Level 5层级——一座19世纪的废弃酒店"山屋"。</p>
      <p>这里曾因家族崇拜外神而意外打通了后室通道...</p>
      <p style="color: #ff6666; margin-top: 15px;">⚠️ 你必须在空间循环与实体威胁中寻找出口逃离！</p>
    `
  },
  {
    title: '🎮 基础操作',
    content: `
      <div class="tutorial-keys">
        <div><span class="key">W A S D</span> 或 <span class="key">↑ ↓ ← →</span> - 移动</div>
        <div><span class="key">Shift</span> - 奔跑（会产生噪音）</div>
        <div><span class="key">Space</span> - 拾取地上的物品</div>
        <div><span class="key">I</span> - 打开/关闭背包</div>
        <div><span class="key">E</span> - 互动（开关煤油灯/进入传送门）</div>
        <div><span class="key">ESC</span> - 暂停游戏</div>
      </div>
    `
  },
  {
    title: '👥 队友与NPC',
    content: `
      <p><b>AI队友</b>：会跟随你探索，按 <span class="key">F</span> 与队友交谈获取提示。</p>
      <p>你可以把道具给队友保管，队友信任度越高越愿意帮助你。</p>
      <hr style="border-color: #444; margin: 15px 0;">
      <p><b>房间NPC</b>：某些房间有其他幸存者，按 <span class="key">T</span> 与他们对话。</p>
      <p>通过友好交流提升好感度，好感度≥70%时可能获得赠送的道具！</p>
    `
  },
  {
    title: '🔦 道具系统',
    content: `
      <div class="tutorial-items">
        <div>🥛 <b>杏仁水</b> - 恢复30点精神值</div>
        <div>🔦 <b>煤油灯</b> - 照明，驱赶影怪</div>
        <div>🔑 <b>钥匙</b> - 攻击窃皮者（距离<3m）</div>
        <div>🔥 <b>打火机</b> + 📰 <b>旧报纸</b> → 按 <span class="key">C</span> 合成火把</div>
        <div>🔦 <b>火把</b> - 永久光源，对影怪有5倍驱散效果！</div>
      </div>
    `
  },
  {
    title: '👹 实体威胁',
    content: `
      <div class="tutorial-entities">
        <div><span style="color: #ff4444;">😈 笑魇</span> - 保持安静！发出噪音会被锁定</div>
        <div><span style="color: #8b4513;">🧟 窃皮者</span> - 追击10秒后会消失，用钥匙可击退</div>
        <div><span style="color: #333;">👤 影怪</span> - 仅在黑暗中出现，用灯光驱散</div>
        <div><span style="color: #ff69b4;">🎈 派对客</span> - Level 188特有，触碰即死！</div>
      </div>
    `
  },
  {
    title: '🌀 层级跃迁',
    content: `
      <p>游戏有多个层级可以探索：</p>
      <div style="margin: 10px 0;">
        <div><b>Level 0 - 山屋</b>：起始层级，寻找紫色传送门</div>
        <div><b>Level 188 - 格子房间</b>：规律的网格结构，小心派对客</div>
      </div>
      <p>找到 <span style="color: #9932cc;">🌀 紫色传送门</span> 可以跃迁到其他层级。</p>
      <p>找到 <span style="color: #00ff88;">🚪 绿色出口</span> 即可逃离后室获得胜利！</p>
    `
  },
  {
    title: '💡 生存技巧',
    content: `
      <ul style="padding-left: 20px; line-height: 2;">
        <li>保持精神值 > 0，否则游戏结束</li>
        <li>奔跑会产生噪音，引来实体注意</li>
        <li>探索不同方向发现新房间</li>
        <li>与队友保持良好关系获得帮助</li>
        <li>收集道具以应对各种威胁</li>
        <li>火把是对付影怪的最佳武器</li>
      </ul>
      <p style="text-align: center; margin-top: 15px; color: #c9b458;">祝你好运，探索者！🍀</p>
    `
  }
]

export class GameUI {
  private container: HTMLDivElement
  private hudContainer: HTMLDivElement
  private dialogueContainer: HTMLDivElement
  private inventoryContainer: HTMLDivElement
  private messageContainer: HTMLDivElement
  private menuContainer: HTMLDivElement
  private settingsContainer: HTMLDivElement
  private npcDialogueContainer: HTMLDivElement
  private tutorialContainer: HTMLDivElement
  
  private currentDialogue = ''
  private dialogueTimeout: number | null = null
  private npcDialogueCallbacks: NPCDialogueCallbacks | null = null
  private currentTutorialPage = 0
  private hasShownTutorial = false
  
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
    this.npcDialogueContainer = this.createNPCDialogue()
    this.tutorialContainer = this.createTutorial()
    
    this.container.appendChild(this.hudContainer)
    this.container.appendChild(this.dialogueContainer)
    this.container.appendChild(this.inventoryContainer)
    this.container.appendChild(this.messageContainer)
    this.container.appendChild(this.menuContainer)
    this.container.appendChild(this.settingsContainer)
    this.container.appendChild(this.npcDialogueContainer)
    this.container.appendChild(this.tutorialContainer)
    
    // 添加教程样式
    this.addTutorialStyles()
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
        
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button id="tutorial-btn" style="
            padding: 10px 25px; background: transparent; border: 1px solid #9932cc;
            color: #da70d6; font-size: 14px; border-radius: 5px; cursor: pointer;
            transition: all 0.3s;
          ">
            📖 教程
          </button>
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
    
    // 修复输入框焦点问题 - 阻止事件传播
    setTimeout(() => {
      const apiKeyInput = settings.querySelector('#api-key-input') as HTMLInputElement
      if (apiKeyInput) {
        // 阻止所有可能导致失焦的事件传播
        const stopPropagation = (e: Event) => e.stopPropagation()
        apiKeyInput.addEventListener('mousedown', stopPropagation)
        apiKeyInput.addEventListener('mouseup', stopPropagation)
        apiKeyInput.addEventListener('click', (e) => {
          e.stopPropagation()
          apiKeyInput.focus()
        })
        apiKeyInput.addEventListener('keydown', stopPropagation)
        apiKeyInput.addEventListener('keyup', stopPropagation)
        apiKeyInput.addEventListener('keypress', stopPropagation)
        apiKeyInput.addEventListener('input', stopPropagation)
        apiKeyInput.addEventListener('focus', stopPropagation)
        apiKeyInput.addEventListener('blur', (e) => {
          e.stopPropagation()
          // 如果设置面板仍然可见，重新聚焦
          if (settings.style.display !== 'none') {
            setTimeout(() => apiKeyInput.focus(), 10)
          }
        })
      }
      
      // 同样处理难度选择框
      const difficultySelect = settings.querySelector('#difficulty-select') as HTMLSelectElement
      if (difficultySelect) {
        const stopPropagation = (e: Event) => e.stopPropagation()
        difficultySelect.addEventListener('mousedown', stopPropagation)
        difficultySelect.addEventListener('mouseup', stopPropagation)
        difficultySelect.addEventListener('click', stopPropagation)
        difficultySelect.addEventListener('change', stopPropagation)
        difficultySelect.addEventListener('focus', stopPropagation)
      }
    }, 0)
    
    return settings
  }

  // 创建教程弹窗
  private createTutorial(): HTMLDivElement {
    const tutorial = document.createElement('div')
    tutorial.id = 'tutorial-panel'
    tutorial.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      max-height: 85vh;
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(30, 25, 40, 0.95) 100%);
      border: 2px solid rgba(153, 50, 204, 0.6);
      border-radius: 16px;
      color: #e0d5c0;
      display: none;
      pointer-events: auto;
      box-shadow: 0 10px 50px rgba(153, 50, 204, 0.5);
      flex-direction: column;
    `
    tutorial.innerHTML = `
      <div style="padding: 20px; border-bottom: 1px solid rgba(153, 50, 204, 0.3); flex-shrink: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 id="tutorial-title" style="margin: 0; color: #da70d6; font-size: 22px;"></h2>
          <button id="tutorial-close" style="
            background: transparent; border: 1px solid #666; color: #888;
            padding: 5px 15px; border-radius: 4px; cursor: pointer; font-size: 12px;
          ">关闭 (ESC)</button>
        </div>
        <div style="margin-top: 10px; color: #888; font-size: 12px;">
          页面 <span id="tutorial-page-num">1</span> / <span id="tutorial-page-total">${TUTORIAL_PAGES.length}</span>
        </div>
      </div>
      
      <div id="tutorial-content" style="
        padding: 25px;
        min-height: 200px;
        flex: 1;
        overflow-y: auto;
        font-size: 15px;
        line-height: 1.8;
      "></div>
      
      <div style="padding: 20px; border-top: 1px solid rgba(153, 50, 204, 0.3); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <button id="tutorial-prev" style="
          padding: 10px 25px; background: rgba(153, 50, 204, 0.2); border: 1px solid rgba(153, 50, 204, 0.5);
          color: #da70d6; font-size: 14px; border-radius: 6px; cursor: pointer;
          transition: all 0.2s;
        ">⬅️ 上一页</button>
        
        <div id="tutorial-dots" style="display: flex; gap: 8px;"></div>
        
        <button id="tutorial-next" style="
          padding: 10px 25px; background: linear-gradient(135deg, #9932cc, #7b2da0);
          border: none; color: white; font-size: 14px; border-radius: 6px; cursor: pointer;
          transition: all 0.2s;
        ">下一页 ➡️</button>
      </div>
    `
    return tutorial
  }

  // 添加教程样式
  private addTutorialStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      #tutorial-content .key {
        display: inline-block;
        padding: 2px 8px;
        background: rgba(135, 206, 235, 0.2);
        border: 1px solid rgba(135, 206, 235, 0.5);
        border-radius: 4px;
        color: #87ceeb;
        font-family: monospace;
        font-weight: bold;
        font-size: 13px;
      }
      
      #tutorial-content .tutorial-keys > div {
        padding: 8px 0;
        border-bottom: 1px solid rgba(100, 100, 100, 0.2);
      }
      
      #tutorial-content .tutorial-keys > div:last-child {
        border-bottom: none;
      }
      
      #tutorial-content .tutorial-items > div,
      #tutorial-content .tutorial-entities > div {
        padding: 8px 12px;
        margin: 5px 0;
        background: rgba(50, 50, 60, 0.3);
        border-radius: 6px;
        border-left: 3px solid rgba(153, 50, 204, 0.6);
      }
      
      #tutorial-content p {
        margin: 10px 0;
      }
      
      #tutorial-content hr {
        border: none;
        border-top: 1px solid #444;
        margin: 15px 0;
      }
      
      .tutorial-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #444;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .tutorial-dot.active {
        background: #da70d6;
        transform: scale(1.2);
      }
      
      .tutorial-dot:hover {
        background: #9932cc;
      }
      
      #tutorial-prev:disabled,
      #tutorial-next:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      #tutorial-content::-webkit-scrollbar {
        width: 6px;
      }
      
      #tutorial-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      
      #tutorial-content::-webkit-scrollbar-thumb {
        background: rgba(153, 50, 204, 0.5);
        border-radius: 3px;
      }
    `
    document.head.appendChild(style)
  }

  // 显示教程
  showTutorial(startPage = 0): void {
    this.currentTutorialPage = startPage
    this.tutorialContainer.style.display = 'flex'
    this.updateTutorialPage()
    this.setupTutorialEvents()
  }

  // 隐藏教程
  hideTutorial(): void {
    this.tutorialContainer.style.display = 'none'
  }

  // 更新教程页面
  private updateTutorialPage(): void {
    const page = TUTORIAL_PAGES[this.currentTutorialPage]
    if (!page) return

    const titleEl = document.getElementById('tutorial-title')
    const contentEl = document.getElementById('tutorial-content')
    const pageNumEl = document.getElementById('tutorial-page-num')
    const dotsEl = document.getElementById('tutorial-dots')
    const prevBtn = document.getElementById('tutorial-prev') as HTMLButtonElement
    const nextBtn = document.getElementById('tutorial-next') as HTMLButtonElement

    if (titleEl) titleEl.textContent = page.title
    if (contentEl) contentEl.innerHTML = page.content
    if (pageNumEl) pageNumEl.textContent = String(this.currentTutorialPage + 1)

    // 更新导航点
    if (dotsEl) {
      dotsEl.innerHTML = TUTORIAL_PAGES.map((_, i) => `
        <div class="tutorial-dot ${i === this.currentTutorialPage ? 'active' : ''}" data-page="${i}"></div>
      `).join('')
      
      // 添加点击事件
      dotsEl.querySelectorAll('.tutorial-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          const target = e.target as HTMLElement
          const pageIndex = parseInt(target.dataset.page || '0')
          this.currentTutorialPage = pageIndex
          this.updateTutorialPage()
        })
      })
    }

    // 更新按钮状态
    if (prevBtn) {
      prevBtn.disabled = this.currentTutorialPage === 0
      prevBtn.style.opacity = this.currentTutorialPage === 0 ? '0.5' : '1'
    }
    if (nextBtn) {
      const isLastPage = this.currentTutorialPage === TUTORIAL_PAGES.length - 1
      nextBtn.textContent = isLastPage ? '开始游戏 🎮' : '下一页 ➡️'
    }
  }

  // 设置教程事件
  private setupTutorialEvents(): void {
    const closeBtn = document.getElementById('tutorial-close')
    const prevBtn = document.getElementById('tutorial-prev')
    const nextBtn = document.getElementById('tutorial-next')

    if (closeBtn) {
      closeBtn.onclick = () => this.hideTutorial()
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        if (this.currentTutorialPage > 0) {
          this.currentTutorialPage--
          this.updateTutorialPage()
        }
      }
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        if (this.currentTutorialPage < TUTORIAL_PAGES.length - 1) {
          this.currentTutorialPage++
          this.updateTutorialPage()
        } else {
          // 最后一页，关闭教程
          this.hideTutorial()
        }
      }
    }

    // ESC 关闭
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.tutorialContainer.style.display === 'block') {
        this.hideTutorial()
        window.removeEventListener('keydown', escHandler)
      }
    }
    window.addEventListener('keydown', escHandler)
  }

  // 检查是否需要显示开屏教程
  shouldShowTutorialOnStart(): boolean {
    // 检查 localStorage 是否已经看过教程
    const hasSeenTutorial = localStorage.getItem('backrooms_tutorial_seen')
    return !hasSeenTutorial
  }

  // 标记教程已看过
  markTutorialAsSeen(): void {
    localStorage.setItem('backrooms_tutorial_seen', 'true')
  }

  // 显示开屏教程（首次打开游戏时）
  showTutorialIfNeeded(): void {
    if (this.shouldShowTutorialOnStart() && !this.hasShownTutorial) {
      this.hasShownTutorial = true
      this.showTutorial(0)
      this.markTutorialAsSeen()
    }
  }

  private createNPCDialogue(): HTMLDivElement {
    const npcDialogue = document.createElement('div')
    npcDialogue.id = 'npc-dialogue'
    npcDialogue.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      max-height: 80vh;
      padding: 20px;
      background: linear-gradient(135deg, rgba(25, 25, 35, 0.98) 0%, rgba(45, 40, 55, 0.95) 100%);
      border: 2px solid rgba(153, 50, 204, 0.6);
      border-radius: 12px;
      color: #e0d5c0;
      display: none;
      pointer-events: auto;
      box-shadow: 0 8px 40px rgba(153, 50, 204, 0.4);
      flex-direction: column;
    `
    npcDialogue.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; 
                  border-bottom: 1px solid rgba(153, 50, 204, 0.4); padding-bottom: 10px; flex-shrink: 0;">
        <div>
          <span id="npc-name" style="font-size: 18px; font-weight: bold; color: #da70d6;">NPC名称</span>
          <span id="npc-type" style="font-size: 12px; color: #888; margin-left: 10px;">类型</span>
        </div>
        <button id="npc-close-btn" style="
          background: transparent; border: 1px solid #666; color: #888;
          padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;
        ">关闭 (ESC)</button>
      </div>
      
      <div id="npc-disposition" style="margin-bottom: 15px; flex-shrink: 0;">
        <span style="color: #888; font-size: 12px;">好感度：</span>
        <div style="display: inline-block; width: 150px; height: 8px; background: #333; border-radius: 4px; overflow: hidden; vertical-align: middle;">
          <div id="npc-disposition-bar" style="width: 50%; height: 100%; background: linear-gradient(90deg, #9932cc, #da70d6); transition: width 0.3s;"></div>
        </div>
        <span id="npc-disposition-text" style="color: #da70d6; margin-left: 8px; font-size: 12px;">50%</span>
      </div>
      
      <div id="npc-inventory-preview" style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; flex-shrink: 0;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">📦 携带道具：</div>
        <div id="npc-items" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
      </div>
      
      <div id="npc-chat-history" style="
        flex: 1; min-height: 120px; max-height: 200px; overflow-y: auto; margin-bottom: 15px; padding: 10px;
        background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 14px; line-height: 1.6;
      "></div>
      
      <div style="display: flex; gap: 10px; flex-shrink: 0;">
        <input id="npc-input" type="text" placeholder="输入你想说的话..." style="
          flex: 1; padding: 12px 15px; background: rgba(0,0,0,0.3); border: 1px solid rgba(153, 50, 204, 0.4);
          border-radius: 6px; color: #e0d5c0; font-size: 14px; outline: none;
        ">
        <button id="npc-send-btn" style="
          padding: 12px 25px; background: linear-gradient(135deg, #9932cc, #7b2da0);
          border: none; color: white; font-size: 14px; border-radius: 6px; cursor: pointer;
          transition: all 0.2s;
        ">发送</button>
      </div>
      
      <div style="margin-top: 10px; font-size: 11px; color: #666; text-align: center; flex-shrink: 0;">
        提示：友好交流可以提升好感度，好感度达到70%以上时NPC可能会赠送道具
      </div>
    `
    return npcDialogue
  }

  // 显示NPC对话界面
  showNPCDialogue(
    npcName: string, 
    npcType: string, 
    disposition: number, 
    items: { name: string, description: string }[],
    chatHistory: string[],
    callbacks: NPCDialogueCallbacks
  ): void {
    this.npcDialogueCallbacks = callbacks
    this.npcDialogueContainer.style.display = 'flex'
    
    // 更新NPC信息
    const nameEl = document.getElementById('npc-name')
    const typeEl = document.getElementById('npc-type')
    if (nameEl) nameEl.textContent = npcName
    if (typeEl) typeEl.textContent = `(${npcType})`
    
    // 更新好感度
    this.updateNPCDisposition(disposition)
    
    // 更新道具列表
    const itemsEl = document.getElementById('npc-items')
    if (itemsEl) {
      if (items.length === 0) {
        itemsEl.innerHTML = '<span style="color: #666;">无</span>'
      } else {
        itemsEl.innerHTML = items.map(item => `
          <div style="padding: 5px 10px; background: rgba(153, 50, 204, 0.2); border-radius: 4px; 
                      border: 1px solid rgba(153, 50, 204, 0.3);" title="${item.description}">
            ${item.name}
          </div>
        `).join('')
      }
    }
    
    // 更新聊天历史
    this.updateNPCChatHistory(chatHistory)
    
    // 设置事件监听
    this.setupNPCDialogueEvents()
    
    // 阻止对话框容器上的事件冒泡到游戏场景
    this.npcDialogueContainer.onmousedown = (e) => {
      e.stopPropagation()
    }
    this.npcDialogueContainer.onkeydown = (e) => {
      e.stopPropagation()
    }
    this.npcDialogueContainer.onkeyup = (e) => {
      e.stopPropagation()
    }
    
    // 延迟聚焦输入框（确保DOM完全渲染后）
    setTimeout(() => {
      const inputEl = document.getElementById('npc-input') as HTMLInputElement
      if (inputEl) {
        inputEl.value = ''
        inputEl.focus()
      }
    }, 100)
  }

  // 更新NPC好感度显示
  updateNPCDisposition(disposition: number): void {
    const barEl = document.getElementById('npc-disposition-bar')
    const textEl = document.getElementById('npc-disposition-text')
    
    if (barEl) {
      barEl.style.width = `${disposition}%`
      // 根据好感度改变颜色
      if (disposition >= 70) {
        barEl.style.background = 'linear-gradient(90deg, #00ff88, #00cc66)'
      } else if (disposition >= 50) {
        barEl.style.background = 'linear-gradient(90deg, #ffaa00, #ff8800)'
      } else {
        barEl.style.background = 'linear-gradient(90deg, #9932cc, #da70d6)'
      }
    }
    
    if (textEl) {
      textEl.textContent = `${Math.round(disposition)}%`
      if (disposition >= 70) {
        textEl.style.color = '#00ff88'
      } else if (disposition >= 50) {
        textEl.style.color = '#ffaa00'
      } else {
        textEl.style.color = '#da70d6'
      }
    }
  }

  // 更新NPC聊天历史
  updateNPCChatHistory(history: string[]): void {
    const historyEl = document.getElementById('npc-chat-history')
    if (historyEl) {
      historyEl.innerHTML = history.map(msg => {
        const isPlayer = msg.startsWith('玩家:') || msg.startsWith('玩家：')
        return `<div style="margin-bottom: 8px; ${isPlayer ? 'text-align: right;' : ''}">
          <span style="
            display: inline-block; padding: 6px 12px; border-radius: 8px; max-width: 80%;
            background: ${isPlayer ? 'rgba(100, 100, 200, 0.3)' : 'rgba(153, 50, 204, 0.2)'};
          ">${msg}</span>
        </div>`
      }).join('')
      
      // 滚动到底部
      historyEl.scrollTop = historyEl.scrollHeight
    }
  }

  // 添加新的聊天消息
  addNPCChatMessage(message: string, isPlayer: boolean): void {
    const historyEl = document.getElementById('npc-chat-history')
    if (historyEl) {
      const msgDiv = document.createElement('div')
      msgDiv.style.marginBottom = '8px'
      if (isPlayer) msgDiv.style.textAlign = 'right'
      
      msgDiv.innerHTML = `<span style="
        display: inline-block; padding: 6px 12px; border-radius: 8px; max-width: 80%;
        background: ${isPlayer ? 'rgba(100, 100, 200, 0.3)' : 'rgba(153, 50, 204, 0.2)'};
      ">${message}</span>`
      
      historyEl.appendChild(msgDiv)
      historyEl.scrollTop = historyEl.scrollHeight
    }
  }

  // 设置NPC对话事件
  private setupNPCDialogueEvents(): void {
    const closeBtn = document.getElementById('npc-close-btn')
    const sendBtn = document.getElementById('npc-send-btn')
    const inputEl = document.getElementById('npc-input') as HTMLInputElement
    
    // 关闭按钮 - 先保存回调再关闭
    if (closeBtn) {
      closeBtn.onclick = () => {
        const callbacks = this.npcDialogueCallbacks
        this.hideNPCDialogue()
        callbacks?.onClose()
      }
    }
    
    // 发送按钮
    if (sendBtn) {
      sendBtn.onclick = () => {
        this.sendNPCMessage()
      }
    }
    
    // 输入框事件处理
    if (inputEl) {
      // 阻止所有键盘事件冒泡
      inputEl.onkeydown = (e) => {
        e.stopPropagation()
        
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          this.sendNPCMessage()
        } else if (e.key === 'Escape') {
          const callbacks = this.npcDialogueCallbacks
          this.hideNPCDialogue()
          callbacks?.onClose()
        }
      }
      
      inputEl.onkeyup = (e) => {
        e.stopPropagation()
      }
      
      inputEl.onkeypress = (e) => {
        e.stopPropagation()
      }
      
      // 点击输入框时确保获取焦点
      inputEl.onclick = (e) => {
        e.stopPropagation()
        inputEl.focus()
      }
      
      // 防止点击输入框时焦点丢失
      inputEl.onmousedown = (e) => {
        e.stopPropagation()
      }
      
      inputEl.onmouseup = (e) => {
        e.stopPropagation()
      }
      
      // 防止失去焦点（除非是点击其他输入元素）
      inputEl.onblur = () => {
        // 延迟重新聚焦，除非对话框已关闭
        setTimeout(() => {
          if (this.npcDialogueContainer.style.display === 'flex') {
            const activeEl = document.activeElement
            // 如果当前焦点不在其他输入元素上，重新聚焦
            if (!(activeEl instanceof HTMLInputElement) && !(activeEl instanceof HTMLTextAreaElement)) {
              inputEl.focus()
            }
          }
        }, 10)
      }
    }
  }

  // 发送NPC消息
  private sendNPCMessage(): void {
    const inputEl = document.getElementById('npc-input') as HTMLInputElement
    if (inputEl && inputEl.value.trim()) {
      const message = inputEl.value.trim()
      inputEl.value = ''
      this.npcDialogueCallbacks?.onSendMessage(message)
    }
  }

  // 隐藏NPC对话界面
  hideNPCDialogue(): void {
    this.npcDialogueContainer.style.display = 'none'
    this.npcDialogueCallbacks = null
  }

  // 检查NPC对话是否打开
  isNPCDialogueOpen(): boolean {
    return this.npcDialogueContainer.style.display === 'flex'
  }

  // 更新NPC道具显示
  updateNPCItems(items: { name: string, description: string }[]): void {
    const itemsEl = document.getElementById('npc-items')
    if (itemsEl) {
      if (items.length === 0) {
        itemsEl.innerHTML = '<span style="color: #666;">无</span>'
      } else {
        itemsEl.innerHTML = items.map(item => `
          <div style="padding: 5px 10px; background: rgba(153, 50, 204, 0.2); border-radius: 4px; 
                      border: 1px solid rgba(153, 50, 204, 0.3);" title="${item.description}">
            ${item.name}
          </div>
        `).join('')
      }
    }
  }

  // 显示层级信息
  showLevelInfo(level: BackroomsLevel): void {
    const levelName = level === BackroomsLevel.LEVEL_0 ? 'Level 0 - 山屋' : 'Level 188 - 格子房间'
    this.showMessage(`
      <div style="font-size: 24px; margin-bottom: 10px;">🌀 层级跃迁</div>
      <div style="font-size: 16px; color: #da70d6;">${levelName}</div>
    `, 2500)
  }

  // 更新HUD
  updateHUD(player: PlayerState, companion: CompanionState, roomsExplored: number, currentLevel?: BackroomsLevel): void {
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
      case ItemType.TORCH: return '🔦'
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
      <div style="font-size: 28px; margin-bottom: 25px; color: #c9b458;">⏸️ 游戏暂停</div>
      
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
        <button id="pause-resume-btn" style="
          padding: 12px 40px; background: linear-gradient(135deg, #c9b458, #a89438);
          border: none; color: #1a1a2e; font-size: 16px; font-weight: bold;
          border-radius: 8px; cursor: pointer; transition: all 0.2s;
        ">
          ▶️ 继续游戏
        </button>
        
        <button id="pause-tutorial-btn" style="
          padding: 12px 40px; background: rgba(153, 50, 204, 0.2);
          border: 1px solid rgba(153, 50, 204, 0.6); color: #da70d6; font-size: 14px;
          border-radius: 8px; cursor: pointer; transition: all 0.2s;
        ">
          📖 查看教程
        </button>
        
        <button id="pause-mainmenu-btn" style="
          padding: 12px 40px; background: transparent;
          border: 1px solid #666; color: #888; font-size: 14px;
          border-radius: 8px; cursor: pointer; transition: all 0.2s;
        ">
          🏠 返回主菜单
        </button>
      </div>
      
      <div style="font-size: 12px; color: #666; margin-top: 10px;">
        提示：按 ESC 也可以继续游戏
      </div>
    `, 0)
    
    // 设置暂停菜单按钮事件
    this.setupPauseMenuEvents()
  }
  
  // 设置暂停菜单事件
  private setupPauseMenuEvents(): void {
    setTimeout(() => {
      const resumeBtn = document.getElementById('pause-resume-btn')
      const tutorialBtn = document.getElementById('pause-tutorial-btn')
      const mainMenuBtn = document.getElementById('pause-mainmenu-btn')
      
      if (resumeBtn) {
        resumeBtn.onclick = () => {
          this.pauseMenuCallbacks?.onResume()
        }
      }
      
      if (tutorialBtn) {
        tutorialBtn.onclick = () => {
          this.showTutorial(0)
        }
      }
      
      if (mainMenuBtn) {
        mainMenuBtn.onclick = () => {
          if (confirm('确定要返回主菜单吗？当前游戏进度将丢失！')) {
            this.pauseMenuCallbacks?.onMainMenu()
          }
        }
      }
    }, 50)
  }
  
  // 暂停菜单回调
  private pauseMenuCallbacks: { onResume: () => void, onMainMenu: () => void } | null = null
  
  // 设置暂停菜单回调
  setPauseMenuCallbacks(callbacks: { onResume: () => void, onMainMenu: () => void }): void {
    this.pauseMenuCallbacks = callbacks
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
    
    // 教程按钮
    const tutorialBtn = container.querySelector('#tutorial-btn')
    if (tutorialBtn) {
      tutorialBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.showTutorial(0)
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

  // 窃皮者追击警告 - 显示在HUD上
  private skinStealerWarningEl: HTMLDivElement | null = null
  private lastSkinStealerTime = -1
  
  updateSkinStealerWarning(remainingSeconds: number): void {
    // 避免重复显示相同时间
    if (remainingSeconds === this.lastSkinStealerTime) return
    this.lastSkinStealerTime = remainingSeconds
    
    // 创建或更新警告元素
    if (!this.skinStealerWarningEl) {
      this.skinStealerWarningEl = document.createElement('div')
      this.skinStealerWarningEl.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 20px;
        background: rgba(80, 40, 10, 0.5);
        border: 1px solid rgba(205, 133, 63, 0.6);
        border-radius: 6px;
        color: #ffd700;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        z-index: 200;
        pointer-events: none;
      `
      this.container.appendChild(this.skinStealerWarningEl)
    }
    
    this.skinStealerWarningEl.style.display = 'block'
    this.skinStealerWarningEl.innerHTML = `
      🔪 窃皮者追击中！剩余 <span style="color: #ff4444; font-size: 16px;">${remainingSeconds}</span> 秒
      <span style="font-size: 11px; color: #ccc; margin-left: 10px;">按I用钥匙攻击</span>
    `
    
    // 如果时间到了，隐藏警告
    if (remainingSeconds <= 0) {
      this.hideSkinStealerWarning()
    }
  }
  
  hideSkinStealerWarning(): void {
    if (this.skinStealerWarningEl) {
      this.skinStealerWarningEl.style.display = 'none'
    }
    this.lastSkinStealerTime = -1
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
