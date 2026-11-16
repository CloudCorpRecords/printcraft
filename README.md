# printcraft

Ask a one-person 3D printing studio what it makes, what it charges and where your order is — from inside your tool list. printcraft is a local forwarding client for the hosted DrMaker3D MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to the studio's server, returning the answers exactly as the service sends them back.

The six tools cover the studio's information core: what the studio offers and how ordering works, the shop catalogue with titles and starting prices, real price examples for reference parts, the materials/colours/options catalogue behind the instant quote, an exact instant-quote price computed from a model file you supply, and order-status tracking by order number and email. Nothing is priced, searched or stored locally — the package is a pipe to the studio's service, not the service itself.

This is a labelled subset of the upstream surface: the captured server also offers `create_checkout` (creates a Stripe Checkout link for a purchase) and `request_quote` (sends a person's name, email and project description to the studio for a reply). Both are omitted from this rebuild and are not registered, listed or callable at any level.

## The tools

- **`about_drmaker3d`** — What the studio offers and how it works: custom printing, design from a photo or sketch, figures, cookie cutters, lake maps, materials, turnaround, shipping and ordering. An optional `topic` narrows the answer to one area.
- **`search_products`** — Search the shop and its service pages by words. Returns titles, starting prices in U.S. dollars where there is one, and links. An empty query lists the shop.
- **`print_price_examples`** — Real instant-quote prices for three reference parts in each material, plus the upfront prices for photo figures, cake toppers, name keychains and photo lithophanes. An optional `material` narrows the list.
- **`print_options`** — The materials, colours, print qualities, infill and copy limits, largest one-piece size and accepted file formats of the instant quote, and how to upload a model file for `quote_custom_print`. No parameters.
- **`quote_custom_print`** — The exact instant-quote price for printing a 3D model file, from the same engine as the studio's quote page. Pass the attached file or an upload `file_key`; `material` and `color` are required. It computes a price only — it creates no order and charges nothing.
- **`track_order`** — The stage of an order (received, printing, finishing, shipped, delivered), its ship-by day and arrival window, and tracking when shipped. `order_number` and the `email` the order was placed with are required; only that order is returned.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/printcraft mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "printcraft": {
      "command": "npx",
      "args": ["-y", "@reneturcios/printcraft", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/printcraft
docker run --rm ghcr.io/cloudcorprecords/printcraft print_options '{}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
printcraft print_options '{}'
printcraft search_products '{"query":"ribbed pendant","limit":5}'
printcraft track_order '{"order_number":"DM1015","email":"you@example.com"}'
printcraft --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `DRMAKER3D_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://drmaker3d.com/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless. The email passed to `track_order` is a lookup key for your own order and is forwarded only as that call's argument; `quote_custom_print`'s optional email is likewise caller-supplied and forwarded verbatim — this package originates nothing.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `printcraft error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 6 tools, deep-equal, in order, with no `required` key added to the four tools that carry none), asserts that the two omitted tools are absent at registry, MCP and CLI level, exercises the session handshake and its reuse, verifies that no `Authorization` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
