# Code Explainer — 技术方案

## 一、项目概览

VS Code 扩展插件，选中代码文件后一键调用 AI 接口，获取每行代码的中文解释，通过 Hover 悬浮提示展示。

## 二、技术栈

| 模块 | 技术选型 |
|------|----------|
| 扩展语言 | TypeScript |
| 运行环境 | VS Code Extension Host |
| AI API | DeepSeek Chat API (api.deepseek.com) |
| HTTP 请求 | axios 或原生 fetch |
| 打包工具 | vsce (VS Code Extension Manager) |
| 开发工具 | VS Code + yo generator-code |

## 三、扩展设计

### 3.1 激活事件 (Activation Events)
- `onLanguage` — 任意语言文件打开时激活
- `onCommand:codeExplainer.explain` — 执行命令时激活

### 3.2 命令 (Commands)
| ID | 名称 | 触发方式 |
|----|------|----------|
| `codeExplainer.explain` | 解释当前代码 | 编辑器右上角按钮 + 右键菜单 + 快捷键(Ctrl+Shift+E) |

### 3.3 核心组件

```
┌─────────────────────────────────────────────────┐
│                  扩展入口 (extension.ts)          │
├─────────────────────────────────────────────────┤
│ ① 命令注册           ② 状态栏开关               │
│ ③ HoverProvider      ④ API 调用模块             │
│ ⑤ 解释缓存管理       ⑥ 右上角按钮               │
└─────────────────────────────────────────────────┘
```

#### ① HoverProvider
- 实现 `vscode.HoverProvider` 接口
- `provideHover(document, position)` 方法：
  - 查找当前行是否有缓存的解释
  - 有 → 返回 Hover（包含解释文本）
  - 无 → 返回 null
  - 同时检查状态栏开关是否启用

#### ② 解释缓存 (ExplanationCache)
- 以文件路径 + 文件修改时间为 key
- 存储 Map<行号, 解释文本>
- 用户手动触发时刷新缓存
- 文件修改后缓存自动失效（用户需重新触发）

#### ③ API 调用模块
- 发送整个文件内容到 DeepSeek API
- Prompt 要求返回 JSON 格式：`{"line_explanations": {"1": "解释...", "2": "..."}}`
- 解析响应，按行号存储到缓存

#### ④ 状态栏开关
- 点击切换 Enable/Disable 状态
- Disable 时 HoverProvider 返回 null
- 状态持久化到 VS Code 配置

### 3.4 数据流

```
用户点击"解释代码"
  → 读取当前编辑器文档内容
  → 调用 DeepSeek API（传入完整代码）
  → 解析 API 响应（JSON 格式）
  → 存入 ExplanationCache
  → 触发 Hover 刷新
  → 用户悬浮某行 → HoverProvider 查缓存 → 显示解释
```

## 四、Prompt 设计

```text
你是一个代码解释器。请逐行解释以下代码的作用。
以 JSON 格式返回，key 为行号（从 1 开始），value 为该行代码的中文解释。
解释要简洁，用一句话说明该行做了什么。
不要解释空行和纯注释行（返回空字符串即可）。

代码：
{code_content}

请返回 JSON 格式：
{"line_explanations": {"1": "解释", "2": "解释", ...}}
```

## 五、配置项 (Settings)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `codeExplainer.apiKey` | string | "" | DeepSeek API Key |
| `codeExplainer.enabled` | boolean | true | 插件总开关 |
| `codeExplainer.model` | string | "deepseek-chat" | 使用的模型名称 |

## 六、项目文件结构

```
coding_explainer/
├── .vscode/
│   ├── launch.json        # 调试配置
│   └── tasks.json         # 构建任务
├── src/
│   ├── extension.ts       # 扩展入口
│   ├── hoverProvider.ts   # Hover 提供器
│   ├── apiService.ts      # DeepSeek API 调用
│   ├── cache.ts           # 解释缓存管理
│   └── statusBar.ts       # 状态栏开关
├── package.json           # 扩展清单
├── tsconfig.json          # TypeScript 配置
└── technical.md           # 本文档
```

## 七、环境要求

- VS Code >= 1.80.0
- Node.js >= 18.x
- vsce 用于打包发布
