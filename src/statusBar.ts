import * as vscode from 'vscode';

/** 状态栏开关：控制 Hover 解释的显示/隐藏 */
export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private _enabled = true;

  get enabled(): boolean {
    return this._enabled;
  }

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'codeExplainer.toggle';
    this.sync();
    this.item.show();
  }

  /** 切换开/关，返回切换后的状态 */
  toggle(): boolean {
    this._enabled = !this._enabled;
    this.sync();
    return this._enabled;
  }

  private sync(): void {
    if (this._enabled) {
      this.item.text = '$(eye) 解释模式: 开';
      this.item.tooltip = '点击关闭代码解释';
    } else {
      this.item.text = '$(eye-closed) 解释模式: 关';
      this.item.tooltip = '点击开启代码解释';
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
