# CTFd Challenge Map Theme

A modern CTFd theme based on core-beta that displays challenges on an interactive United States map. Each challenge is represented by a state, and clicking on a state opens the challenge modal.

## Features

- ✅ **Modern Architecture**: Built on CTFd core-beta with Bootstrap 5, Alpine.js, and Vite
- ✅ **Interactive US Map**: Challenges mapped to US states with color-coded categories
- ✅ **Responsive Design**: Works on desktop and mobile devices
- ✅ **Real-time Updates**: Live challenge solve tracking and updates
- ✅ **Category Legend**: Visual legend showing challenge categories
- ✅ **Tooltips**: Hover over states to see challenge information
- ✅ **Compatible**: Works with CTFd 3.8.0+

## Installation

### Prerequisites

- CTFd 3.8.0 or later
- Node.js and Yarn (for building the theme)

### Setup

1. **Clone or copy this theme** to your CTFd instance's `themes` directory
2. **Install dependencies**:
   ```bash
   cd CTFd-ChallengeMapTheme
   yarn install
   ```
3. **Build the theme**:
   ```bash
   yarn build
   ```
4. **Copy the theme folder** to your CTFd instance's `themes` directory
5. **Select the theme** in CTFd Admin Panel → Configuration → Themes
6. **Restart CTFd**

### Development

For development with hot reloading:

```bash
yarn dev
```

This will watch for changes and rebuild automatically.

## How It Works

### Challenge Mapping

Challenges are automatically mapped to US states using the following logic:

1. **State Tags**: If a challenge has a state tag (e.g., "CA", "NY", "TX"), it will be placed on that state
2. **Default Assignment**: If no state tag is provided, challenges are assigned to states in order
3. **Category Colors**: Each challenge category gets a unique color for easy identification

### State Codes

The theme uses standard US state abbreviations:
- CA (California), NY (New York), TX (Texas), FL (Florida), etc.
- All 50 states plus DC are supported

### Interactive Features

- **Click States**: Click on any state to open the challenge modal
- **Hover Tooltips**: Hover over states to see challenge details
- **Category Legend**: Right sidebar shows all challenge categories with colors
- **Real-time Updates**: Map updates automatically when challenges are solved

## File Structure

```
CTFd-ChallengeMapTheme/
├── assets/
│   ├── js/
│   │   ├── challenges-map.js    # Main map functionality (Alpine.js)
│   │   ├── raphael.min.js       # SVG library
│   │   ├── jquery.mapael.js     # Map rendering library
│   │   └── usa_states.js        # US states data
│   └── scss/
│       └── main.scss            # Styles including map styles
├── templates/
│   └── challenges.html          # Challenges page template
├── static/                      # Built assets (generated)
├── package.json                 # Dependencies
├── vite.config.js              # Build configuration
└── README.md                   # This file
```

## Customization

### Challenge Categories

Categories are automatically detected from your challenges. Each category gets a unique color generated from the category name.

### Map Styling

Edit `assets/scss/main.scss` to customize map appearance:

```scss
.map-container {
  height: 600px;  // Adjust map height
  border-radius: 8px;  // Adjust border radius
}

.mapael .mapTooltip {
  // Customize tooltip appearance
}
```

### State Assignment

To assign challenges to specific states, add state tags to your challenges:
- Tag: "CA" → Challenge appears on California
- Tag: "NY" → Challenge appears on New York
- Tag: "TX" → Challenge appears on Texas

## Technical Details

### Architecture

- **Base**: CTFd core-beta theme
- **Frontend**: Alpine.js for reactivity
- **Styling**: Bootstrap 5 + SCSS
- **Build**: Vite for fast builds and hot reloading
- **Map**: Raphael.js + jQuery Mapael for SVG rendering

### API Integration

The theme uses CTFd's modern API endpoints:
- `/api/v1/challenges` - Fetch challenges
- `/api/v1/challenges/{id}` - Load specific challenge
- `/api/v1/challenges/{id}/attempts` - Submit challenge solutions

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Map Not Displaying

1. Check browser console for JavaScript errors
2. Verify all map libraries are loaded
3. Ensure challenges exist in your CTFd instance
4. Check that the theme is properly built (`yarn build`)

### Challenges Not Loading

1. Verify CTFd API endpoints are accessible
2. Check network tab in browser dev tools
3. Ensure you're logged in to CTFd

### Build Issues

1. Make sure Node.js and Yarn are installed
2. Run `yarn install` to install dependencies
3. Check for any error messages during `yarn build`

## Contributing

This theme is based on the [CTFd core-beta theme](https://github.com/CTFd/core-theme) and integrates functionality from the [UnitedStates theme](https://github.com/ColdHeat/UnitedStates).

## License

This theme is released under the same license as CTFd (Apache-2.0).