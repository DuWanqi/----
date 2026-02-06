export class Input {
  private keysDown: Set<string> = new Set()
  private keysPressed: Set<string> = new Set()
  private keysReleased: Set<string> = new Set()
  
  public mousePosition = { x: 0, y: 0 }
  public mouseButtons: Set<number> = new Set()

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
  }

  /**
   * 检查按键是否按下
   */
  isKeyDown(key: string): boolean {
    return this.keysDown.has(key.toLowerCase())
  }

  /**
   * 检查按键是否刚被按下（本帧）
   */
  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase())
  }

  /**
   * 检查按键是否刚被释放（本帧）
   */
  isKeyReleased(key: string): boolean {
    return this.keysReleased.has(key.toLowerCase())
  }

  /**
   * 获取水平轴输入 (-1, 0, 1)
   */
  getAxis(axis: 'horizontal' | 'vertical'): number {
    if (axis === 'horizontal') {
      let value = 0
      if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) value -= 1
      if (this.isKeyDown('d') || this.isKeyDown('arrowright')) value += 1
      return value
    } else {
      let value = 0
      if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) value -= 1
      if (this.isKeyDown('w') || this.isKeyDown('arrowup')) value += 1
      return value
    }
  }

  /**
   * 检查鼠标按钮是否按下
   */
  isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.has(button)
  }

  /**
   * 每帧结束时调用，清理瞬时状态
   */
  update() {
    this.keysPressed.clear()
    this.keysReleased.clear()
  }

  private onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    if (!this.keysDown.has(key)) {
      this.keysPressed.add(key)
    }
    this.keysDown.add(key)
  }

  private onKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    this.keysDown.delete(key)
    this.keysReleased.add(key)
  }

  private onMouseMove(e: MouseEvent) {
    this.mousePosition.x = e.clientX
    this.mousePosition.y = e.clientY
  }

  private onMouseDown(e: MouseEvent) {
    this.mouseButtons.add(e.button)
  }

  private onMouseUp(e: MouseEvent) {
    this.mouseButtons.delete(e.button)
  }
}
