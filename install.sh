#!/bin/bash

# CTFd Challenge Map Theme Installation Script
# This script helps install the theme in your CTFd instance

echo "CTFd Challenge Map Theme Installation"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the theme directory"
    echo "Expected files: package.json, vite.config.js"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    yarn install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies"
        exit 1
    fi
fi

# Build the theme
echo "Building theme..."
yarn build
if [ $? -ne 0 ]; then
    echo "Error: Failed to build theme"
    exit 1
fi

# Get CTFd installation path
echo ""
echo "Enter the path to your CTFd installation (e.g., /opt/CTFd):"
read CTFD_PATH

if [ ! -d "$CTFD_PATH" ]; then
    echo "Error: CTFd directory not found: $CTFD_PATH"
    exit 1
fi

# Check if themes directory exists
THEMES_DIR="$CTFD_PATH/themes"
if [ ! -d "$THEMES_DIR" ]; then
    echo "Creating themes directory..."
    mkdir -p "$THEMES_DIR"
fi

# Get theme name
echo "Enter the name for your theme (e.g., ChallengeMap):"
read THEME_NAME

if [ -z "$THEME_NAME" ]; then
    echo "Error: Theme name cannot be empty"
    exit 1
fi

# Copy theme files
echo "Copying theme files to $THEMES_DIR/$THEME_NAME..."
cp -r . "$THEMES_DIR/$THEME_NAME"

# Set permissions
echo "Setting permissions..."
chmod -R 755 "$THEMES_DIR/$THEME_NAME"

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Restart your CTFd instance"
echo "2. Go to Admin Panel > Configuration > Themes"
echo "3. Select '$THEME_NAME' from the theme dropdown"
echo "4. Save the configuration"
echo ""
echo "Your theme is now installed at: $THEMES_DIR/$THEME_NAME"
echo ""
echo "Features:"
echo "- Interactive US map with challenges mapped to states"
echo "- Color-coded categories with legend"
echo "- Real-time challenge solve tracking"
echo "- Responsive design for all devices"
echo ""
echo "To assign challenges to specific states, add state tags to your challenges:"
echo "- Tag: 'CA' → Challenge appears on California"
echo "- Tag: 'NY' → Challenge appears on New York"
echo "- Tag: 'TX' → Challenge appears on Texas"