# Mission Designer Wizard - Help System

## Overview

The Mission Design Wizard includes a comprehensive help system with two components:

1. **Interactive Walkthrough** - First-time users get a guided tour using driver.js
2. **Persistent Help Panel** - Always-available slide-out panel with step-specific help

## Components

### 1. Help Panel (`HelpPanel.ts`)

A slide-out panel that provides detailed, context-aware help for each wizard step.

**Features:**
- Slides in from the right side
- Shows step-specific content
- Multiple sections per step (Overview, How-to, Tips)
- Close with X button or ESC key
- Automatically updates when step changes

**Usage:**
- Click the **?** button in the top-right corner
- Panel slides out with help for current step
- Click X or press ESC to close

### 2. Walkthrough Manager (`WalkthroughManager.ts`)

Uses driver.js library to create an interactive walkthrough for first-time users.

**Features:**
- Auto-shows on first visit (tracked in localStorage)
- Highlights key elements with callouts
- Step-by-step guidance
- Can be skipped or dismissed
- Can be replayed anytime

**User Flow:**
1. First visit → Walkthrough auto-starts after 500ms delay
2. User can skip, navigate, or dismiss
3. On completion → localStorage marks as seen
4. Future visits → Walkthrough doesn't auto-start
5. Help button always available for reference

## Configuration

All content is managed in **`src/wizard/help-config.json`**:

```json
{
  "walkthrough": {
    "enabled": true,
    "showOnFirstVisit": true,
    "steps": [
      {
        "element": ".wizard-step[data-step='0']",
        "popover": {
          "title": "Welcome!",
          "description": "...",
          "side": "bottom",
          "align": "start"
        }
      }
    ]
  },
  "helpContent": {
    "0": {
      "title": "Landing Site Selection",
      "sections": [
        {
          "heading": "Overview",
          "content": "..."
        }
      ],
      "tips": ["Tip 1", "Tip 2"]
    }
  }
}
```

### Walkthrough Configuration

- `enabled`: Turn walkthrough on/off
- `showOnFirstVisit`: Auto-show for new users
- `steps`: Array of driver.js step definitions
  - `element`: CSS selector for highlighted element
  - `popover.title`: Step title
  - `popover.description`: Step description
  - `popover.side`: Popover position (top/bottom/left/right)
  - `popover.align`: Popover alignment (start/center/end)

### Help Content Configuration

Each step (0-indexed) has:
- `title`: Step title shown in help panel
- `sections`: Array of help sections
  - `heading`: Section heading
  - `content`: Section text (supports `\n` for line breaks, `•` for bullets)
- `tips`: Optional array of quick tips

## File Structure

```
src/wizard/
├── help-config.json              # All help content
├── components/
│   ├── HelpPanel.ts              # Slide-out help panel
│   └── WalkthroughManager.ts     # driver.js integration
├── wizard.css                    # Includes help system styles
└── WizardController.ts           # Integrates help system
```

## Styles

All help system styles are in `wizard.css`:

- `.help-button` - Floating question mark button
- `.help-panel` - Slide-out panel container
- `.help-panel-content` - Scrollable content area
- `.driver-popover` - driver.js walkthrough customization

**Design:**
- Purple gradient theme matching wizard
- Smooth animations (0.3s transitions)
- Responsive (full-width on mobile)
- Custom scrollbar styling
- High z-index for visibility

## Technical Details

### Dependencies

- **driver.js** (~5 KB gzipped) - Interactive walkthrough library
- Bundled with wizard.js (total: ~41 KB gzipped)

### localStorage

- Key: `wizard-walkthrough-seen`
- Value: `"true"` after first completion
- Can be reset via `WalkthroughManager.reset()`

### Integration Points

**WizardController.ts:**
```typescript
private initializeHelpSystem(): void {
    // Initialize help panel
    this.helpPanel = new HelpPanel(this.container);

    // Initialize walkthrough manager
    this.walkthroughManager = new WalkthroughManager();
    this.walkthroughManager.init();
}

private showStep(stepNum: number): void {
    // Update help panel for current step (convert to 0-indexed)
    this.helpPanel?.setStep(stepNum - 1);
    // ...
}
```

## Updating Help Content

### Adding New Steps

1. Edit `help-config.json`
2. Add new entry to `helpContent` object (use next index)
3. Optionally add walkthrough steps
4. Rebuild: `npm run build`

### Modifying Existing Content

1. Edit the corresponding section in `help-config.json`
2. Rebuild: `npm run build`
3. Content automatically updates

**No code changes needed!**

### Example: Adding Step 5

```json
{
  "helpContent": {
    "4": {
      "title": "Mission Review",
      "sections": [
        {
          "heading": "Overview",
          "content": "Review your complete mission design..."
        }
      ],
      "tips": [
        "Double-check all parameters",
        "Export mission data for reference"
      ]
    }
  }
}
```

## Testing

### Manual Testing

1. **First Visit Test:**
   - Clear localStorage: `localStorage.removeItem('wizard-walkthrough-seen')`
   - Reload page
   - Walkthrough should auto-start

2. **Help Panel Test:**
   - Click ? button
   - Panel slides out
   - Verify content for current step
   - Close with X or ESC

3. **Step Navigation:**
   - Navigate through wizard steps
   - Help panel content should update automatically

### Reset Walkthrough

```javascript
// In browser console
localStorage.removeItem('wizard-walkthrough-seen');
location.reload();
```

## Accessibility

- **Keyboard Navigation**: ESC to close help panel
- **ARIA Labels**: Help button has `aria-label`
- **Focus Management**: driver.js handles focus during walkthrough
- **Color Contrast**: Meets WCAG AA standards

## Performance

- **Initial Load**: +9 KB gzipped (driver.js + help system)
- **Runtime**: Minimal CPU/memory impact
- **Lazy Loading**: Walkthrough only initializes when needed
- **No Network Requests**: All content bundled

## Future Enhancements

Potential improvements:
- [ ] Video tutorials embedded in help panel
- [ ] Contextual help tooltips on hover
- [ ] Search functionality in help content
- [ ] Multi-language support
- [ ] Help analytics (track which sections users view most)
- [ ] "Replay walkthrough" button in help panel
