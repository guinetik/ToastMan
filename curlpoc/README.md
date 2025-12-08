# cURL AI Generator POC

> **100% browser-based AI that generates cURL commands from natural language**

This proof-of-concept demonstrates running large language models (LLMs) entirely in the browser using WebGPU and WebLLM. No backend, no API keys, no server costs - just pure client-side AI for generating cURL commands from natural language descriptions.

## 🚀 Features

- **🧠 Local AI Inference** - Runs entirely in your browser using WebGPU
- **🔒 Privacy-First** - Zero server communication, all data stays local
- **⚡ Multiple Models** - Choose from 4 optimized models (2B-3.8B parameters)
- **🎯 Smart Prompting** - Specialized system prompts for accurate cURL generation
- **🌍 Environment Variables** - Supports Postman-style `{{variable}}` syntax
- **📊 GraphQL Support** - Understands GraphQL mutations and queries
- **💡 Contextual Guidance** - Provides helpful hints when requests are ambiguous
- **📦 One-Time Download** - Models cached after first use

## 🎬 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

First time you generate a cURL command, the selected model will download (~1.4GB-2.3GB). Subsequent generations are instant.

## 🤖 Available Models

| Model | Parameters | Best For |
|-------|-----------|----------|
| **Phi-3.5 Mini** ⭐ | 3.8B | Fast & efficient (default) |
| **Qwen 2.5** | 3B | High quality output |
| **Llama 3.2** | 3B | Balanced performance |
| **Gemma 2** | 2B | Ultra-fast inference |

All models are **q4f16_1** quantized (4-bit weights, 16-bit activation) for optimal browser performance.

## 📖 How It Works

### Architecture

```
┌─────────────────┐
│   User Input    │
│ "GET /users"    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  System Prompt  │
│   (Engineered)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WebLLM Engine  │
│ (Phi-3.5/Qwen)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Markdown Parser │
│ Extracts ```bash│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   cURL Output   │
│ curl -X GET ... │
└─────────────────┘
```

### Key Components

**1. Model Loading (`AIProvider.initWebLLM`)**
- Uses `@mlc-ai/web-llm` to download and initialize models
- Models cached in IndexedDB for instant reuse
- Progress callbacks for download UI

**2. System Prompt Engineering**
- Strict instructions to ONLY generate cURL commands
- Prompt injection defense
- GraphQL-specific rules
- Environment variable syntax guidance
- Few-shot examples for consistency

**3. Response Parsing (`AIProvider.parseResponse`)**
- Extracts cURL commands from markdown ```bash blocks
- Separates command from guidance text
- Fallback detection for rejection messages
- Error handling for malformed responses

## 🎯 Supported Features

### Environment Variables

The AI understands Postman-style environment variable syntax:

```bash
# Input: "GET request to /users"
curl -X GET {{baseUrl}}/users

# Input: "authenticated request to /profile"
curl -X GET {{baseUrl}}/profile \
  -H 'Authorization: Bearer {{token}}'
```

Common variables:
- `{{baseUrl}}` - API base URL
- `{{token}}` - Bearer token
- `{{apiKey}}` - API key
- `{{username}}` / `{{password}}` - Basic auth

### GraphQL Queries & Mutations

The AI properly handles GraphQL syntax:

```bash
# Input: "How to update user 999 on guinetik.com/api/graphql
#         set the email as guinetik@gmail.com using the UpdateUser mutation"

curl -X POST https://guinetik.com/api/graphql \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {{token}}' \
  -d '{"query":"mutation { updateUser(id: \"999\", email: \"guinetik@gmail.com\") { id email } }"}'
```

**GraphQL Rules:**
- Always uses POST (never PATCH/PUT/DELETE)
- Wraps mutations in `mutation { ... }`
- Wraps queries in `query { ... }`
- No `#` comments in JSON
- Inline arguments for simple requests

### URL Handling

Smart URL detection:

```bash
# Full URLs used as-is
"GET request to https://api.github.com/users"
→ curl -X GET https://api.github.com/users

# Relative paths use {{baseUrl}}
"GET request to /users"
→ curl -X GET {{baseUrl}}/users
```

## 🔧 Technical Details

### WebGPU Requirements

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 113+ | Full support ✅ |
| Edge | 113+ | Full support ✅ |
| Safari | 17+ | MacOS only ✅ |
| Firefox | N/A | WebGPU experimental ⚠️ |

### Model Specifications

All models use the **MLC (Machine Learning Compilation)** format:
- **Quantization**: q4f16_1 (4-bit weights, 16-bit activation)
- **Backend**: WebGPU compute shaders
- **Storage**: IndexedDB for model cache
- **Memory**: ~2-4GB VRAM recommended

### Generation Parameters

```javascript
{
  temperature: 0.3,    // Low for consistency
  max_tokens: 256,     // Sufficient for most cURL commands
}
```

