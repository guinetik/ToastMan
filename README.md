# ToastMan

**The API testing tool that teaches you cURL.**

Build requests visually, see the cURL command. Paste cURL commands, see them broken down. Learn cURL without even trying.

![ToastMan](public/social_image.png)

## The Trick

Every API doc gives you a cURL command. But if you don't know cURL, you're stuck copying it blindly or manually translating it to Postman.

ToastMan works both ways:
- **Visual → cURL**: Build a request with forms, see the equivalent cURL command
- **cURL → Visual**: Paste a cURL command, see it broken down into method, headers, body

Switch between modes anytime. The more you use it, the more cURL starts making sense.

## Features

- **Two-way sync**: Visual mode and cURL mode stay in sync
- **AI Chat Assistant**: Generate cURL commands from natural language (100% local, runs in browser via WebGPU)
- **cURL tutorial**: Built-in reference for common cURL options
- **Environment variables**: Use `{{baseUrl}}`, `{{apiKey}}` with live highlighting
- **Conversation view**: See request/response history as a thread
- **Collections**: Save and organize requests
- **Postman compatible**: Import/export collections and environments
- **Offline PWA**: No account, no cloud, works offline

## Quick Start

```bash
npm install
npm run dev
```

Or visit [toastman.guinetik.com](https://toastman.guinetik.com)

## How It Works

1. **Start visual**: Fill in URL, headers, body → see the cURL command update live
2. **Or paste cURL**: Drop in a command from docs → see it broken down into fields
3. **Send it**: See the response in the conversation thread
4. **Learn**: After a while, you'll be writing cURL commands from memory

Variables like `{{token}}` highlight red (undefined) or blue (found in environment).

## AI Chat Assistant

**Generate cURL commands using natural language - 100% private, runs locally in your browser.**

### How It Works

1. Click the **"✨ AI Chat"** tab in the composer
2. Type what you want in plain English:
   - "GET request to GitHub API for user octocat"
   - "POST JSON data to create a new user"
   - "GraphQL mutation to update user email"
3. AI generates the cURL command with syntax highlighting
4. Click **"Send to Composer"** to load it into the editor
5. Hit Send to execute

### Privacy & Performance

- **100% Local**: Runs entirely in your browser via WebGPU
- **No API Calls**: Zero data sent to external servers
- **Offline**: Works without internet after first model download
- **Fast**: ~100ms inference after model loads
- **Private**: Your requests never leave your machine

### Models Available

Choose from 4 optimized models:
- **Phi-3.5 Mini** (3.8B params, ~2.3GB) - Recommended, best balance
- **Qwen 2.5** (3B params, ~1.9GB) - High quality
- **Llama 3.2** (3B params, ~1.9GB) - Balanced performance
- **Gemma 2** (2B params, ~1.4GB) - Ultra fast, lower resource usage

### Requirements

- Modern browser with WebGPU support:
  - Chrome/Edge 113+
  - Safari 17+ (macOS only)
- ~2-4GB VRAM recommended
- ~2GB storage for model cache (first download only)

### Features

- **Smart Variable Detection**: Automatically uses `{{baseUrl}}`, `{{token}}` when appropriate
- **GraphQL Support**: Generates properly formatted GraphQL mutations/queries
- **Auth Handling**: Detects and adds Bearer tokens, Basic auth, API keys
- **Conversation History**: AI chats save alongside your request history
- **Syntax Highlighting**: Generated commands display with full cURL syntax highlighting

## Tech Stack

- Vue 3 + Composition API
- Vite
- Custom components (no heavy UI framework)
- WebLLM (@mlc-ai/web-llm) - Browser-based LLM inference via WebGPU

## License

Apache 2.0
