# CTFd Challenge Map Theme

A modern CTFd theme based on core-beta that displays challenges on an interactive Canada map. Each challenge category is represented by a province or territory, and clicking on a province/territory opens the challenge modal.

## Features

- ✅ **Modern Architecture**: Built on CTFd core-beta with Bootstrap 5, Alpine.js, and Vite
- ✅ **Interactive Canada Map**: Challenges mapped to Canadian provinces and territories with color-coded categories
- ✅ **Responsive Design**: Works on desktop and mobile devices
- ✅ **Real-time Updates**: Live challenge solve tracking and updates
- ✅ **Category Legend**: Visual legend showing challenge categories
- ✅ **Tooltips**: Hover over provinces/territories to see challenge information
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

Challenges are automatically mapped to Canadian provinces and territories using the following logic:

1. **Category-Based Mapping**: Each challenge category is automatically assigned to a province/territory
2. **Province Tags**: If a challenge has a province tag (e.g., "BC", "ON", "QC"), it will be placed on that province/territory
3. **Category Colors**: Each challenge category gets a unique color for easy identification

### Province/Territory Codes

The theme uses standard Canadian province and territory abbreviations:
- **Provinces**: AB (Alberta), BC (British Columbia), MB (Manitoba), NB (New Brunswick), NL (Newfoundland and Labrador), NS (Nova Scotia), ON (Ontario), PE (Prince Edward Island), QC (Quebec), SK (Saskatchewan)
- **Territories**: NT (Northwest Territories), NU (Nunavut), YT (Yukon)
- All 10 provinces and 3 territories are supported

### Interactive Features

- **Click Provinces/Territories**: Click on any province or territory to open the challenge modal
- **Hover Tooltips**: Hover over provinces/territories to see challenge details
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
│   │   └── canada_provinces.js  # Canada provinces and territories data
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

### Province/Territory Assignment

To assign challenges to specific provinces/territories, add province tags to your challenges:
- Tag: "BC" → Challenge appears on British Columbia
- Tag: "ON" → Challenge appears on Ontario
- Tag: "QC" → Challenge appears on Quebec
- Tag: "AB" → Challenge appears on Alberta

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

This theme is based on the [CTFd core-beta theme](https://github.com/CTFd/core-theme) and was inspired by the [UnitedStates theme](https://github.com/ColdHeat/UnitedStates), adapted for Canada.

## License

This theme is released under the same license as CTFd (Apache-2.0).