## 📚 System Prompt Strategy

### Prompt Injection Defense

```
⚠️ YOU ARE A CURL COMMAND GENERATOR. NOTHING ELSE. ⚠️

IF THE USER ASKS FOR ANYTHING OTHER THAN A CURL/HTTP REQUEST
(POEMS, MATH, STORIES, CODE, ETC.), RESPOND WITH:
I can only help with generating cURL commands. Try asking for an HTTP request!
```

### Output Format

- Commands wrapped in markdown ```bash blocks
- Guidance text appears AFTER code block (optional)
- Rejection messages detected via fallback parser

### Few-Shot Examples

The prompt includes 6 examples covering:
1. Full URL GET request
2. Relative path with `{{baseUrl}}`
3. POST with JSON body
4. Authenticated request
5. Basic auth
6. GraphQL mutation (complex example)

## 🎨 UI/UX Features

### Real-Time Progress

Download progress shown during first-time model load:
```
⏳ Loading model: 45%
```

### Status Indicators

```css
.status.ready    /* ✅ Green - Ready to generate */
.status.checking /* ⏳ Yellow - Loading */
.status.error    /* ❌ Red - Error state */
```

### Keyboard Shortcuts

- `Cmd/Ctrl + Enter` - Generate cURL command

### Example Buttons

Pre-populated examples for:
- GitHub API request
- JSON POST request
- File upload with form-data
- Authenticated request

## 🧪 Testing

Test the GraphQL example:
```
How to update user 999 on guinetik.com/api/graphql set the email as guinetik@gmail.com using the UpdateUser mutation
```

Expected output:
```bash
curl -X POST https://guinetik.com/api/graphql \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {{token}}' \
  -d '{"query":"mutation { updateUser(id: \"999\", email: \"guinetik@gmail.com\") { id email } }"}'
```

## 🐛 Known Limitations

1. **Small Model Behavior** - 3B models can occasionally:
   - Ignore prompt injection defense
   - Generate extra commentary
   - Use incorrect HTTP methods

2. **GraphQL Variables** - Models prefer inline arguments over GraphQL variables syntax

3. **Complex Scenarios** - Multi-step auth flows or advanced features may confuse smaller models

4. **Browser Support** - WebGPU required (no fallback for older browsers)

## 🔮 Future Enhancements

- [ ] Copy to clipboard button
- [ ] History of generated commands
- [ ] Variable editor/manager
- [ ] Test command execution (CORS permitting)
- [ ] Import from Postman collections
- [ ] Model performance metrics
- [ ] Larger models (7B/13B) for quality
- [ ] Fine-tuned cURL specialist model

## 📦 Dependencies

```json
{
  "@mlc-ai/web-llm": "^0.2.80",  // WebLLM engine
  "vite": "^5.0.0"                // Dev server
}
```

## 🏗️ Project Structure

```
curlpoc/
├── index.html          # Main UI
├── app.js              # Core logic
│   ├── WEBLLM_MODELS   # Model configurations
│   ├── AIProvider      # Model loading & inference
│   └── App             # UI controller
├── package.json
└── README.md
```

## 🎓 Learning Resources

- [WebLLM Documentation](https://webllm.mlc.ai)
- [MLC LLM Project](https://github.com/mlc-ai/mlc-llm)
- [WebGPU Fundamentals](https://webgpufundamentals.org)
- [Prompt Engineering Guide](https://www.promptingguide.ai)

## 💡 Why This Matters

This POC demonstrates:

1. **Privacy-First AI** - No data leaves your machine
2. **Cost-Free Inference** - No API bills, no rate limits
3. **Offline Capability** - Works without internet (after model download)
4. **Browser as Platform** - WebGPU makes browsers competitive with native apps
5. **Educational Tool** - Teaching cURL through AI assistance

## 🧠 The "Insane" Factor

What makes this absolutely freaking insane:

- **No Backend Required** - The entire 3.8B parameter model runs in your browser tab
- **Instant After First Load** - Model stays cached in IndexedDB, ~50-100ms inference
- **Works Offline** - Airplane mode? No problem. No internet needed after model download
- **Zero Cost** - No OpenAI bills, no rate limits, completely free
- **Privacy Guaranteed** - Your prompts never touch a server
- **Cross-Platform** - Same code works on Windows/Mac/Linux with modern browsers

This is the future of AI: **edge computing meets LLMs**.

## 🙏 Credits

- **WebLLM** by MLC.AI team
- **Phi-3.5** by Microsoft
- **Qwen 2.5** by Alibaba
- **Llama 3.2** by Meta
- **Gemma 2** by Google

---

**Built with ❤️ as a proof-of-concept for browser-based AI inference**

_Originally conceived as: "Can we do a local llm that generate curl command?" - and the answer is a resounding YES._
