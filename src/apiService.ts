import * as vscode from 'vscode';

import { ChatMessage } from './chatManager';

/** DeepSeek API 响应结构 */
interface ChatResponse {
  choices: { message: { content: string } }[];
}

/** AI 返回的逐行解释 */
interface LineExplanations {
  line_explanations: Record<string, string>;
}

/** 获取 API Key + Model 配置 */
function getApiConfig() {
  const config = vscode.workspace.getConfiguration('codeExplainer');
  const apiKey = config.get<string>('apiKey');
  if (!apiKey) throw new Error('请先设置 DeepSeek API Key');
  return { apiKey, model: config.get<string>('model') || 'deepseek-chat' };
}

/** 通用 DeepSeek Chat 调用 */
async function deepseekChat(messages: { role: string; content: string }[]): Promise<string> {
  const { apiKey, model } = getApiConfig();
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API 请求失败 (${response.status}): ${body || response.statusText}`);
  }
  const data: ChatResponse = await response.json();
  return data.choices[0].message.content;
}

/** 对某行代码进行追问 */
export async function followUpQuestion(
  codeLine: string,
  explanation: string,
  history: ChatMessage[],
  customPrompt?: string,
): Promise<string> {
  if (customPrompt) {
    // 自定义 prompt（用于总结等场景）
    return deepseekChat([{ role: 'user', content: customPrompt }]);
  }

  const chatHistory = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return deepseekChat([
    {
      role: 'system',
      content: `你是一个面向编程小白的代码辅导助手。当前用户在看这行代码：
\`${codeLine}\`

已有的解释：
${explanation}

请用大白话回答用户的追问，多用比喻，少用术语。全部用中文。`,
    },
    ...chatHistory,
  ]);
}

/**
 * 调用 DeepSeek API 获取代码的逐行解释
 * @param code 完整代码文本
 * @returns 行号 -> 解释文本 的映射
 */
export async function fetchExplanations(code: string): Promise<Record<number, string>> {
  // 文件太大时截断，防止超 token 限制
  const maxChars = 8000;
  const truncated = code.length > maxChars ? code.slice(0, maxChars) + '\n// ... (代码太长已截断)' : code;

  const prompt = `你是一个面向编程小白的代码解释器。请逐行解释以下代码。

【重要】全部用中文回答，包括代码中的关键字、函数名、变量名等都用中文描述。

以 JSON 格式返回，key 为行号（从 1 开始），value 为解释文本。

每行解释的格式要求：
第一行写【作用】，用一句话概括这行代码在干什么。
第二行写【说明】，用大白话补充说明，尽量少用术语，让小白也能看懂。

示例格式：
"作用：定义了一个叫 hello 的函数"
"说明：这个函数接收一个名字参数，然后在控制台里打印出"你好"这样一句话"

不要解释空行和纯注释行（返回空字符串即可）。

代码：
\`\`\`
${truncated}
\`\`\`

请返回 JSON 格式（不要包含 markdown 代码块标记，只返回纯 JSON）：
{"line_explanations": {"1": "第一行解释\\n第二行解释", "2": "..."}}`;

  const content = await deepseekChat([{ role: 'user', content: prompt }]);

  // 解析 JSON：模型可能返回纯 JSON 或包裹在 markdown 代码块中
  let jsonStr = content.trim();
  const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    jsonStr = match[1].trim();
  }

  const parsed: LineExplanations = JSON.parse(jsonStr);
  const result: Record<number, string> = {};
  for (const [line, text] of Object.entries(parsed.line_explanations)) {
    result[Number(line)] = text;
  }
  return result;
}
