import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDescriptors.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const descriptor = toolDescriptors.find((t) => t.name === request.params.name);
  if (!descriptor) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }
  try {
    return await descriptor.handler(request.params.arguments ?? {});
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
  // biome-ignore lint/suspicious/noConsoleLog: MCP servers log to stderr
  console.error("lab-ai MCP server running on stdio");
}

main().catch((err) => {
  // biome-ignore lint/suspicious/noConsoleLog: fatal error path
  console.error("Fatal MCP server error:", err);
  process.exit(1);
});
