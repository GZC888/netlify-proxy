import { Context } from "@netlify/edge-functions";

const PROXY_MAP: Record<string, string> = {
  // ===== 常见 API 服务 =====
  "/discord": "https://discord.com/api",
  "/telegram": "https://api.telegram.org",
  "/openai": "https://api.openai.com",
  "/claude": "https://api.anthropic.com",
  "/gemini": "https://generativelanguage.googleapis.com",
  "/meta": "https://www.meta.ai/api",
  "/groq": "https://api.groq.com/openai",
  "/xai": "https://api.x.ai",
  "/cohere": "https://api.cohere.ai",
  "/huggingface": "https://api-inference.huggingface.co",
  "/together": "https://api.together.xyz",
  "/novita": "https://api.novita.ai",
  "/portkey": "https://api.portkey.ai",
  "/fireworks": "https://api.fireworks.ai",
  "/openrouter": "https://openrouter.ai/api",

  // ===== 新增 API（不带 /v1）=====
  "/gmi": "https://api.gmi-serving.com",
  "/mistral": "https://api.mistral.ai",
  "/nvidia": "https://integrate.api.nvidia.com",
  "/vercel": "https://ai-gateway.vercel.sh",
  "/nebius": "https://api.tokenfactory.nebius.com",
  "/ollama": "https://ollama.com/api",
  "/ollma": "https://ollama.com/api",
};

const BLOCKED_REQUEST_HEADERS = new Set([
  // ===== Cloudflare / 来源 / 代理链 / IP =====
  "cf-connecting-ip",
  "cf-connecting-ipv6",
  "cf-ipcountry",
  "cf-ray",
  "cf-ew-via",
  "cf-pseudo-ipv4",
  "cf-visitor",
  "cf-worker",
  "cdn-loop",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "forwarded",
  "via",
  "x-real-ip",
  "true-client-ip",
  "client-ip",
  "fastly-client-ip",

  // ===== 由运行时自己处理更稳 =====
  "host",
  "content-length",
  "accept-encoding",

  // ===== 浏览器上下文 / 指纹 =====
  "cookie",
  "origin",
  "referer",
  "user-agent",
  "accept-language",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  "sec-fetch-user",
  "priority",
  "dnt",
]);

function buildMappedUrl(baseUrl: string, pathAfterPrefix: string, search: string): URL {
  const upstream = new URL(baseUrl);

  const basePath = upstream.pathname.replace(/\/+$/, "");
  const extraPath = pathAfterPrefix.replace(/^\/+/, "");

  const finalUrl = new URL(upstream.origin);
  finalUrl.pathname = extraPath
    ? `${basePath}/${extraPath}`.replace(/\/{2,}/g, "/")
    : (basePath || "/");

  finalUrl.search = search;
  return finalUrl;
}

function buildUpstreamHeaders(request: Request): Headers {
  const headers = new Headers();

  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (!BLOCKED_REQUEST_HEADERS.has(lower)) {
      headers.set(key, value);
    }
  }

  if (!headers.has("accept")) {
    headers.set("Accept", "application/json");
  }

  return headers;
}

function applyResponseHeaders(headers: Headers): Headers {
  const newHeaders = new Headers(headers);

  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "*");
  newHeaders.set("Access-Control-Expose-Headers", "*");

  // API 代理一般不需要上游 Cookie
  newHeaders.delete("Set-Cookie");

  // 避免部分上游策略影响前端调用
  newHeaders.delete("Content-Security-Policy");
  newHeaders.delete("Content-Security-Policy-Report-Only");
  newHeaders.delete("X-Frame-Options");

  return newHeaders;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  let finalUrl: URL | null = null;

  for (const [prefix, baseUrl] of Object.entries(PROXY_MAP)) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      const pathAfterPrefix = path.slice(prefix.length);
      finalUrl = buildMappedUrl(baseUrl, pathAfterPrefix, url.search);
      break;
    }
  }

  if (!finalUrl) {
    return;
  }

  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: applyResponseHeaders(new Headers()),
    });
  }

  try {
    const headers = buildUpstreamHeaders(request);

    const method = request.method.toUpperCase();
    const init: RequestInit = {
      method,
      headers,
      redirect: "follow",
    };

    if (method !== "GET" && method !== "HEAD") {
      init.body = request.body;
    }

    const response = await fetch(finalUrl.toString(), init);

    return new Response(response.body, {
      status: response.status,
      headers: applyResponseHeaders(response.headers),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Proxy Error: ${message}`, { status: 502 });
  }
};

export const config = {
  path: "/*",
};
