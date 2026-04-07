import { Context } from "@netlify/edge-functions";
import { HTMLRewriter } from "https://ghuc.cc/worker-tools/html-rewriter/index.ts";

// 1. 定义你的路径映射表
// 注意：这里允许填写“带子路径”的上游基址，例如 /v1 或 /api
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

  // ===== 新增 API =====
  "/gmi": "https://api.gmi-serving.com/v1",
  "/gmi-cloud": "https://api.gmi-serving.com/v1",
  "/mistral": "https://api.mistral.ai/v1",
  "/nvidia": "https://integrate.api.nvidia.com/v1",
  "/vercel-ai": "https://ai-gateway.vercel.sh/v1",
  "/vercel-ai-gateway": "https://ai-gateway.vercel.sh/v1",

  // Nebius 这里改成你自己的 endpoint
  // 例如: https://xxxx.apps.eu-north1.nebius.cloud/v1
  "/nebius": "https://YOUR-NEBIUS-ENDPOINT/v1",

  // Ollama Cloud API
  "/ollama": "https://ollama.com/api",
  "/ollma": "https://ollama.com/api",

  // ===== 网站代理 =====
  "/hexo": "https://hexo-gally.vercel.app",
  "/hexo2": "https://hexo-987.pages.dev",
  "/halo": "https://blog.gally.dpdns.org",
  "/kuma": "https://kuma.gally.dpdns.org",
  "/hf": "https://huggingface.co",
  "/tv": "https://tv.gally.ddns-ip.net",
  "/news": "https://newsnow-ahm.pages.dev"
};

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

function applyProxyHeaders(headers: Headers): Headers {
  const newHeaders = new Headers(headers);

  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "*");
  newHeaders.set("Access-Control-Expose-Headers", "*");

  // 放宽一些常见限制，便于前端页面在代理后运行
  newHeaders.delete("Content-Security-Policy");
  newHeaders.delete("Content-Security-Policy-Report-Only");
  newHeaders.delete("X-Frame-Options");

  return newHeaders;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  let matchedBaseUrl = "";
  let finalUrl: URL | null = null;

  // 2. 逻辑 A: 匹配固定别名映射
  for (const [prefix, baseUrl] of Object.entries(PROXY_MAP)) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      matchedBaseUrl = baseUrl;
      const pathAfterPrefix = path.slice(prefix.length);
      finalUrl = buildMappedUrl(baseUrl, pathAfterPrefix, url.search);
      break;
    }
  }

  // 3. 逻辑 B: 匹配通用代理路径 /proxy/...
  if (!finalUrl && path.startsWith("/proxy/")) {
    const rawTarget = path.slice(7); // 去掉 "/proxy/"
    try {
      const targetUrlString = rawTarget.startsWith("http") ? rawTarget : `https://${rawTarget}`;
      finalUrl = new URL(targetUrlString);
      finalUrl.search = url.search;
      matchedBaseUrl = finalUrl.origin;
    } catch {
      return new Response("Invalid Proxy URL", { status: 400 });
    }
  }

  // 如果都不匹配，交给 Netlify 处理（如展示首页）
  if (!finalUrl) {
    return;
  }

  // 4. 处理 CORS 预检请求
  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: applyProxyHeaders(new Headers()),
    });
  }

  try {
    // 5. 构造请求头
    const headers = new Headers(request.headers);
    headers.set("Host", finalUrl.host);
    headers.set("Origin", finalUrl.origin);
    headers.set("Referer", `${finalUrl.origin}/`);

    // 移除可能导致递归、鉴权异常或长度错误的头
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("content-length");

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
    const contentType = response.headers.get("content-type") || "";

    // 6. 针对 HTML 进行重写
    if (contentType.includes("text/html")) {
      const upstreamBase = new URL(matchedBaseUrl || finalUrl.origin);
      const baseHref = `${upstreamBase.origin}${upstreamBase.pathname.replace(/\/?$/, "/")}`;

      const transformed = new HTMLRewriter()
        .on("head", {
          element(element) {
            element.prepend(`<base href="${baseHref}">`, { html: true });
          },
        })
        .on("a", {
          element(_element) {
            // 如果你想让页面内链接继续走代理，可以在这里扩展改写逻辑
          },
        })
        .transform(response);

      return new Response(transformed.body, {
        status: transformed.status,
        headers: applyProxyHeaders(transformed.headers),
      });
    }

    // 7. 处理 API 和其他资源（CSS/JS/图片）
    return new Response(response.body, {
      status: response.status,
      headers: applyProxyHeaders(response.headers),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Proxy Error: ${message}`, { status: 502 });
  }
};

// 匹配所有路径，由内部逻辑判断
export const config = {
  path: "/*",
};
