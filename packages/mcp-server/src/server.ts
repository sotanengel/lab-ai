import { createServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { toolDescriptors } from "./tools.js";

function createMcpServer(): Server {
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

  return server;
}

async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("lab-ai MCP server running on stdio");
}

async function runSse(port: number, host: string): Promise<void> {
  // SSE transport needs one transport + server per client connection.
  const transports = new Map<string, SSEServerTransport>();

  const http = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/sse") {
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);
      res.on("close", () => {
        transports.delete(transport.sessionId);
      });
      const server = createMcpServer();
      server.connect(transport).catch((err) => {
        console.error("SSE connect failed", err);
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/messages") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        res.statusCode = 400;
        res.end("sessionId required");
        return;
      }
      const transport = transports.get(sessionId);
      if (!transport) {
        res.statusCode = 404;
        res.end("unknown session");
        return;
      }
      transport.handlePostMessage(req, res).catch((err) => {
        console.error("SSE message handler failed", err);
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ status: "ok", transport: "sse", sessions: transports.size }));
      return;
    }

    res.statusCode = 404;
    res.end("not found");
  });

  await new Promise<void>((resolve) => {
    http.listen(port, host, () => resolve());
  });
  console.error(`lab-ai MCP server running on sse http://${host}:${port}/sse`);
}

async function main(): Promise<void> {
  const transport = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();
  if (transport === "sse") {
    const port = Number(process.env.MCP_PORT ?? 8788);
    const host = process.env.MCP_HOST ?? "0.0.0.0";
    await runSse(port, host);
  } else {
    await runStdio();
  }
}

main().catch((err) => {
  console.error("Fatal MCP server error:", err);
  process.exit(1);
});
