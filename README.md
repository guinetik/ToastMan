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

## Tech Stack

- Vue 3 + Composition API
- Vite
- Custom components (no heavy UI framework)

## License

Apache 2.0
