#!/usr/bin/env node
/**
 * rasterly MCP server — give any AI agent eyes and a reader for the live web.
 *
 * Tools:
 *   read_url    URL → clean, LLM-ready Markdown (renders JS, strips the chrome)
 *   capture_url URL → a screenshot the agent can actually see (image content)
 *   url_to_pdf  URL → a print-ready PDF (returned as a base64 resource)
 *
 * Config (env):
 *   RASTERLY_API_KEY   your rasterly key (X-Api-Key)         [required in prod]
 *   RASTERLY_API_URL   base URL (default https://api.rasterly.dev)
 *
 * Add to any MCP client (Claude Desktop/Code, Cursor, …):
 *   { "command": "npx", "args": ["-y", "rasterly-mcp"],
 *     "env": { "RASTERLY_API_KEY": "sk_live_…" } }
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.RASTERLY_API_URL || "https://rasterly-production.up.railway.app").replace(/\/$/, "");
const KEY = process.env.RASTERLY_API_KEY || "";

async function call(path, { binary = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: KEY ? { "X-Api-Key": KEY } : {},
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch { detail = await res.text().catch(() => ""); }
    throw new Error(`rasterly ${res.status}: ${detail || res.statusText}`);
  }
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const server = new McpServer({ name: "rasterly", version: "0.1.0" });

server.tool(
  "read_url",
  "Fetch a web page and return its main content as clean, LLM-ready Markdown. " +
    "Runs a real browser, so JavaScript-rendered pages work, and it strips nav/ads/boilerplate. " +
    "Use this whenever you need to READ what's on a URL.",
  { url: z.string().url().describe("The page to read") },
  async ({ url }) => {
    const md = await call(`/v1/read?url=${encodeURIComponent(url)}&format=markdown`);
    return { content: [{ type: "text", text: md || "(no readable content found)" }] };
  },
);

server.tool(
  "capture_url",
  "Take a screenshot of a web page so you can SEE it (returns an image). " +
    "Use this when the visual layout matters or a page won't reduce to text.",
  {
    url: z.string().url().describe("The page to screenshot"),
    full_page: z.boolean().optional().describe("Capture the whole scrollable page (default: just the viewport)"),
  },
  async ({ url, full_page }) => {
    const buf = await call(
      `/v1/screenshot?url=${encodeURIComponent(url)}&format=jpeg&quality=75${full_page ? "&full_page=true" : ""}`,
      { binary: true },
    );
    return { content: [{ type: "image", data: buf.toString("base64"), mimeType: "image/jpeg" }] };
  },
);

server.tool(
  "url_to_pdf",
  "Render a web page to a print-ready PDF (A4). Returns the PDF as a base64 resource.",
  { url: z.string().url().describe("The page to turn into a PDF") },
  async ({ url }) => {
    const buf = await call(`/v1/screenshot?url=${encodeURIComponent(url)}&format=pdf`, { binary: true });
    return {
      content: [
        { type: "text", text: `Rendered ${url} to a PDF (${Math.round(buf.length / 1024)} KB).` },
        { type: "resource", resource: { uri: url, mimeType: "application/pdf", blob: buf.toString("base64") } },
      ],
    };
  },
);

server.tool(
  "extract_url",
  "Extract STRUCTURED data from a web page as JSON: schema.org JSON-LD (products, articles, " +
    "recipes, events…), OpenGraph/Twitter/meta, every table as rows of cells, images and links. " +
    "Use this when you need the page's facts/fields, not its prose.",
  { url: z.string().url().describe("The page to extract data from") },
  async ({ url }) => {
    const json = await call(`/v1/extract?url=${encodeURIComponent(url)}`);
    return { content: [{ type: "text", text: json }] };
  },
);

server.tool(
  "crawl_url",
  "Crawl a website into Markdown: start at a URL, follow same-origin links, and return each page's " +
    "content as clean Markdown. Use this to ingest a whole docs site or knowledge base in one call (great for RAG). " +
    "Bounded by `limit` pages.",
  {
    url: z.string().url().describe("The starting URL"),
    limit: z.number().int().min(1).max(30).optional().describe("Max pages to crawl (default 10)"),
  },
  async ({ url, limit }) => {
    const md = await call(`/v1/crawl?url=${encodeURIComponent(url)}&format=markdown${limit ? `&limit=${limit}` : ""}`);
    return { content: [{ type: "text", text: md || "(no pages crawled)" }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("rasterly-mcp ready (base:", BASE + ")");
