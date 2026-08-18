# rasterly-mcp

Give any AI agent **eyes and a reader for the live web.** An MCP server that lets
your agent turn a URL into clean Markdown, a screenshot it can actually see, or a PDF —
backed by [rasterly](https://rasterly.dev), a real headless-Chromium rendering API.

Works in any MCP client: Claude Desktop, Claude Code, Cursor, Windsurf, and others.

## Tools

| Tool | What the agent gets |
|------|---------------------|
| `read_url` | The page's main content as **clean, LLM-ready Markdown** — JS is rendered, nav/ads/boilerplate stripped. Use it to *read* a URL. |
| `capture_url` | A **screenshot** returned as an image, so the agent can *see* the page (layout, charts, anything visual). `full_page` optional. |
| `url_to_pdf` | A print-ready **PDF** of the page (base64 resource). |

Why an agent wants this: a plain `fetch()` gets you raw HTML that a modern, JS-rendered
site won't even populate. `read_url` runs a real browser and hands back just the article —
far fewer tokens, far more signal.

## Install

Get a key at **[rasterly.dev](https://rasterly.dev)** (free tier: 100 renders/month), then add
the server to your MCP client.

**Claude Desktop / Claude Code / Cursor** — add to your MCP config
(`claude_desktop_config.json`, `.mcp.json`, or the client's MCP settings):

```json
{
  "mcpServers": {
    "rasterly": {
      "command": "npx",
      "args": ["-y", "rasterly-mcp"],
      "env": { "RASTERLY_API_KEY": "sk_live_your_key" }
    }
  }
}
```

Restart the client. Your agent now has `read_url`, `capture_url`, and `url_to_pdf`.

## Try it

Ask your agent things like:
- *"Read https://news.ycombinator.com and summarize the top 3 posts."*
- *"Screenshot stripe.com and tell me what the hero section says."*
- *"Turn this docs page into a PDF."*

## Config

| Env var | Default | Notes |
|---------|---------|-------|
| `RASTERLY_API_KEY` | – | Your rasterly key (sent as `X-Api-Key`). |
| `RASTERLY_API_URL` | `https://rasterly-production.up.railway.app` | Override to point at a self-hosted rasterly. |

## Run standalone

```bash
RASTERLY_API_KEY=sk_live_… npx -y rasterly-mcp
```

MIT · built on [rasterly](https://rasterly.dev)
