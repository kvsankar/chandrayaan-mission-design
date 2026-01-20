# Landing Page Configuration

## Overview

The landing page (`index.html`) uses a **JSON configuration file** for all text content, making it easy to update content without touching code.

## Configuration File

**Location**: `src/landing-config.json`

**Structure**:
```json
{
  "hero": {
    "title": "Page title",
    "subtitle": "Page subtitle"
  },
  "apps": [
    {
      "id": "unique-id",
      "url": "app.html",
      "icon": "🚀",
      "title": "App Title",
      "description": "App description text",
      "features": ["Feature 1", "Feature 2", ...],
      "cta": "Call to Action →",
      "featured": true|false
    }
  ],
  "footer": {
    "text": "Footer text",
    "github": {
      "text": "Link text",
      "url": "https://github.com/..."
    }
  }
}
```

## How It Works

1. **Configuration Loading**: `src/landing.ts` imports `landing-config.json`
2. **Dynamic Population**: On page load, JavaScript populates all HTML elements
3. **Build Process**: Vite bundles the JSON data directly into `main.js`
4. **Static Deployment**: No server needed - JSON is embedded in the JavaScript bundle

## Updating Content

To update landing page content:

1. Edit `src/landing-config.json`
2. Run `npm run build`
3. Deploy the updated `dist-pages/` directory

**No code changes needed!**

## File Structure

```
src/
├── landing.ts              # Landing page logic (loads config)
├── landing.css             # Landing page styles
└── landing-config.json     # Content configuration

dist-pages/  (build output)
├── index.html              # Minimal HTML structure
├── main.js                 # Bundled JS with embedded JSON
└── main.css                # Bundled CSS
```

## Static Site Hosting

This is a **fully static site** that requires **no server**:

- ✅ Can be hosted on GitHub Pages
- ✅ Can be hosted on Netlify, Vercel, etc.
- ✅ Can be served from any static file server
- ✅ No backend, no API calls, no database
- ✅ Just HTML, CSS, and JavaScript files

The JSON configuration is bundled into the JavaScript at build time, so there are no separate JSON files to fetch at runtime.

## Example: Adding a New App

To add a fourth app to the landing page:

1. Create the new HTML file (e.g., `planner.html`)
2. Add entry to `landing-config.json`:
   ```json
   {
     "id": "planner",
     "url": "planner.html",
     "icon": "📋",
     "title": "Mission Planner",
     "description": "Plan your complete mission timeline",
     "features": ["Timeline", "Events", "Optimization"],
     "cta": "Start Planning →",
     "featured": false
   }
   ```
3. Add entry to `vite.config.js` input if it's a separate app
4. Rebuild: `npm run build`

That's it! No code changes to `landing.ts` or `index.html` needed.
