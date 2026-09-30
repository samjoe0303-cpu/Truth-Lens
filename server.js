import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { lookup } from 'node:dns/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { load } from 'cheerio';
import ipaddr from 'ipaddr.js';

dotenv.config({ path: ['.env.local', '.env'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractJsonFromText(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\s*/i, '').replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse verification results from model response.');
  }
}

function getNvidiaClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured in environment variables.');

  return new OpenAI({
    apiKey,
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  });
}

function getNvidiaMessageText(completion) {
  const content = completion.choices[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.type === 'text' ? part.text : '').join('\n');
  }
  return '';
}

function isModelUnavailable(error) {
  const message = String(error?.message || error || '');
  return error?.status === 503 || error?.statusCode === 503 || /\b503\b|UNAVAILABLE|high demand/i.test(message);
}

async function generateWithNvidia(contents, systemInstruction) {
  const client = getNvidiaClient();
  const model = process.env.NVIDIA_MODEL || 'deepseek-ai/deepseek-v4.1-flash';
  const parts = typeof contents === 'string' ? [{ text: contents }] : contents.parts || [];
  const userContent = [];

  for (const part of parts) {
    if (part.text) userContent.push({ type: 'text', text: part.text });
    if (!part.inlineData) continue;

    if (part.inlineData.mimeType?.startsWith('image/')) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        },
      });
    } else if (part.inlineData.mimeType?.startsWith('text/')) {
      userContent.push({
        type: 'text',
        text: Buffer.from(part.inlineData.data, 'base64').toString('utf8'),
      });
    } else {
      throw new Error('NVIDIA mode supports text and images, but not PDF or video files. Use Gemini for these file types.');
    }
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      top_p: 0.95,
      max_tokens: 4096,
      stream: false,
    });
    const text = getNvidiaMessageText(completion);
    if (!text) throw new Error('NVIDIA returned an empty response.');
    return { text };
  } catch (error) {
    if (error?.status === 503 || error?.status === 429) {
      throw new Error('The NVIDIA model is temporarily busy or rate-limited. Retry shortly.');
    }
    throw error;
  }
}

