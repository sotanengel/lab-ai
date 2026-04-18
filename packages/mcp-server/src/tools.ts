import { z } from "zod";
import {
  getContextDocument,
  getExperiment,
  getExperimentRows,
  getExperimentStats,
  listExperiments,
  saveAdviceNote,
  searchContextDocuments,
} from "./api-client.js";

const ExperimentIdInput = z.object({ experimentId: z.string().min(1) });
const GetRowsInput = ExperimentIdInput.extend({
  limit: z.number().int().min(1).max(500).default(50),
});
const SearchInput = z.object({ query: z.string().min(1) });
const GetDocumentInput = z.object({ documentId: z.string().min(1) });
const SaveAdviceInput = z.object({
  experimentId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

export interface ToolCallResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<ToolCallResult>;
}

function asJsonText(data: unknown): ToolCallResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const toolDescriptors: ToolDescriptor[] = [
  {
    name: "get_experiment_list",
    description: "Return the list of experiment sets (id, name, row count, created date).",
    inputSchema: { type: "object", properties: {} },
    handler: async () => asJsonText(await listExperiments()),
  },
  {
    name: "get_experiment_data",
    description: "Return the statistical summary plus the first N rows of the specified experiment.",
    inputSchema: {
      type: "object",
      properties: {
        experimentId: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 500, default: 50 },
      },
      required: ["experimentId"],
    },
    handler: async (args) => {
      const { experimentId, limit } = GetRowsInput.parse(args);
      const [detail, rows, stats] = await Promise.all([
        getExperiment(experimentId),
        getExperimentRows(experimentId, limit),
        getExperimentStats(experimentId),
      ]);
      return asJsonText({ experiment: detail, stats: stats.stats, rows: rows.items });
    },
  },
  {
    name: "get_experiment_columns",
    description: "Return the column definitions (name, type, unit) for the given experiment.",
    inputSchema: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
    handler: async (args) => {
      const { experimentId } = ExperimentIdInput.parse(args);
      const detail = await getExperiment(experimentId);
      return asJsonText({ columns: detail.columns });
    },
  },
  {
    name: "search_context_documents",
    description: "Full-text search the context library and return matching documents.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    handler: async (args) => {
      const { query } = SearchInput.parse(args);
      return asJsonText(await searchContextDocuments(query));
    },
  },
  {
    name: "get_context_document",
    description: "Return the full content of the specified context document.",
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" } },
      required: ["documentId"],
    },
    handler: async (args) => {
      const { documentId } = GetDocumentInput.parse(args);
      return asJsonText(await getContextDocument(documentId));
    },
  },
  {
    name: "save_advice_note",
    description: "Persist an AI-generated advice as an experiment note.",
    inputSchema: {
      type: "object",
      properties: {
        experimentId: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["experimentId", "title", "body"],
    },
    handler: async (args) => {
      const input = SaveAdviceInput.parse(args);
      return asJsonText(await saveAdviceNote(input));
    },
  },
];
