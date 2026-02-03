// 《逃离后室：山屋惊魂》- 实体系统（笑魇、窃皮者、影怪等）

import * as THREE from 'three'
import { EntityType, Position, COLORS, GAME_CONFIG } from '../game/types'

export interface EntityBehavior {
  update(deltaTime: number, playerPos: Position, playerNoiseLevel: number, hasLight: boolean): void
  canDamagePlayer(): boolean
  getDamage(): number
  isActive(): boolean
}

// 实体基类
export abstract class BaseEntity implements EntityBehavior {
  public mesh: THREE.Group
  public type: EntityType
  public position: Position
  protected isActiveState = true
  protected damageAmount = 10
  
  constructor(type: EntityType, position: Position) {
    this.type = type
    this.position = { ...position }
    this.mesh = new THREE.Group()
    this.createMesh()
    this.mesh.position.set(position.x, 0, position.z)
  }
  
  protected abstract createMesh(): void
  
  abstract update(deltaTime: number, playerPos: Position, playerNoiseLevel: number, hasLight: boolean): void
  
  canDamagePlayer(): boolean {
    return this.isActiveState
  }
  
  getDamage(): number {
    return this.damageAmount
  }
  
  isActive(): boolean {
    return this.isActiveState
  }
  
  deactivate(): void {
    this.isActiveState = false
    this.mesh.visible = false
  }
  
  getDistanceToPlayer(playerPos: Position): number {
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    return Math.sqrt(dx * dx + dz * dz)
  }
}

// 笑魇 - 仅触发窃笑音效，保持安静即可规避
export class Smiler extends BaseEntity {
  private eyesMesh: THREE.Mesh | null = null
  private eyeMaterial: THREE.MeshBasicMaterial | null = null
  private isTriggered = false
  private triggerTimer = 0
  private lockTimer = 0
  
  constructor(position: Position) {
    super(EntityType.SMILER, position)
    this.damageAmount = 0 // 笑魇不直接造成伤害，而是锁定空间
  }
  
  protected createMesh(): void {
    try {
      // 黑暗中的眼睛和嘴巴
      const group = new THREE.Group()
      
      // 两只红色眼睛
      const eyeGeom = new THREE.SphereGeometry(0.1, 8, 8)
      const eyeMat = new THREE.MeshBasicMaterial({ 
        color: COLORS.smiler || 0xff0000,
        transparent: true,
        opacity: 1.0
      })
      this.eyeMaterial = eyeMat  // 保存材质引用
      
      const leftEye = new THREE.Mesh(eyeGeom, eyeMat)
      leftEye.position.set(-0.2, 1.5, 0)
      group.add(leftEye)
      this.eyesMesh = leftEye  // 保存眼睛引用
      
      const rightEye = new THREE.Mesh(eyeGeom, eyeMat)
      rightEye.position.set(0.2, 1.5, 0)
      group.add(rightEye)
      
      // 笑容（弧形）
      const smileGeom = new THREE.TorusGeometry(0.25, 0.03, 8, 16, Math.PI)
      const smileMat = new THREE.MeshBasicMaterial({ color: COLORS.smiler || 0xff0000 })
      const smile = new THREE.Mesh(smileGeom, smileMat)
      smile.position.set(0, 1.2, 0.1)
      smile.rotation.x = Math.PI
      group.add(smile)
      
      this.mesh.add(group)
      
      // 初始可见
      this.mesh.visible = true
    } catch (error) {
      console.error('Smiler createMesh error:', error)
    }
  }
  
  update(deltaTime: number, playerPos: Position, playerNoiseLevel: number, hasLight: boolean): void {
    // 安全检查
    if (!this.eyeMaterial) {
      return  // 如果材质未初始化，跳过更新
    }
    
    const dist = this.getDistanceToPlayer(playerPos)
    
    // 笑魇总是可见的
    this.mesh.visible = true
    
    // 面向玩家
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    this.mesh.rotation.y = Math.atan2(dx, dz)
    
    // 根据距离和灯光调整亮度
    if (dist < 6) {
      // 玩家靠近时眼睛更亮
      const baseIntensity = hasLight ? 0.3 : 1.0
      const flickerIntensity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2
      this.eyeMaterial.opacity = baseIntensity * flickerIntensity
      
      // 检测噪音（发出声音会激怒笑魇）
      if (playerNoiseLevel > 30 && !hasLight) {
        this.isTriggered = true
        this.lockTimer = 5 // 锁定5秒
      }
    } else {
      // 远处时眼睛微弱闪烁
      this.eyeMaterial.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2
    }
    
    // 锁定倒计时
    if (this.lockTimer > 0) {
      this.lockTimer -= deltaTime
    }
  }
  
