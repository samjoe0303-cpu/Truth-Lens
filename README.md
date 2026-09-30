<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ae433f76-3169-41f9-8fa1-7e60917d1273

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `NEWS_API_KEY` in [.env.local](.env.local) for news search. Add `GEMINI_API_KEY` if using Gemini analysis.
3. Run the app:
   `npm run dev`

## News Search

TruthLens uses NewsAPI.org to retrieve relevant news articles before analysis. Add your key to `.env` or `.env.local`:

```env
NEWS_API_KEY=your-newsapi-key
```

Restart TruthLens after changing environment variables. Check NewsAPI's current plan for request limits and production-use restrictions.

The News URL tab fetches the article page before analysis. Pages that require JavaScript to render or restrict automated access may not provide readable article text.

## NVIDIA Inference API

To use NVIDIA's OpenAI-compatible vision endpoint, set these runtime variables in `.env` or `.env.local`:

```env
LLM_PROVIDER=nvidia
NVIDIA_API_KEY=your-nvidia-api-key
NVIDIA_MODEL=deepseek-ai/deepseek-v4.1-flash
```

NVIDIA mode supports text, images, and text files. Uploaded PDFs still require Gemini. When Gemini returns a temporary 503, TruthLens will try NVIDIA automatically if `NVIDIA_API_KEY` is set. NVIDIA API access may have rate limits or usage charges; check the provider's current terms.

When `NVIDIA_API_KEY` is configured, image uploads are first read by `nvidia/nemotron-parse-2.0`. The extracted text is used to build a more relevant web search and is included in the fact-check prompt. This OCR request is made regardless of the selected analysis provider.
