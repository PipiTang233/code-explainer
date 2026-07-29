import * as vscode from 'vscode';
import { ExplanationCache } from './cache';
import { StatusBarManager } from './statusBar';

/**
 * 提供 Hover 悬浮提示：从缓存中查找当前行的解释并显示
 */
export class CodeHoverProvider implements vscode.HoverProvider {
  constructor(
    private cache: ExplanationCache,
    private statusBar: StatusBarManager,
  ) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | null {
    // 开关关闭时不做任何事
    if (!this.statusBar.enabled) {
      return null;
    }

    const filePath = document.uri.toString();
    const line = position.line + 1; // API 返回的行号从 1 开始

    const explanation = this.cache.get(filePath, line);
    if (!explanation || explanation === '') {
      return null;
    }

    return new vscode.Hover(explanation);
  }
}
