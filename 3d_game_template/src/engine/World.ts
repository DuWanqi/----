import * as THREE from 'three'

export interface GameObject {
  mesh: THREE.Object3D
  update?(deltaTime: number): void
  destroy?(): void
}

export class World {
  public scene: THREE.Scene
  private objects: Map<string, GameObject> = new Map()
  private nextId = 1

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)
  }

  /**
   * 添加游戏对象
   */
  addObject(obj: THREE.Object3D, updateFn?: (dt: number) => void): string {
    const id = `obj_${this.nextId++}`
    this.scene.add(obj)
    this.objects.set(id, {
      mesh: obj,
      update: updateFn,
    })
    return id
  }

  /**
   * 移除游戏对象
   */
  removeObject(id: string) {
    const obj = this.objects.get(id)
    if (obj) {
      this.scene.remove(obj.mesh)
      obj.destroy?.()
      this.objects.delete(id)
    }
  }

  /**
   * 获取游戏对象
   */
  getObject(id: string): GameObject | undefined {
    return this.objects.get(id)
  }

  /**
   * 更新所有对象
   */
  update(deltaTime: number) {
    for (const obj of this.objects.values()) {
      obj.update?.(deltaTime)
    }
  }

  /**
   * 清空世界
   */
  clear() {
    for (const [id] of this.objects) {
      this.removeObject(id)
    }
    // 清空场景中的其他对象
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0])
    }
  }

  /**
   * 添加环境光
   */
  addAmbientLight(color = 0xffffff, intensity = 0.5) {
    const light = new THREE.AmbientLight(color, intensity)
    this.scene.add(light)
    return light
  }

  /**
   * 添加方向光
   */
  addDirectionalLight(
    color = 0xffffff,
    intensity = 1,
    position = { x: 5, y: 10, z: 5 }
  ) {
    const light = new THREE.DirectionalLight(color, intensity)
    light.position.set(position.x, position.y, position.z)
    light.castShadow = true
    light.shadow.mapSize.width = 2048
    light.shadow.mapSize.height = 2048
    this.scene.add(light)
    return light
  }
}
