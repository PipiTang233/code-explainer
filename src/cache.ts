/** 按文件存储每行代码的解释缓存 */
export class ExplanationCache {
  private cache = new Map<string, { lines: Map<number, string>; timestamp: number }>();

  /** 获取某行代码的解释 */
  get(filePath: string, line: number): string | undefined {
    return this.cache.get(filePath)?.lines.get(line);
  }

  /** 存入某文件所有行的解释 */
  set(filePath: string, explanations: Record<number, string>): void {
    const lines = new Map<number, string>();
    for (const [lineNum, text] of Object.entries(explanations)) {
      lines.set(Number(lineNum), text);
    }
    this.cache.set(filePath, { lines, timestamp: Date.now() });
  }

  /** 检查某文件是否有缓存 */
  has(filePath: string): boolean {
    return this.cache.has(filePath);
  }

  /** 清除缓存（不传参则清空所有） */
  clear(filePath?: string): void {
    if (filePath) {
      this.cache.delete(filePath);
    } else {
      this.cache.clear();
    }
  }
}
