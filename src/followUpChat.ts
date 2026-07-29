import * as vscode from 'vscode';
import { ChatManager } from './chatManager';
import { ExplanationCache } from './cache';
import { followUpQuestion } from './apiService';

/** 创建一个追问聊天 WebView */
export function openFollowUpChat(
  context: vscode.ExtensionContext,
  chatManager: ChatManager,
  cache: ExplanationCache,
  filePath: string,
  line: number,
  codeLine: string,
  explanation: string,
): void {
  // 初始化对话记录
  chatManager.init(filePath, line, codeLine, explanation);

  // 唯一 viewType 以支持多开
  const panelId = `codeExplainer.followUp.${Date.now()}.${line}`;
  const panel = vscode.window.createWebviewPanel(
    panelId,
    `追问 - 第 ${line} 行`,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  // 渲染 WebView
  panel.webview.html = getWebviewContent(line, codeLine, explanation);

  // 接收 WebView 消息
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'sendMessage') {
      const question = msg.text.trim();
      if (!question) return;

      // 显示用户消息
      chatManager.addMessage(filePath, line, { role: 'user', content: question });
      panel.webview.postMessage({ type: 'addMessage', role: 'user', content: question });

      // 显示加载状态
      panel.webview.postMessage({ type: 'setLoading', loading: true });

      try {
        const reply = await followUpQuestion(codeLine, explanation, chatManager.get(filePath, line)?.messages ?? []);
        chatManager.addMessage(filePath, line, { role: 'assistant', content: reply });
        panel.webview.postMessage({ type: 'addMessage', role: 'assistant', content: reply });
      } catch (err) {
        const msgText = err instanceof Error ? err.message : String(err);
        panel.webview.postMessage({ type: 'addMessage', role: 'assistant', content: `❌ 出错了：${msgText}` });
      } finally {
        panel.webview.postMessage({ type: 'setLoading', loading: false });
      }
    }
  });

  // 关闭时弹出选项
  const originalDispose = panel.dispose.bind(panel);
  panel.onDidDispose(async () => {
    const choice = await vscode.window.showQuickPick(
      [
        { label: '$(trash) 删除所有追问记录', description: '关闭后不保留任何追问', value: 'delete' },
        { label: '$(note) 总结拓展解释', description: '将追问要点追加到代码解释中', value: 'summarize' },
        { label: '$(archive) 保留所有追问', description: '下次打开继续追问', value: 'keep' },
      ],
      { placeHolder: '关闭后追问记录怎么处理？' },
    );

    if (!choice) {
      return; // 用户取消关闭，但在 WebView 中已经关闭了，没办法阻止
    }

    if (choice.value === 'delete') {
      chatManager.deleteLine(filePath, line);
    } else if (choice.value === 'summarize') {
      const chat = chatManager.get(filePath, line);
      if (chat && chat.messages.length > 0) {
        // 调用 AI 总结
        const summaryPrompt = `以下是一段关于某行代码的问答记录，请用一小段话总结追问中学到的知识要点。\n\n代码：${codeLine}\n\n原始解释：${explanation}\n\n问答记录：\n${chat.messages.map((m) => `[${m.role === 'user' ? '问' : '答'}] ${m.content}`).join('\n')}\n\n请输出简洁的总结，100字以内。`;
        try {
          const summary = await followUpQuestion(codeLine, explanation, chat.messages, summaryPrompt);
          // 追加到原解释后面
          const updated = explanation + `\n\n---\n📝 追问小结：${summary}`;
          cache.set(filePath, { [line]: updated });
        } catch {
          // 总结失败就不处理
        }
      }
      chatManager.deleteLine(filePath, line);
    }
    // 'keep' 则保留记录，不操作
  });
}

function getWebviewContent(line: number, codeLine: string, explanation: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "Microsoft YaHei", sans-serif; font-size: 13px; color: #d4d4d4; background: #1e1e1e; display: flex; flex-direction: column; height: 100vh; }
  #header { padding: 12px 16px; background: #252526; border-bottom: 1px solid #3c3c3c; }
  #header .line-no { color: #569cd6; font-weight: bold; font-size: 12px; }
  #header .code { display: block; margin-top: 4px; font-family: Consolas, "Courier New", monospace; font-size: 13px; color: #ce9178; white-space: pre-wrap; word-break: break-all; }
  #explanation { padding: 10px 16px; background: #1e1e1e; border-bottom: 1px solid #3c3c3c; font-size: 13px; line-height: 1.6; color: #d4d4d4; white-space: pre-wrap; }
  #explanation strong { color: #4ec9b0; }
  #messages { flex: 1; overflow-y: auto; padding: 12px 16px; }
  .msg { margin-bottom: 12px; animation: fadeIn .15s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .msg.user { text-align: right; }
  .msg .bubble { display: inline-block; max-width: 85%; padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; text-align: left; white-space: pre-wrap; word-break: break-word; }
  .msg.user .bubble { background: #094771; color: #e0e0e0; border-bottom-right-radius: 2px; }
  .msg.assistant .bubble { background: #2d2d2d; color: #d4d4d4; border-bottom-left-radius: 2px; }
  .msg .label { font-size: 11px; color: #888; margin-bottom: 2px; display: block; }
  #input-area { padding: 10px 16px; background: #252526; border-top: 1px solid #3c3c3c; display: flex; gap: 8px; }
  #input-area input { flex: 1; padding: 7px 10px; border: 1px solid #3c3c3c; border-radius: 4px; background: #3c3c3c; color: #d4d4d4; font-size: 13px; outline: none; }
  #input-area input:focus { border-color: #007acc; }
  #input-area button { padding: 7px 16px; border: none; border-radius: 4px; background: #007acc; color: #fff; cursor: pointer; font-size: 13px; }
  #input-area button:disabled { background: #555; cursor: not-allowed; }
  #input-area button:hover:not(:disabled) { background: #0098ff; }
  .loading { text-align: center; color: #888; font-size: 12px; padding: 4px; }
  .welcome { text-align: center; color: #888; font-size: 12px; padding: 20px; }
</style>
</head>
<body>
<div id="header">
  <span class="line-no">第 ${line} 行</span>
  <span class="code">${escapeHtml(codeLine)}</span>
</div>
<div id="explanation"><strong>解释：</strong>${escapeHtml(explanation)}</div>
<div id="messages">
  <div class="welcome">对这一行有什么疑问？直接在下面提问 👇</div>
</div>
<div id="input-area">
  <input type="text" id="chat-input" placeholder="输入你的问题..." />
  <button id="send-btn">发送</button>
</div>
<script>
  const vscode = acquireVsCodeApi();
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = '<span class="label">' + (role === 'user' ? '你' : 'AI') + '</span><div class="bubble">' + escapeHtml(content) + '</div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setLoading(loading) {
    sendBtn.disabled = loading;
    sendBtn.textContent = loading ? '思考中...' : '发送';
    inputEl.disabled = loading;
    if (!loading) inputEl.focus();
  }

  function send() {
    const text = inputEl.value.trim();
    if (!text || sendBtn.disabled) return;
    inputEl.value = '';
    vscode.postMessage({ type: 'sendMessage', text });
  }

  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  sendBtn.addEventListener('click', send);

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'addMessage') addMessage(msg.role, msg.content);
    else if (msg.type === 'setLoading') setLoading(msg.loading);
  });

  function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');
  }

  setTimeout(() => inputEl.focus(), 100);
</script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
