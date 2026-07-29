/** 单条对话消息 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** 某行代码的对话记录 */
interface LineChat {
  codeLine: string;        // 该行代码原文
  explanation: string;     // 初始解释
  messages: ChatMessage[]; // 追问记录
}

/** 对话管理器：按 文件路径 → 行号 存储追问对话 */
export class ChatManager {
  private store = new Map<string, Map<number, LineChat>>();

  /** 获取某行代码的对话 */
  get(filePath: string, line: number): LineChat | undefined {
    return this.store.get(filePath)?.get(line);
  }

  /** 初始化某行的对话（附带代码原文和解释） */
  init(filePath: string, line: number, codeLine: string, explanation: string): void {
    if (!this.store.has(filePath)) {
      this.store.set(filePath, new Map());
    }
    if (!this.store.get(filePath)!.has(line)) {
      this.store.get(filePath)!.set(line, { codeLine, explanation, messages: [] });
    }
  }

  /** 添加一条对话消息 */
  addMessage(filePath: string, line: number, msg: ChatMessage): void {
    const chat = this.get(filePath, line);
    if (chat) {
      chat.messages.push(msg);
    }
  }

  /** 删除某个文件的所有对话 */
  deleteFile(filePath: string): void {
    this.store.delete(filePath);
  }

  /** 删除某行对话 */
  deleteLine(filePath: string, line: number): void {
    this.store.get(filePath)?.delete(line);
  }

  /** 清空所有对话 */
  clearAll(): void {
    this.store.clear();
  }
}
