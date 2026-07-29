# Code Explainer — 开发流程

## 开发步骤（按顺序执行，逐阶段验证）

### 阶段一：项目脚手架
- [ ] 初始化 VS Code 扩展项目（package.json、tsconfig.json）
- [ ] 配置 .vscode/launch.json 和 tasks.json
- [ ] 验证：`npm run compile` 无报错

### 阶段二：核心模块开发
- [ ] 实现 `src/cache.ts` — 解释缓存管理
- [ ] 实现 `src/statusBar.ts` — 状态栏开关
- [ ] 实现 `src/apiService.ts` — DeepSeek API 调用
- [ ] 实现 `src/hoverProvider.ts` — Hover 悬浮提示
- [ ] 实现 `src/extension.ts` — 扩展入口，整合所有模块
- [ ] 验证：F5 启动扩展开发模式，确认各模块加载正常

### 阶段三：功能联调
- [ ] 配置 API Key
- [ ] 打开代码文件，点击"解释代码"按钮
- [ ] 验证：API 调用成功，Hover 显示正确解释
- [ ] 验证：状态栏开关正常切换显示/隐藏
- [ ] 验证：缓存失效逻辑正常

## 打包发布
- [ ] `vsce package` 打包为 .vsix
- [ ] 本地安装测试
