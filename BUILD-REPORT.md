# BUILD REPORT — printcraft

Clean-room rebuild of `com.drmaker3d/shop` v1.0.0
(remote-only MCP server at `https://drmaker3d.com/mcp`), built
2026-10-28 as a forwarding client. Package: `@reneturcios/printcraft`
0.1.0, registry name `io.github.CloudCorpRecords/printcraft`.

## Surface built

Labelled subset: **6 of the 8 captured tools built**, 2 omitted
(see below).

| Tool | Required fields as served |
|------|---------------------------|
| `about_drmaker3d` | NO `required` key in the capture — served verbatim, none invented |
| `search_products` | NO `required` key in the capture — served verbatim, none invented |
| `print_price_examples` | NO `required` key in the capture — served verbatim, none invented |
| `print_options` | NO `required` key in the capture — served verbatim, none invented |
| `quote_custom_print` | `material`, `color` |
| `track_order` | `order_number`, `email` |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured: every captured
tool carries a `title`, so all six are served with theirs, and the
capture's `_meta` / `annotations` keys were dropped at fixture
slimming and are NOT part of the served literals. The tool literals
were generated programmatically from
`harness/fixtures/drmaker3d-tools-original.json` by the script at
`/tmp/b45-printcraft-scratch/gen.py` (parse + re-serialise into
`src/forward.ts`) — never retyped — and a post-generation check
(the registration-integrity test suite, plus the parity harness)
confirmed the served literals deep-equal the fixture's 6 tool
objects, in order. Tools are registered via the MCP SDK low-level
Server API (`ListToolsRequestSchema` / `CallToolRequestSchema`
handlers), not McpServer+zod.

## Labelled subset — omitted tools

The capture enumerates 8 tools; the fixture EXCLUDES the two below
(the exclusion and its reason are recorded in the fixture's
`_source` note), and the rebuild never registers, lists or makes
them callable:

- `create_checkout` — creates a Stripe Checkout link for one or
  more custom prints for the person to open and pay. Its
  description notes nothing is charged by the tool itself and no
  order exists until payment — the checkout-funnel shape all the
  same (the carddata `start_checkout` and formfurrow
  `create_upgrade_link` precedents: a tool whose function is to
  START a purchase checkout is omitted).
- `request_quote` — SENDS a quote request carrying a person's
  name, email and project description to the vendor, who replies
  to that email (the porefind/spinspec/douxprocess PII
  lead-routing family).

Absence of both is asserted in tests at all three levels:
registry (not in `TOOL_NAMES` / `TOOL_DEFS`, `isKnownTool`
rejects both), MCP layer (`handleCallTool` rejects both with
McpError MethodNotFound before any network hop), and CLI (both
exit 2 with usage that does not list them).

Judgments carried from the spec: `quote_custom_print` computes an
exact price and creates no order and charges nothing; its
OPTIONAL caller-supplied `email` property is served verbatim and
the rebuild forwards arguments and originates nothing (the
trustbeacon distinction). `track_order`'s email is a lookup key
for the caller's own order, routed nowhere — contrast
`request_quote`, which transmits it to the vendor and is omitted.

## Fixture conflicts

**None.** The spec and the fixture agree on all 6 tools' names,
titles, descriptions, required fields (including the four tools
with no `required` key: `about_drmaker3d`, `search_products`,
`print_price_examples`, `print_options`) and property shapes,
including `quote_custom_print`'s nested `file` object (its own
`required: [download_url, file_id]` and `additionalProperties:
true`, served verbatim inside the otherwise
`additionalProperties: false` top-level schema).

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://drmaker3d.com/mcp`.
- Env override `DRMAKER3D_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent. Tests assert that no `Authorization` header
  is sent under any environment — including with key-like env vars
  (`DRMAKER3D_API_KEY`, `API_KEY`, `AUTHORIZATION`) set — and that
  no `X-API-Key` header is ever sent; upstream requests carry only
  `Content-Type`, `Accept` and, when issued, `Mcp-Session-Id`.
- Error rendering `printcraft error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP
  JSON-RPC: initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring
  `Mcp-Session-Id` when issued; plain-JSON and SSE replies are
  both parsed. The forwarding core takes an injectable fetch;
  tests stub the upstream — no live network calls in tests.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3).
- Parses as JSON; `name` == `@reneturcios/printcraft`.
- Package entries: **128**.
- sha256: `796c570deebd5dbb39638a84bebe1274b08ba94533650a40eaba6f216d044afc`
  (re-verified unchanged after the subsequent offline `npm ci`).

## server.json

- Description exactly: "DrMaker3D studio reads: shop search,
  print prices, options, instant print quotes and order
  tracking." — **100 characters**.
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/printcraft:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio. Dockerfile
  (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/printcraft"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/printcraft`
  and its smoke test asserts the server name `printcraft`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **65 tests, 65 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 6
   tools, including the title and no-required assertions and the
   nested `file` schema; absence assertions for `create_checkout`
   and `request_quote` at registry, MCP-layer and CLI level; plus
   session handling/reuse, env override, the
   no-Authorization-header assertions under any environment,
   verbatim argument forwarding and result pass-through including
   upstream isError, SSE parsing, error rendering, MCP-layer
   validation, and CLI behaviour including
   `node dist/cli.js --version`).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/drmaker3d-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/printcraft/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/printcraft/parity-out` → **verdict PASS, parity 100.0**
   (6/6 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
