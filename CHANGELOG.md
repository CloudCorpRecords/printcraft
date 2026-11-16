# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted DrMaker3D MCP server. The 6 built tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `about_drmaker3d`, `search_products`, `print_price_examples`, `print_options`, `quote_custom_print`, `track_order`. This is a labelled subset of the 8 captured tools: `create_checkout` (creates a Stripe Checkout link for a purchase) and `request_quote` (sends a person's name, email and project description to the vendor) are omitted and are not registered, listed or callable. `about_drmaker3d`, `search_products`, `print_price_examples` and `print_options` carry no `required` key in the capture and none is served.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `printcraft error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `DRMAKER3D_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