async function extractImageTextWithNvidia(file) {
  try {
    const completion = await getNvidiaClient().chat.completions.create({
      model: 'nvidia/nemotron-parse-2.0',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: '</s><s><predict_bbox><predict_classes><output_markdown><predict_text_in_pic>',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${file.mimeType};base64,${file.base64}`,
            },
          },
        ],
      }],
      temperature: 0,
      top_p: 1,
      max_tokens: 1024,
      stream: false,
    });
    const extractedText = getNvidiaMessageText(completion).trim();
    if (!extractedText) throw new Error('NVIDIA returned no readable text for this image.');
    return extractedText;
  } catch (error) {
    if (error?.status === 503 || error?.status === 429) {
      throw new Error('NVIDIA image text extraction is temporarily busy or rate-limited. Retry shortly.');
    }
    throw new Error(`NVIDIA image text extraction failed: ${error?.message || 'Check NVIDIA_API_KEY and model access.'}`);
  }
}

function supportsVisionProviderInput(type, file) {
  return type === 'text' ||
    type === 'url' ||
    (type === 'file' && (file.mimeType.startsWith('image/') || file.mimeType.startsWith('text/')));
}

async function assertPublicArticleUrl(url) {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Enter a public HTTP or HTTPS news article URL.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Local and private URLs cannot be fetched. Enter a public news article URL.');
  }

  let addresses;
  if (ipaddr.isValid(hostname)) {
    addresses = [{ address: hostname }];
  } else {
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error('The news URL hostname could not be resolved. Check the URL and try again.');
    }
  }

  if (!addresses.length || addresses.some(({ address }) => ipaddr.process(address).range() !== 'unicast')) {
    throw new Error('The news URL must resolve to a public internet address.');
  }
}

async function fetchNewsArticle(articleUrl) {
  let currentUrl;
  try {
    currentUrl = new URL(articleUrl);
  } catch {
    throw new Error('Enter a valid news article URL.');
  }

  let response;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    await assertPublicArticleUrl(currentUrl);
    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'TruthLens/1.0 (news article verification)',
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (error.name === 'TimeoutError') throw new Error('Fetching the news article timed out.');
      throw new Error('Could not fetch the news article. Check the URL and try again.');
    }

    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location || redirectCount === 3) throw new Error('The news article redirected too many times.');
    currentUrl = new URL(location, currentUrl);
  }

  if (!response.ok) throw new Error(`The news site returned HTTP ${response.status}.`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error('That URL does not point to an HTML news article.');
  }

  const maxBytes = 4 * 1024 * 1024;
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new Error('The news page is too large to analyze.');

  const reader = response.body?.getReader();
  if (!reader) throw new Error('The news page returned no readable content.');
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error('The news page is too large to analyze.');
    }
    chunks.push(Buffer.from(value));
  }

  const $ = load(Buffer.concat(chunks).toString('utf8'));
  const title = $('meta[property="og:title"]').attr('content')?.trim() ||
    $('meta[name="twitter:title"]').attr('content')?.trim() ||
    $('title').first().text().trim();
  const description = $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() || '';

  $('script, style, noscript, svg, nav, header, footer, aside, form').remove();
  const articleElement = $('article').first();
  const bodyText = (articleElement.length ? articleElement.text() : $('main').text() || $('body').text())
    .replace(/\s+/g, ' ')
    .trim();
  const articleText = [description, bodyText].filter(Boolean).join('\n\n').slice(0, 20_000);
  if (articleText.length < 40) {
    throw new Error('Could not extract readable article text from that page. Try pasting the article text instead.');
  }

  return {
    url: currentUrl.href,
    title: title || currentUrl.hostname,
    description,
    text: articleText,
  };
}

// Retrieve recent news articles for the claim from NewsAPI.
async function liveWebSearch(query) {
  const cleanQuery = query.replace(/[^\w\s\-\.\,\'\"]/g, ' ').slice(0, 150).trim();
  if (!cleanQuery) return [];

  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) throw new Error('NEWS_API_KEY is not configured in environment variables.');

  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', cleanQuery);
  url.searchParams.set('searchIn', 'title,description');
  url.searchParams.set('sortBy', 'relevancy');
  url.searchParams.set('pageSize', '6');
  url.searchParams.set('language', 'en');

  let response;
  try {
    response = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError') throw new Error('NewsAPI search timed out. Please try again.');
    throw new Error('Could not reach NewsAPI. Check your internet connection and try again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== 'ok') {
    throw new Error(data.message || `NewsAPI returned HTTP ${response.status}.`);
  }

  return (data.articles || [])
    .filter((article) => article.title && article.url && article.url.startsWith('http'))
    .map((article) => ({
      title: article.title,
      url: article.url,
      snippet: article.description || '',
    }));
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Verification analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { type, text, file, articleUrl } = req.body;

    if (!type || !['text', 'file', 'url'].includes(type)) {
      return res.status(400).json({ error: 'Invalid input type. Must be "text", "file", or "url".' });
    }

    if (type === 'text' && (!text || !text.trim())) {
      return res.status(400).json({ error: 'Please provide a news article, claim, or statement to analyze.' });
    }

    if (type === 'file' && (!file || !file.base64 || !file.mimeType)) {
      return res.status(400).json({ error: 'Please select a valid file (image, PDF, or text file) to analyze.' });
    }

    if (type === 'url' && (!articleUrl || !articleUrl.trim())) {
      return res.status(400).json({ error: 'Please provide a news article URL to analyze.' });
    }

    const llmProvider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    if (!['gemini', 'nvidia'].includes(llmProvider)) {
      throw new Error('LLM_PROVIDER must be either "gemini" or "nvidia".');
    }

    // 1. Recency: Inject today's date dynamically using new Date()
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const fetchedArticle = type === 'url' ? await fetchNewsArticle(articleUrl.trim()) : null;

    let extractedImageText = '';
    if (type === 'file' && file.mimeType.startsWith('image/') && process.env.NVIDIA_API_KEY) {
      extractedImageText = await extractImageTextWithNvidia(file);
    }

    // Search using recognized image text when available, otherwise use the supplied text or filename.
    let searchQuery = '';
    if (type === 'text') {
      searchQuery = text.trim();
    } else if (type === 'file') {
      searchQuery = (extractedImageText || file.name || 'news claim').replace(/\.[a-zA-Z0-9]+$/, '');
    } else if (type === 'url') {
      searchQuery = [fetchedArticle.title, fetchedArticle.description].filter(Boolean).join(' ') || fetchedArticle.text.slice(0, 150);
    }

    const liveSources = await liveWebSearch(searchQuery);

    let searchContextText = '';
    if (liveSources.length > 0) {
      searchContextText = `\nREAL-TIME WEB SEARCH RESULTS FOR THIS CLAIM (${formattedDate}):\n` +
        liveSources.map((s, i) => `${i + 1}. Title: "${s.title}"\n   URL: ${s.url}`).join('\n') +
        '\nUse these verified sources and their exact URLs to verify the claim.\n';
    }

    // Exact instructions matching prompt requirements
    const systemInstruction = `You are TruthLens. Evaluate the accuracy of this claim using search results.
Today's date is ${formattedDate}. Many claims are about events from the last few weeks or days. Your training data does not cover them. Never mark a claim False just because you don't recognize it. You must search first.

VERIFICATION PROCESS (Follow this exact order):
1. Search the web for the key names, event, and date in the claim. Prefer results from established news outlets, official sites, and fact-checkers.
2. Verdict rules:
   - True / Mostly True: reliable sources report the same core facts.
   - False: ONLY if reliable sources directly contradict the claim or a fact-checker has debunked it.
   - Unverifiable: if searches return nothing relevant.
   - If the core facts are confirmed but small details (such as a quote) are not, return Mostly True and list the unverified detail separately. Do not mark the whole claim False.
3. Safety net: If the verdict is False but no source contradicts the claim, automatically change it to Unverifiable.
4. Supporting sources: For each verdict, show the supporting sources with the titles and URLs returned by search grounding, and explain WHY the verdict was chosen based on the evidence.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this schema:
{
  "overall_verdict": "True" | "Mostly True" | "Misleading" | "Mostly False" | "False" | "Unverifiable",
  "confidence": 10-98,
  "summary": "2-3 sentence plain-language explanation of findings and WHY this verdict was chosen.",
  "claims": [
    {
      "claim": "Specific factual assertion evaluated (max 5 claims)",
      "verdict": "True" | "Mostly True" | "Misleading" | "Mostly False" | "False" | "Unverifiable",
      "explanation": "Clear explanation of why this verdict was chosen based on the supporting sources.",
      "sources": [
        { "title": "Source name or headline", "url": "https://..." }
      ]
    }
  ],
  "unverified_details": [
    "Any small unverified detail (such as an exact quote or minor secondary figure) if core facts are confirmed"
  ],
  "red_flags": [
    "Any factual discrepancies or missing context (empty array if none)"
  ],
  "tips": "How the user can independently verify this claim."
}`;

    const parts = [];
    let promptContent = '';
    if (type === 'text') {
      promptContent = `Today's date is ${formattedDate}. Many claims are about events from the last few weeks or days. Your training data does not cover them. Never mark a claim False just because you don't recognize it. You must search first.

Evaluate the accuracy of this claim using search results:

"""
${text.trim()}
"""
${searchContextText}
Follow the search-first workflow and verdict rules:
- True / Mostly True: reliable sources report the same core facts.
- False: ONLY if reliable sources directly contradict the claim or a fact-checker has debunked it.
- Unverifiable: if searches return nothing relevant.
- If core facts are confirmed but small details are not, return Mostly True and list the unverified detail separately. Do not mark the whole claim False.
- If the verdict is False but no source contradicts the claim, change it to Unverifiable.
For each verdict, show the supporting sources with titles and URLs, and explain WHY the verdict was chosen.`;
    } else if (type === 'file') {
      parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
      promptContent = `Today's date is ${formattedDate}. Many claims are about events from the last few weeks or days. Your training data does not cover them. Never mark a claim False just because you don't recognize it. You must search first.

Evaluate the accuracy of the assertions made in this attached ${file.mimeType} file ("${file.name || 'document'}").
${extractedImageText ? `\nText extracted from the image by NVIDIA Nemotron Parse:\n"""\n${extractedImageText}\n"""\n` : ''}
${searchContextText}
Follow the search-first workflow and verdict rules. Show supporting sources and explain why the verdict was chosen.`;
    } else if (type === 'url') {
      promptContent = `Today's date is ${formattedDate}. Evaluate the factual claims in this fetched news article. Treat the article as the subject being checked, not as independent confirmation.

Article title: ${fetchedArticle.title}
Article URL: ${fetchedArticle.url}
Article text:
"""
${fetchedArticle.text}
"""
${searchContextText}
Follow the search-first workflow and verdict rules. Cite independent supporting or contradicting sources and explain why the verdict was chosen.`;
    }

    parts.push({ text: promptContent });
    const contents = parts.length === 1 ? parts[0].text : { parts };
    let response = null;
    let usedSearchGrounding = false;

    if (llmProvider === 'nvidia') {
      response = await generateWithNvidia(contents, systemInstruction);
    } else {
      const ai = getGeminiClient();

      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
          },
        });
        if (response && response.text) usedSearchGrounding = true;
      } catch {
        // Continue to direct call if tool call encounters quota
      }

      if (!response || !response.text) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction: systemInstruction + '\nReturn ONLY a valid JSON object matching the requested schema.',
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
        } catch {
          try {
            response = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents,
              config: {
                systemInstruction: systemInstruction + '\nReturn ONLY a valid JSON object matching the requested schema.',
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            });
          } catch (geminiError) {
            if (!isModelUnavailable(geminiError)) throw geminiError;

            const fallbackSupportsInput = supportsVisionProviderInput(type, file);

            if (fallbackSupportsInput && process.env.NVIDIA_API_KEY) {
              try {
                response = await generateWithNvidia(contents, systemInstruction);
              } catch {
                // Try the configured local model if NVIDIA is unavailable.
              }
            }

            if (!response || !response.text) {
              throw new Error('Gemini is temporarily at capacity (503). Retry shortly or configure NVIDIA_API_KEY for NVIDIA fallback.');
            }
          }
        }
      }
    }

    if (!response || !response.text) {
      throw new Error('Analysis could not be completed. Please try again in a few moments.');
    }

    const responseText = response.text || '';
    const parsedData = extractJsonFromText(responseText);

    // Extract grounding URLs from Google Search grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = [];

    for (const chunk of groundingChunks) {
      if (chunk.web && chunk.web.uri) {
        webSources.push({
          title: chunk.web.title || new URL(chunk.web.uri).hostname,
          url: chunk.web.uri,
        });
      }
    }

    // Merge in live search sources retrieved from web search
    for (const src of liveSources) {
      if (!webSources.some((w) => w.url === src.url)) {
        webSources.push({ title: src.title, url: src.url });
      }
    }

    // Process and validate individual claims
    if (Array.isArray(parsedData.claims)) {
      parsedData.claims = parsedData.claims.map((c, index) => {
        let sources = Array.isArray(c.sources) ? c.sources : [];
        sources = sources.filter((s) => s && s.url && s.url.startsWith('http'));

        // If claim sources are empty but we have search sources, associate them
        if (sources.length === 0 && webSources.length > 0) {
          const sliceStart = (index * 2) % webSources.length;
          sources = webSources.slice(sliceStart, sliceStart + 2);
        }

        let claimVerdict = c.verdict || c.status || 'Unverifiable';

        // SAFETY NET: If claim is False but no source contradicts the claim, change to Unverifiable
        if ((claimVerdict === 'False' || claimVerdict === 'Mostly False') && sources.length === 0) {
          claimVerdict = 'Unverifiable';
          c.explanation = (c.explanation ? c.explanation + ' ' : '') +
            '(Classified as Unverifiable because no reliable sources were found directly contradicting this claim; absence of evidence is not proof of falsehood.)';
        }

        return {
          claim: c.claim || 'Unspecified assertion',
          verdict: claimVerdict,
          explanation: c.explanation || c.evidence || 'No explanation provided.',
          sources,
        };
      });
    } else {
      parsedData.claims = [];
    }

    // Collect all supporting sources across claims and grounding chunks
    const allSupportingSources = [
      ...webSources,
      ...parsedData.claims.flatMap((c) => c.sources || []),
    ].filter((s) => s && s.url && s.url.startsWith('http'));

    // Deduplicate sources by URL
    const uniqueSources = [];
    const seen = new Set();
    for (const s of allSupportingSources) {
      if (!seen.has(s.url)) {
        seen.add(s.url);
        uniqueSources.push(s);
      }
    }

    // Validate overall verdict
    const validVerdicts = ['True', 'Mostly True', 'Misleading', 'Mostly False', 'False', 'Unverifiable'];
    if (!validVerdicts.includes(parsedData.overall_verdict)) {
      const lower = (parsedData.overall_verdict || '').toLowerCase();
      if (lower.includes('mostly true')) {
        parsedData.overall_verdict = 'Mostly True';
      } else if (lower.includes('true')) {
        parsedData.overall_verdict = 'True';
      } else if (lower.includes('mostly false')) {
        parsedData.overall_verdict = 'Mostly False';
      } else if (lower.includes('false')) {
        parsedData.overall_verdict = 'False';
      } else if (lower.includes('mislead')) {
        parsedData.overall_verdict = 'Misleading';
      } else {
        parsedData.overall_verdict = 'Unverifiable';
      }
    }

    // SAFETY NET: If the verdict is False but no source contradicts the claim, automatically change it to Unverifiable
    if ((parsedData.overall_verdict === 'False' || parsedData.overall_verdict === 'Mostly False') && uniqueSources.length === 0) {
      parsedData.overall_verdict = 'Unverifiable';
      parsedData.summary = (parsedData.summary ? parsedData.summary + ' ' : '') +
        'Note: Changed to Unverifiable because no reliable sources directly contradict or debunk this claim. Absence of evidence is not evidence that the claim is false.';
      if (parsedData.confidence > 45) {
        parsedData.confidence = 25;
      }
    }

    // If searches return nothing relevant, overall verdict is Unverifiable
    if (uniqueSources.length === 0 && parsedData.overall_verdict !== 'Unverifiable') {
      parsedData.overall_verdict = 'Unverifiable';
      parsedData.confidence = Math.min(parsedData.confidence || 25, 30);
    }

    // Confidence bound between 10 and 98 (never claim 100%)
    let rawConfidence = parsedData.confidence;
    if (typeof rawConfidence === 'string') {
      rawConfidence = parseInt(rawConfidence.replace(/[^0-9]/g, ''), 10);
    }
    let confidence = typeof rawConfidence === 'number' && !isNaN(rawConfidence) ? Math.round(rawConfidence) : 70;
    if (confidence > 98) confidence = 98;
    if (confidence < 10) confidence = 15;
    parsedData.confidence = confidence;

    // Return final analysis payload
    const result = {
      ...parsedData,
      grounded_sources: uniqueSources,
      used_live_search: usedSearchGrounding || liveSources.length > 0,
      analyzed_at: now.toISOString(),
      current_date: formattedDate,
      input_type: type,
      input_title: text
        ? (text.slice(0, 90) + (text.length > 90 ? '...' : ''))
        : (fetchedArticle?.title || file?.name || 'Media Analysis'),
      input_url: fetchedArticle?.url,
    };

    return res.json(result);
  } catch (error) {
    const errorMessage = error?.message || 'Failed to complete fact-checking analysis.';
    return res.status(500).json({
      error: errorMessage.includes('GEMINI_API_KEY') 
        ? 'Gemini API key is not configured. Please check Settings > Secrets.' 
        : errorMessage.includes('NVIDIA_API_KEY')
          ? 'NVIDIA API key is not configured. Add NVIDIA_API_KEY to your environment.'
        : errorMessage,
    });
  }
});

// Serve frontend with Vite in dev mode, or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TruthLens server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting TruthLens server:', err);
});