  isPlayerLocked(): boolean {
    return this.lockTimer > 0
  }
  
  canDamagePlayer(): boolean {
    return false // 笑魇不直接伤害
  }
}

// 窃皮者 - 伪装成蜷缩人影，靠近时可用钥匙攻击
export class SkinStealer extends BaseEntity {
  private isRevealed = false
  private attackCooldown = 0
  
  constructor(position: Position) {
    super(EntityType.SKIN_STEALER, position)
    this.damageAmount = 25
  }
  
  protected createMesh(): void {
    // 蜷缩的人形
    const group = new THREE.Group()
    
    // 身体（蜷缩状）
    const bodyGeom = new THREE.SphereGeometry(0.4, 16, 16)
    bodyGeom.scale(1, 0.6, 0.8)
    const bodyMat = new THREE.MeshLambertMaterial({ 
      color: COLORS.skinStealer,
    })
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.position.y = 0.3
    body.castShadow = true
    group.add(body)
    
    // 头部（藏在身体里）
    const headGeom = new THREE.SphereGeometry(0.2, 16, 16)
    const headMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a })
    const head = new THREE.Mesh(headGeom, headMat)
    head.position.set(0, 0.5, 0.2)
    group.add(head)
    
    this.mesh.add(group)
  }
  
  update(deltaTime: number, playerPos: Position, playerNoiseLevel: number, hasLight: boolean): void {
    const dist = this.getDistanceToPlayer(playerPos)
    
    // 更新攻击冷却
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime
    }
    
    // 玩家靠近时"觉醒"
    if (dist < 2 && !this.isRevealed) {
      this.isRevealed = true
      // 站起来的动画
      this.mesh.scale.y = 1.5
      this.mesh.position.y = 0.3
    }
    
    // 觉醒后追逐玩家
    if (this.isRevealed && dist > 0.5) {
      const speed = 2 * deltaTime
      const dx = playerPos.x - this.position.x
      const dz = playerPos.z - this.position.z
      const len = Math.sqrt(dx * dx + dz * dz)
      
      this.position.x += (dx / len) * speed
      this.position.z += (dz / len) * speed
      
      this.mesh.position.x = this.position.x
      this.mesh.position.z = this.position.z
      this.mesh.rotation.y = Math.atan2(dx, dz)
    }
  }
  
  canDamagePlayer(): boolean {
    const canAttack = this.isRevealed && this.attackCooldown <= 0
    if (canAttack) {
      this.attackCooldown = 2 // 2秒攻击间隔
    }
    return canAttack
  }
  
  // 被钥匙攻击
  hitByKey(): void {
    this.deactivate()
  }
}

// 影怪 - 仅在黑暗中出现，光源可驱散
export class Shadow extends BaseEntity {
  private fadeAmount = 1
  
  constructor(position: Position) {
    super(EntityType.SHADOW, position)
    this.damageAmount = 5 // 持续扣减精神值
  }
  
