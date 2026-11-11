# Hey, I'm Mehdi 👋

Founder and AI consultant · CFA Charterholder

I'm a CFA and a solo founder. I build and run small products with AI agents, and I help founders and small teams do the same, remotely.

## What I'm building

🏗️ **[Bina Capital](https://bina.capital)** — AI-powered investing for beginners. A "Zestimate for Stocks" that scores companies and matches them to investor profiles. Next.js · FastAPI · Supabase · Modal

✍️ **[RoboWrite.ai](https://robowrite.ai)** — Content operations platform for agencies. Paste a URL, extract brand voice, generate SEO-scored content, publish to CMS. Next.js · Python · LangChain · Temporal

🔧 **[Grounded.Codes](https://grounded.codes)** — Decision intelligence for AI coding agents. Not docs retrieval — *which library to use*, pinned to your lockfile. MCP server for Cursor, Claude Code, and Windsurf.

All three ship under [M Powered Ventures](https://mpowered.ventures).

## Open source

- **[fmp-data](https://github.com/MehdiZare/fmp-data)** — Python client for Financial Modeling Prep API ⭐ 12
- **[langchain-fmp-data](https://github.com/MehdiZare/langchain-fmp-data)** — LangChain integration for fmp-data
- **[pantstack](https://github.com/MehdiZare/pantstack)** — Pants + Pulumi AWS monorepo template (FastAPI, CI/CD, PR previews)

## Stack I reach for

`Python` `FastAPI` `Next.js` `React` `TypeScript` `LangChain` `LangGraph` `Supabase` `AWS Bedrock` `Databricks` `Modal` `Railway` `Vercel`

## Writing

I write about AI + finance on [Seeking Alpha](https://seekingalpha.com/author/mehdi-zare) (536+ followers, 80K+ readers) and technical deep dives on [Medium](https://medium.com/@mehdi-zare).

## Connect

[LinkedIn](https://linkedin.com/in/mehdizare) · [𝕏](https://twitter.com/mehdizare) · [mehdi-zare.com](https://mehdi-zare.com)

## After a deploy

Run `pnpm check:media` (or `pnpm check:media https://<preview-url>`; post pages are then read from that origin) after every deploy and after any CMS media change. It fetches `sitemap.xml`, every `<image:loc>`, and each post's `og:image`, `twitter:image` and JSON-LD `image`, and exits non-zero on anything that is not HTTP 200 with an `image/*` content type. The site hides a dead CMS image from visitors with a fallback tile, but crawlers and social cards get the 404, so this check is how you find out.
