import * as vscode from 'vscode';
import { ExplanationCache } from './cache';
import { StatusBarManager } from './statusBar';
import { CodeHoverProvider } from './hoverProvider';
import { fetchExplanations } from './apiService';

let cache: ExplanationCache;
let statusBar: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
  // 初始化组件
  cache = new ExplanationCache();
  statusBar = new StatusBarManager();
  context.subscriptions.push(statusBar);

  // 注册 Hover Provider（所有文件类型）
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { pattern: '**/*' },
      new CodeHoverProvider(cache, statusBar),
    ),
  );

  // 命令：解释当前代码
  context.subscriptions.push(
    vscode.commands.registerCommand('codeExplainer.explain', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('请先打开一个代码文件');
        return;
      }

      // 检查 API Key，没有则弹出输入框
      let apiKey = vscode.workspace.getConfiguration('codeExplainer').get<string>('apiKey');
      if (!apiKey) {
        const input = await vscode.window.showInputBox({
          prompt: '请输入你的 DeepSeek API Key（https://platform.deepseek.com）',
          password: true,
          placeHolder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          ignoreFocusOut: true,
        });
        if (!input) {
          return; // 用户取消
        }
        apiKey = input.trim();
        // 保存到全局设置，一次配置永久生效
        await vscode.workspace.getConfiguration('codeExplainer').update('apiKey', apiKey, true);
        vscode.window.showInformationMessage('API Key 已保存！');
      }

      const document = editor.document;
      const filePath = document.uri.toString();
      const code = document.getText();

      if (!code.trim()) {
        vscode.window.showWarningMessage('当前文件为空，无需解释');
        return;
      }

      // 显示加载提示
      vscode.window.showInformationMessage('正在逐行解释代码...');

      try {
        const explanations = await fetchExplanations(code);
        cache.set(filePath, explanations);

        // 统计有效解释的行数（排除空字符串）
        const explainedCount = Object.values(explanations).filter((t) => t !== '').length;
        vscode.window.showInformationMessage(
          `解释完成！共解释 ${explainedCount} 行代码。鼠标悬停查看解释。`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`解释失败：${msg}`);
      }
    }),
  );

  // 命令：切换解释开关（状态栏点击触发）
  context.subscriptions.push(
    vscode.commands.registerCommand('codeExplainer.toggle', () => {
      const enabled = statusBar.toggle();
      vscode.window.showInformationMessage(
        enabled ? '代码解释已开启' : '代码解释已关闭',
      );
    }),
  );

  console.log('Code Explainer 已激活');
}

export function deactivate() {
  // 资源由 context.subscriptions 自动清理
}
