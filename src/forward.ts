/**
 * printcraft core: a forwarding client for the hosted
 * DrMaker3D MCP server.
 *
 * No shop data lives on this machine. tools/list is
 * answered from the literal definitions below, which
 * reproduce a live capture of the upstream server word
 * for word (name, title, description and inputSchema
 * exactly as captured; four tools — about_drmaker3d,
 * search_products, print_price_examples, print_options
 * — carry no `required` key, so none is served for
 * them). A tools/call travels upstream over a
 * streamable-HTTP JSON-RPC session: an initialize POST,
 * a notifications/initialized POST, then the tools/call
 * POST, carrying the Mcp-Session-Id response header on
 * later requests when the upstream issues one. The
 * session opens lazily on the first forwarded call and
 * is reused for the client's lifetime.
 *
 * Labelled subset: the capture enumerates 8 tools. Two
 * are omitted from this rebuild and are never
 * registered, listed or callable: `create_checkout`
 * (creates a Stripe Checkout link for a purchase — the
 * checkout-funnel shape) and `request_quote` (sends a
 * person's name, email and project description to the
 * vendor for a reply — the PII lead-routing shape). The
 * six tools below are the studio's information core.
 *
 * The endpoint is pinned to https://drmaker3d.com/mcp
 * and may be replaced with the DRMAKER3D_MCP_URL
 * environment variable (that override is a labelled
 * reconstruction). The registry record declares NO
 * headers on the upstream remote, so no auth header is
 * ever sent, under any environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out — become an isError result
 * whose text begins with `printcraft error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://drmaker3d.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/drmaker3d-tools-original.json;          */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "about_drmaker3d",
    "title": "About DrMaker3D",
    "description": "What DrMaker3D (drmaker3d.com) offers and how it works: a one-person 3D printing and 3D modeling studio in Burlington, Connecticut that ships across the U.S. Custom 3D printing with an instant online quote for STL, OBJ, 3MF and STEP files, design from a photo, sketch or idea, upfront-priced figures made from a photo or AI picture (one or two on a base, pets, wedding cake toppers), printing models from Printables, Thingiverse or MakerWorld links, CookieMaker3D custom cookie cutters, cake toppers, Bakery Manager software in private pilot, gifts with a gift finder, 3D printed lake maps, paying by invoice or tax exempt for schools and businesses, nine materials, made-to-order pendant lights, turnaround, shipping and how to order. Use it to answer questions about the studio: what it makes, from what, how long it takes and how ordering works.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string",
          "enum": [
            "all",
            "custom-printing",
            "cookie-cutters",
            "bakery-manager",
            "gifts",
            "lake-maps",
            "materials",
            "pendant-lights",
            "ordering",
            "contact"
          ],
          "description": "Which part to return; \"all\" for everything."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "search_products",
    "title": "Search DrMaker3D products",
    "description": "Search the DrMaker3D shop (pendant lights, sets, gifts, gift cards and other made-to-order products) and its service pages (a figure from a photo, a pet figure, a wedding cake topper figure, the cake topper and cookie cutter makers, Bakery Manager software in private pilot, lake maps, the gift finder, paying by invoice) by words. Returns titles, starting prices in U.S. dollars where there is one, and links. A custom print from a file has no product: use about_drmaker3d, print_price_examples or request_quote for those.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Words to match, e.g. \"ribbed pendant\" or \"gift card\". Empty lists the shop."
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 25,
          "description": "Most results to return (default 10)."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "print_price_examples",
    "title": "Custom 3D print price examples",
    "description": "Real prices from the DrMaker3D instant quote for three reference parts (a 2 in clip or knob, a 4 in bracket, a 6 in enclosure) in each material, at Standard quality, 20% infill, one copy, before shipping. Use it to give a person a ballpark; the exact price comes from uploading their file at the instant quote page, or from a quote request. Also lists the upfront prices for a figure made from a person's photo or AI picture (4, 6 or 8 in tall, one color or full color, one figure or two on one base, keychains, sets; free shipping in the contiguous U.S. included; standing figures a range, keychains fixed; full color is up to 6 colors, extra colors cost more), ordered on its own page, and the prices of cake toppers, name keychains and photo lithophanes, each designed on its own page.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "material": {
          "type": "string",
          "description": "Optional material name, e.g. PLA, PETG, TPU, ABS, ASA, PC, PA-CF, PETG-CF, \"Nylon (PA)\". Omit for all."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "print_options",
    "title": "Custom print options",
    "description": "The materials, colors (in stock or special order), print qualities, infill and copy limits, largest one-piece size and accepted file formats of the DrMaker3D instant quote, and how to upload a model file for quote_custom_print. Call it before quote_custom_print so the material and color named are real ones.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  },
  {
    "name": "quote_custom_print",
    "title": "Instant price for a 3D model file",
    "description": "The exact DrMaker3D instant-quote price for printing a person's 3D model file, from the same engine and the same measurements as the instant quote page. Pass the file the person attached (as file), or upload it first: POST https://drmaker3d.com/api/upload as multipart/form-data with fields file (STL, OBJ, 3MF, GLB, glTF or PLY, up to 25 MB) and kind=printiq, and pass the \"key\" it returns as file_key. The file is kept privately by the studio for the quote. Returns the price, size, turnaround and a checkout_item to pass to create_checkout. Painted multicolor files, STEP files, parts too big for one piece and model links (Printables, Thingiverse, MakerWorld) are quoted by hand: it says so, and request_quote sends them to Rich.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "file_key": {
          "type": "string",
          "description": "The key POST /api/upload returned (starts with \"printiq/\"). Give this or file."
        },
        "file": {
          "type": "object",
          "description": "The person's model file as ChatGPT passes an attached file (a link on files.oaiusercontent.com or OpenAI’s own file storage). Give this or file_key.",
          "properties": {
            "download_url": {
              "type": "string"
            },
            "file_id": {
              "type": "string"
            },
            "mime_type": {
              "type": "string"
            },
            "file_name": {
              "type": "string"
            }
          },
          "required": [
            "download_url",
            "file_id"
          ],
          "additionalProperties": true
        },
        "material": {
          "type": "string",
          "description": "A material from print_options, e.g. PLA, PETG, \"TPU (flexible)\", ABS, ASA, \"Nylon (PA)\", PC, PA-CF, PETG-CF."
        },
        "color": {
          "type": "string",
          "description": "A color of that material from print_options, e.g. \"Black\" or \"Matte Charcoal\"."
        },
        "finish": {
          "type": "string",
          "description": "Optional color family, e.g. \"PLA Matte\", when a color name is in two families."
        },
        "quality": {
          "type": "string",
          "enum": [
            "draft",
            "fast",
            "standard",
            "high"
          ],
          "description": "Default standard. Draft only for parts 100 mm or more across."
        },
        "infill": {
          "type": "integer",
          "minimum": 10,
          "maximum": 100,
          "description": "Percent, default 20. 50 and up for functional parts."
        },
        "copies": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "How many of the model, default 1."
        },
        "units": {
          "type": "string",
          "enum": [
            "mm",
            "inches"
          ],
          "description": "Default mm. \"inches\" for an STL or OBJ drawn in inches."
        },
        "email": {
          "type": "string",
          "description": "Optional: the person's email. Needed only when the site asks for one before showing exact prices."
        }
      },
      "required": [
        "material",
        "color"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "track_order",
    "title": "Track a DrMaker3D order",
    "description": "The stage of a DrMaker3D order (received, printing, finishing, shipped, delivered), its ship-by day and arrival window, and tracking when shipped. Needs the order number (like DM1015) and the email the order was placed with; only that order is ever returned.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "order_number": {
          "type": "string",
          "description": "For example DM1015."
        },
        "email": {
          "type": "string",
          "description": "The email used at checkout."
        }
      },
      "required": [
        "order_number",
        "email"
      ],
      "additionalProperties": false
    }
  }
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `printcraft error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class PrintcraftClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).DRMAKER3D_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "printcraft", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): PrintcraftClient {
  return new PrintcraftClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new PrintcraftClient(deps).callTool(name, args);
}
