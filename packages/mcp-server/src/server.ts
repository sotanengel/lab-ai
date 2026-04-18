import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { toolDescriptors } from "./tools.js";

const server = new Server(
  {
    name: "lab-ai-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(
  ListToolsRequestSchema,
  async (): Promise<ListToolsResult> => ({
    tools: toolDescriptors.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }),
);

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const descriptor = toolDescriptors.find((t) => t.name === request.params.name);
  if (!descriptor) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }
  try {
    const result = await descriptor.handler(request.params.arguments ?? {});
    return result as CallToolResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Tool execution failed: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("lab-ai MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal MCP server error:", err);
  process.exit(1);
});
