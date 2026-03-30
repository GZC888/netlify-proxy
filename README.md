# 优雅反向代理服务 🌐

<div align="center">

[![Netlify Status](https://api.netlify.com/api/v1/badges/6416e9cf-0327-f12b-0d7b-6cb/deploy-status)](https://app.netlify.com/sites/fd-gally/deploys)
![Edge Functions](https://img.shields.io/badge/Edge_Functions-00C7B7?style=flat-square&logo=netlify&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)

*一个基于 Netlify Edge Functions 的强大反向代理服务，支持任意网站内容代理和路径重写。*

 [📝 源代码](https://github.com/gally16/netlify-proxy)

</div>

---

## ✨ 特性

- 🔄 **多站点代理** - 预配置多个网站，通过简单路径访问
- 🌍 **通用代理** - 使用 `/proxy/` 前缀代理任意 URL
- 🖼️ **资源重写** - 自动修复 CSS、JavaScript 和图片路径
- 📱 **响应式处理** - 完美支持动态加载的内容和交互功能
- 📘 **确保代理请求** - 移除了可能限制跨域加载的安全头
- 🔓 **CORS 支持** - 自动添加跨域头，解决 API 访问限制
- 📘 **支持流媒体** - 实现了完整的视频播放器功能，支持 HLS 流媒体格式
- ⚡ **高性能** - 利用 Netlify Edge Functions 全球分布式网络

---

## 🚀 使用方法

### 预配置网站

访问以下路径即可使用预配置的网站：

```
https://xxxx.netlify.app/hexo2       # Hexo 博客
https://xxxx.netlify.app/halo      # Halo 博客
https://xxxx.netlify.app/tv        # libre tv 影视站
https://xxxx.netlify.app/news      # 新闻聚合
```

### API 代理

使用以下路径访问各种 AI 和第三方 API 服务：

```
https://xxxx.netlify.app/openai    # OpenAI API
https://xxxx.netlify.app/claude    # Claude/Anthropic API
https://xxxx.netlify.app/gemini    # Google Gemini API
```

更多 API 请参考配置文件。

### 通用代理（特殊网址可能不支持）

代理任意 URL，支持两种格式：

```
# 直接使用目标 URL
https://xxxx.netlify.app/proxy/https://example.com/path

# URL 编码的形式
https://xxxx.netlify.app/proxy/https%3A%2F%2Fexample.com%2Fpath
```

---

## 🛠️ 技术实现

- 🔷 **Netlify Edge Functions** - 在全球边缘节点执行代理逻辑
- 📘 **TypeScript** - 类型安全的代码实现
- 🔍 **正则表达式** - 精确的资源路径重写
- 📝 **DOM 修改** - 动态内容加载修复
- 🔄 **资源缓存** - 智能缓存静态资源提升性能

<details>
<summary>详细架构图</summary>

```
┌─────────────┐       ┌───────────────────┐       ┌─────────────┐
│             │       │                   │       │             │
│   用户请求   │──────▶│  Netlify Edge     │──────▶│  目标服务器  │
│             │       │  Function Proxy   │       │             │
└─────────────┘       └───────────────────┘       └─────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │                 │
                      │  路径解析与匹配  │
                      │                 │
                      └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │                 │
                      │  内容替换与修复  │
                      │                 │
                      └─────────────────┘
```
</details>

---

## ⚙️ 自定义配置

在 `netlify/edge-functions/proxy-handler.ts` 文件中：

1. 修改 `PROXY_CONFIG` 对象添加新的代理规则：

```typescript
const PROXY_CONFIG = {
  "/新路径": "https://目标网站.com",
  "/proxy-api":    "https://my-api-backend.dev",
  // ...
};
```

2. 为特定网站添加专门优化：

```typescript
const SPECIAL_REPLACEMENTS = {
  '目标域名': [
    {
      pattern: /正则表达式/,
      replacement: (match) => '替换逻辑'
    }
  ]
};
```

---

## 📋 部署指南

### 方法一：一键部署

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/gally16/netlify-proxy)

### 方法二：手动部署

1. Fork [本项目](https://github.com/gally16/netlify-proxy)
2. 注册 [Netlify](https://netlify.com) 账号
3. 在 Netlify 中创建新站点并连接 GitHub 仓库
4. 使用默认设置部署

### 配置说明

部署完成后，根据需要修改 `netlify/edge-functions/proxy-handler.ts` 文件中的配置。

---

## 🌟 高级用例

- 🚫 **内容过滤** - 添加代码移除目标站点的广告和追踪器
- 🔗 **API 聚合** - 在一个域名下整合多个 API 服务
- 🔒 **地区解锁** - 通过 Edge Functions 全球网络访问地区限制内容

---

## ⚠️ 注意事项

- 请遵守目标网站的服务条款
- 避免代理敏感或受版权保护的内容
- 某些复杂网站可能需要额外配置才能正常工作
- 大流量使用可能受到 Netlify 免费计划的限制

---
## Star History

<a href="https://www.star-history.com/#gally16/netlify-proxy&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=gally16/netlify-proxy&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=gally16/netlify-proxy&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=gally16/netlify-proxy&type=Date" />
 </picture>
</a>

## 📄 许可证

[MIT License](LICENSE) © 2025

<div align="center">
  <sub>Made with ❤️ by <a href="https://github.com/gally16">gally16</a></sub>
</div> 
