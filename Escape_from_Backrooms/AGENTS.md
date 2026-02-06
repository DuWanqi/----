# VAG Playground - Three.js 3D

这是一个基于 Three.js 的 3D 游戏项目。

## 重要：技术栈限制

**禁止使用 Python 或任何后端语言。** 本项目是纯前端游戏项目，只能使用以下技术栈：

- **TypeScript** - 主要开发语言
- **JavaScript** - 可选
- **Vite** - 构建工具
- **Three.js** - 3D 渲染引擎
- **HTML/CSS** - 页面结构和样式

所有游戏逻辑必须在浏览器端运行，通过 Vite 开发服务器提供 HMR 支持。

## 项目结构（统一规范）

```
├── index.html           # 入口 HTML
├── package.json         # 依赖配置
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
├── assets/              # 资源目录
│   ├── models/          # 3D 模型
│   ├── textures/        # 纹理贴图
│   └── music/           # 音频资源
└── src/
    ├── main.ts          # 游戏入口
    ├── engine/          # 引擎核心（通用功能）
    │   ├── Engine.ts    # 引擎主类
    │   ├── Input.ts     # 输入处理
    │   └── World.ts     # 世界管理
    ├── audio/           # 音频系统
    │   └── AudioSystem.ts
    ├── game/            # 游戏逻辑（主要开发区）
    │   └── MainScene.ts # 主场景
    ├── entities/        # 实体/角色/游戏对象
    ├── systems/         # 游戏系统（碰撞、AI、物理等）
    ├── ui/              # UI 组件（菜单、HUD、对话框）
    ├── utils/           # 工具函数
    └── platform/        # 平台通信（不要修改）
        └── Bridge.ts
```

## 目录职责

| 目录 | 职责 | 示例 |
|------|------|------|
| `engine/` | 引擎核心功能 | 游戏循环、输入、世界管理 |
| `audio/` | 音频系统 | 音效播放、BGM 管理 |
| `game/` | 游戏主逻辑 | 场景、关卡、游戏流程 |
| `entities/` | 游戏实体 | Player.ts, Enemy.ts, Vehicle.ts |
| `systems/` | 游戏系统 | PhysicsSystem.ts, AISystem.ts |
| `ui/` | UI 组件 | Menu.ts, HUD.ts, Dialog.ts |
| `utils/` | 工具函数 | math.ts, helpers.ts |
| `platform/` | 平台通信 | **不要修改** |

## 开发指南

1. 主要在 `src/game/MainScene.ts` 中编写游戏逻辑
2. 游戏实体放在 `src/entities/` 目录
3. 复杂系统放在 `src/systems/` 目录
4. UI 组件放在 `src/ui/` 目录
5. 使用 Three.js 的 API 创建 3D 对象、灯光、材质、相机等
6. 使用 `src/engine/` 中的工具类来管理游戏循环和输入
7. 3D 模型放在 `assets/models/`，纹理放在 `assets/textures/`
8. 音频资源放在 `assets/music/` 目录下