  protected createMesh(): void {
    // 模糊的黑影
    const group = new THREE.Group()
    
    // 使用多个重叠的平面创建阴影效果
    const shadowMat = new THREE.MeshBasicMaterial({ 
      color: COLORS.shadow,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    
    for (let i = 0; i < 3; i++) {
      const planeGeom = new THREE.PlaneGeometry(0.8 - i * 0.2, 1.5 - i * 0.3)
      const plane = new THREE.Mesh(planeGeom, shadowMat.clone())
      plane.position.z = i * 0.1
      plane.position.y = 0.8
      group.add(plane)
    }
    
    this.mesh.add(group)
  }
  
  update(deltaTime: number, playerPos: Position, playerNoiseLevel: number, hasLight: boolean): void {
    // 有光时消散
    if (hasLight) {
      this.fadeAmount = Math.max(0, this.fadeAmount - deltaTime * 2)
    } else {
      this.fadeAmount = Math.min(1, this.fadeAmount + deltaTime * 0.5)
    }
    
    // 更新透明度
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).opacity = this.fadeAmount * 0.7
      }
    })
    
    // 如果完全消散则失活
    if (this.fadeAmount <= 0) {
      this.isActiveState = false
      this.mesh.visible = false
    } else {
      this.mesh.visible = true
      
      // 缓慢飘向玩家
      const dist = this.getDistanceToPlayer(playerPos)
      if (dist > 1) {
        const speed = 0.5 * deltaTime * this.fadeAmount
        const dx = playerPos.x - this.position.x
        const dz = playerPos.z - this.position.z
        const len = Math.sqrt(dx * dx + dz * dz)
        
        this.position.x += (dx / len) * speed
        this.position.z += (dz / len) * speed
        
        this.mesh.position.x = this.position.x
        this.mesh.position.z = this.position.z
      }
    }
    
    // 飘动效果
    this.mesh.position.y = 0.2 + Math.sin(Date.now() * 0.002) * 0.1
  }
  
  canDamagePlayer(): boolean {
    return this.isActiveState && this.fadeAmount > 0.5
  }
  
  getDamage(): number {
    return this.damageAmount * this.fadeAmount
  }
}

// 派对客 - Level Fun的陷阱实体
export class Partygoer extends BaseEntity {
  private waveOffset = 0
  
  constructor(position: Position) {
    super(EntityType.PARTYGOER, position)
    this.damageAmount = 50 // 触碰即死
  }
  
  protected createMesh(): void {
    const group = new THREE.Group()
    
    // 穿着派对服装的人形
    const bodyGeom = new THREE.BoxGeometry(0.5, 1, 0.3)
    const bodyMat = new THREE.MeshLambertMaterial({ 
      color: 0xffff00, // 黄色派对服
      emissive: 0xffff00,
      emissiveIntensity: 0.3
    })
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.position.y = 0.6
    group.add(body)
    
    // 笑脸气球头
    const headGeom = new THREE.SphereGeometry(0.25, 16, 16)
    const headMat = new THREE.MeshLambertMaterial({ 
      color: 0xff69b4,
      emissive: 0xff69b4,
      emissiveIntensity: 0.2
    })
    const head = new THREE.Mesh(headGeom, headMat)
    head.position.y = 1.3
    group.add(head)
    
    // 眼睛（X形）
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const eyeGeom = new THREE.BoxGeometry(0.05, 0.15, 0.02)
    
    const leftEye1 = new THREE.Mesh(eyeGeom, eyeMat)
    leftEye1.position.set(-0.1, 1.35, 0.2)
    leftEye1.rotation.z = Math.PI / 4
    group.add(leftEye1)
    
    const leftEye2 = new THREE.Mesh(eyeGeom, eyeMat)
    leftEye2.position.set(-0.1, 1.35, 0.2)
    leftEye2.rotation.z = -Math.PI / 4
    group.add(leftEye2)
    
    this.mesh.add(group)
  }
  
  update(deltaTime: number, playerPos: Position, playerNoiseLevel: number, hasLight: boolean): void {
    // 挥手动画
    this.waveOffset += deltaTime * 5
    this.mesh.rotation.z = Math.sin(this.waveOffset) * 0.1
    
    // 缓慢靠近玩家
    const dist = this.getDistanceToPlayer(playerPos)
    if (dist > 2) {
      const speed = 1.5 * deltaTime
      const dx = playerPos.x - this.position.x
      const dz = playerPos.z - this.position.z
      const len = Math.sqrt(dx * dx + dz * dz)
      
      this.position.x += (dx / len) * speed
      this.position.z += (dz / len) * speed
      
      this.mesh.position.x = this.position.x
      this.mesh.position.z = this.position.z
      this.mesh.rotation.y = Math.atan2(dx, dz)
    }
  }
}

// 实体工厂
export function createEntity(type: EntityType, position: Position): BaseEntity {
  switch (type) {
    case EntityType.SMILER:
      return new Smiler(position)
    case EntityType.SKIN_STEALER:
      return new SkinStealer(position)
    case EntityType.SHADOW:
      return new Shadow(position)
    case EntityType.PARTYGOER:
      return new Partygoer(position)
    default:
      return new Smiler(position)
  }
}
