# Code Explainer — 开发流程 & 进度

## ✅ 已完成

### 阶段一：项目脚手架
- [x] 初始化 VS Code 扩展项目（package.json、tsconfig.json）
- [x] 配置 .vscode/launch.json 和 tasks.json
- [x] 验证：`npm run compile` 无报错

### 阶段二：核心模块开发
- [x] 实现 `src/cache.ts` — 解释缓存管理
- [x] 实现 `src/statusBar.ts` — 状态栏开关
- [x] 实现 `src/apiService.ts` — DeepSeek API 调用
- [x] 实现 `src/hoverProvider.ts` — Hover 悬浮提示
- [x] 实现 `src/extension.ts` — 扩展入口，整合所有模块
- [x] 首次使用弹出 API Key 输入框，自动保存到全局设置

### 阶段三：功能联调
- [x] API 调用正常，Hover 显示解释
- [x] 状态栏开关正常
- [x] 打包为 .vsix（24 KB）
- [x] 推送到 GitHub

## 🔄 搁置中

### 追问窗口功能（代码已实现但未调试完成）

| 文件 | 说明 | 状态 |
|------|------|------|
| `src/chatManager.ts` | 对话记录管理器 | 已实现 |
| `src/followUpChat.ts` | WebView 聊天窗口（多开支持） | 已实现，待调试 |
| Hover 底部"追问"链接 | 点击打开追问面板 | 已实现，待调试 |
| 关闭三选项 | 删除/总结拓展/保留 | 已实现，待调试 |
| 文件关闭/修改时清除对话 | 自动清理 | 已实现 |

**遇到的问题**：Hover 中的 command 链接点击后未能触发追问面板打开。

## 已发布功能

- 一键解释整个文件（逐行中文解释）
- 鼠标悬停查看解释
- 状态栏开关（开/关）
- 首次使用弹窗配置 API Key（永久保存）
- 支持所有编程语言
- 快捷键：`Ctrl+Shift+E`
