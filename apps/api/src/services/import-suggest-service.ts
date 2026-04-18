import Anthropic from "@anthropic-ai/sdk";
import { type ImportSuggestionResponse, ImportSuggestionResponseSchema } from "@lab-ai/shared";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-7";

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

export function isImportSuggestConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `あなたは研究データ取込の設定アシスタントです。
与えられたファイルのサンプル（先頭 数十 KB）を読み、取込に必要な設定を JSON で返してください。

出力フィールド:
- sourceFormat: 'csv' | 'tsv' | 'json' | 'txt'
- hasHeader: ヘッダ行があるか
- delimiter: csv/tsv/txt の場合の区切り文字（json の場合 null）
- columns: 各カラムの { name, type: 'number'|'integer'|'datetime'|'category'|'string'|'boolean', unit?, description? }
- proposedName: 実験名の候補
- notes: 注意点や補足（200字以内）

ルール:
- 出力は JSON のみ。説明は含めない
- カラム名は英数字・アンダースコアを優先
- 単位が読み取れる場合は unit に設定（例: "°C", "s"）
- type は最も狭い型を採用（整数は integer、浮動小数は number）`;

export interface SuggestInput {
  filename?: string | undefined;
  sample: string;
}

export async function suggestImportConfig(input: SuggestInput): Promise<ImportSuggestionResponse> {
  const client = getClient();
  const userText = [
    input.filename ? `ファイル名: ${input.filename}` : null,
    "サンプル:",
    "```",
    input.sample.slice(0, 32_000),
    "```",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: [{ type: "text", text: SYSTEM_PROMPT }],
    messages: [{ role: "user", content: userText }],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("AI response did not include text");
  const jsonText = extractJson(textBlock.text);
  const parsed = ImportSuggestionResponseSchema.parse(JSON.parse(jsonText));
  return parsed;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
}
