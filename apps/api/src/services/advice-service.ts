import Anthropic from "@anthropic-ai/sdk";
import type { ContextDocument, ExperimentDetail, ExperimentRow, ExperimentStats } from "@lab-ai/shared";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-7";
const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS ?? 8000);

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

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `あなたは研究実験データの分析をサポートする AI アドバイザーです。
与えられた実験データ（カラム定義・統計サマリ・行サンプル）と、研究者が参照指定したコンテキスト文書をもとに、研究者の質問に日本語で答えてください。

可能な場合、次の 3 セクションで構造化した Markdown で回答してください:
- ## 仮説  — 観測された傾向から導ける仮説
- ## 推奨実験  — 次に実施すべき追加実験・検証
- ## 注意点  — 解釈時の落とし穴・不確実性

数値を引用するときは出典のカラム名と統計名を明示してください。不明な点は推測せず「データから判断できない」と述べてください。`;

export interface BuildAdviceContextInput {
  experiment: ExperimentDetail;
  stats: readonly ExperimentStats[];
  sampleRows: readonly ExperimentRow[];
  contextDocuments: readonly ContextDocument[];
}

export function buildAdviceContextBlocks(input: BuildAdviceContextInput): string {
  const { experiment, stats, sampleRows, contextDocuments } = input;

  const columnLines = experiment.columns.map(
    (col) => `- ${col.name} (${col.type}${col.unit ? ` / ${col.unit}` : ""})`,
  );

  const statsLines = stats.map((s) =>
    [
      `- ${s.column}: count=${s.count}, null=${s.nullCount}`,
      `  min=${formatNum(s.min)}, max=${formatNum(s.max)}, mean=${formatNum(s.mean)}, median=${formatNum(s.median)}, stddev=${formatNum(s.stddev)}`,
    ].join("\n"),
  );

  const previewRows = sampleRows.slice(0, 20);
  const previewJson = JSON.stringify(previewRows, null, 2);

  const docSection = contextDocuments.length === 0
    ? "（選択されたコンテキスト文書はありません）"
    : contextDocuments
        .map((doc) => {
          const truncated = doc.content.length > 4000
            ? `${doc.content.slice(0, 4000)}\n...(truncated)`
            : doc.content;
          return `### ${doc.title} (${doc.kind})\n${truncated}`;
        })
        .join("\n\n---\n\n");

  return [
    `# 実験: ${experiment.name}`,
    experiment.description ? `説明: ${experiment.description}` : null,
    `行数: ${experiment.rowCount}`,
    "",
    "## カラム",
    columnLines.join("\n"),
    "",
    "## 統計サマリ",
    statsLines.join("\n"),
    "",
    `## データサンプル (先頭 ${previewRows.length} 行)`,
    "```json",
    previewJson,
    "```",
    "",
    "## 参照コンテキスト文書",
    docSection,
  ]
    .filter((section) => section !== null)
    .join("\n");
}

function formatNum(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? value.toString() : value.toPrecision(6);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamAdviceArgs {
  context: string;
  messages: readonly ChatMessage[];
  onDelta: (delta: string) => void;
}

export async function streamAdvice(args: StreamAdviceArgs): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getClient();
  const systemBlocks = [
    { type: "text" as const, text: SYSTEM_PROMPT },
    { type: "text" as const, text: args.context, cache_control: { type: "ephemeral" as const } },
  ];

  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    system: systemBlocks,
    messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  stream.on("text", (delta) => {
    args.onDelta(delta);
  });

  const finalMessage = await stream.finalMessage();
  const text = finalMessage.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    text,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  };
}
