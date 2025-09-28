# ToastMan 🍞

A lightweight API testing tool built with Vue 3. Think Postman, but simpler and without the bloat.

## Why ToastMan?

Sometimes you need to test APIs but can't use Postman (company restrictions, offline environments, or you just want something lightweight). ToastMan gives you the core functionality you actually use without the enterprise features you don't.

## Features

- **HTTP Requests**: All standard methods (GET, POST, PUT, DELETE, etc.)
- **Collections**: Organize requests into folders
- **Environments**: Manage variables across different setups
- **Authentication**: Basic, Bearer, API Key, OAuth2, and more
- **Request Bodies**: JSON, form-data, URL-encoded, GraphQL support
- **History**: Track your recent requests
- **Resizable Layout**: Adjust panels to your preference

## Tech Stack

- **Vue 3** with Composition API
- **Vuetify** for Material Design components
- **Vite** for build tooling
- **Splitpanes** for resizable layout

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/          # Vue components
│   ├── tabs/           # Sidebar tab components
│   └── dialogs/        # Modal dialogs
├── controllers/        # Business logic (MVC pattern)
├── models/            # Data models
├── stores/            # State management
├── composables/       # Reusable composition functions
└── core/              # Utilities and constants
```

## Architecture

ToastMan uses an MVC-inspired architecture:

- **Models**: Handle data structure and validation (`Request`, `Collection`, `Environment`)
- **Controllers**: Manage business logic and state
- **Components**: Vue components for UI rendering

## Development Notes

### Key Models

- `Request`: HTTP request with URL, headers, body, auth
- `Collection`: Organized groups of requests
- `Environment`: Variable sets for different contexts
- `Response`: HTTP response data and metadata

### Debug Tools

Open browser console and use:

```javascript
// Enable logging for specific components
window.toastmanDebug.enableCollections()
window.toastmanDebug.enableStorage()

// Enable all logging
window.toastmanDebug.logAllComponents()

// Check logging status
window.toastmanDebug.status()
```

### Storage

Data is persisted to `localStorage`:
- Collections and requests
- Environment variables
- Application settings
- Request history

## Contributing

This is a learning project exploring Vue 3. Feel free to:

- Report bugs
- Suggest features
- Submit PRs
- Use it as reference for Vue 3 patterns

## License

Apache 2.0 - do whatever you want with it.
