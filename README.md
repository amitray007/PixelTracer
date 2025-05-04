# PixelTracer

A Chrome extension for real-time monitoring, visualization, and analysis of analytics and marketing tracking requests made by websites.

<p align="center">
  <img src="images/icon128.png" alt="PixelTracer Logo" width="128">
</p>

## Overview

PixelTracer helps you understand what tracking technologies websites are using to collect data about your browsing behavior. The extension detects and analyzes network requests to various analytics providers, marketing pixels, and advertising platforms, giving you insights into how websites track your activity.

## Key Features

- **Real-time Tracking Detection**: Monitor requests to analytics and marketing services as they happen
- **Live View**: Toggle an on-page floating window showing tracking requests in real-time
- **Page-specific Settings**: Configure Live View separately for each website
- **Provider Grouping**: View tracking requests grouped by provider or chronologically
- **Detailed Analysis**: Examine the full details of each tracking request including:
  - URL parameters
  - Request headers
  - Request payload/body
  - Event information
- **Multi-event Handling**: Complete visibility into batched tracking events (e.g., AdNabu Google Ads)
- **Visual Reports**: Access privacy insights, tracking timelines, and summary statistics
- **Data Export**: Export tracking data as JSON or CSV for further analysis
- **Dark Mode**: Toggle between light and dark themes for comfortable viewing

## Supported Tracking Providers

PixelTracer detects a wide range of tracking technologies:

- **Analytics**
  - Google Analytics (Universal Analytics)
  - Google Analytics 4
  - Adobe Analytics
  - Matomo (Piwik)
  - Mixpanel
  - Amplitude
  - Hotjar

- **Advertising**
  - Google Ads
  - Google DoubleClick
  - Facebook Pixel
  - TikTok Pixel
  - Twitter Pixel
  - LinkedIn Insight
  - Pinterest Conversion Tag

- **Tag Management**
  - Google Tag Manager
  - Adobe Dynamic Tag Manager
  - Adobe Audience Manager

- **Custom Providers**
  - AdNabu (Google Ads)
  - Support for adding your own custom provider definitions

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store page for PixelTracer
2. Click "Add to Chrome"
3. Confirm the installation

### From Source

1. Clone or download this repository
   ```
   git clone https://github.com/your-username/pixeltracer.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension is now installed and active

## Using PixelTracer

### Popup Interface

Click the PixelTracer icon in your browser toolbar to open the popup, which shows:

- **Summary Stats**: Total tracking requests and unique providers detected
- **Providers Tab**: List of tracking services detected on the current page
- **Requests Tab**: Chronological list of all tracking requests
- **Controls**: Clear data, export data, toggle Live View, and access reports

### Live View

The Live View feature provides a floating window directly on the webpage that updates in real-time:

1. Click "Live View" in the extension popup to enable/disable
2. Use the dropdown filters to view requests by category or provider
3. Toggle between chronological and grouped views
4. Click on any request to view its full details
5. Drag the Live View window to reposition it on the page
6. Minimize or close as needed

### Detailed Request Analysis

Click on any tracking request (in the popup or Live View) to open a detailed analysis window with tabs for:

- **General**: Basic information about the request
- **Event Details**: Marketing or analytics event data 
- **Parameters**: URL parameters sent with the request
- **Headers**: HTTP headers for the request
- **Payload**: Full request body/payload (if available)

### Reports

Access visual reports by clicking the "Reports" button in the popup:

- **Summary**: Overview of tracking activity with statistics
- **Timeline**: Visualization of tracking activity over time
- **Privacy**: Privacy risk assessment based on tracking techniques detected

## Customization and Advanced Features

### Adding Custom Tracking Providers

PixelTracer can be extended to detect additional tracking services by modifying the provider definitions in `background.js`:

```javascript
'your-custom-provider': {
  name: 'Your Custom Provider',
  description: 'Description of the service',
  patterns: [
    /https:\/\/api\.your-provider\.com\/track/
  ],
  methods: ['POST', 'GET'], // Supported HTTP methods
  category: 'analytics', // or 'marketing', 'ads', etc.
  schema: {
    // Define how to parse and display data from this provider
  }
}
```

### Method-Based Filtering

PixelTracer can filter tracking requests based on HTTP method:

```javascript
'provider-name': {
  // ... other properties
  methods: ['POST'], // Only match POST requests
}
```

### Event Processing

For complex tracking services with multiple events per request (like AdNabu), you can create custom processing functions:

```javascript
'provider-name': {
  // ... other properties
  parsePayloadEvents: (payload) => {
    // Custom logic to extract multiple events from a single payload
    return eventData;
  }
}
```

## Performance Considerations

PixelTracer is designed to be lightweight and unobtrusive:

- Live View can be enabled/disabled per domain
- The extension only processes tracking-related requests
- Data is stored in memory and is cleared when you close the tab

## Privacy

PixelTracer operates entirely in your browser. No data is transmitted to any server:

- All tracking analysis happens locally
- No data is shared with third parties
- The extension only requires permissions necessary for monitoring network requests

## Troubleshooting

- **No data showing?** Make sure PixelTracer is enabled and refresh the page
- **Extension not detecting a known tracker?** You might need to add a custom provider definition
- **Live View not appearing?** Try refreshing the page or toggling Live View off and on
- **Browser performance issues?** Disable Live View on pages where you don't need real-time monitoring

## Development

### Project Structure

- `manifest.json` - Extension configuration
- `background.js` - Background script with provider definitions and request monitoring
- `content.js` - Content script for the Live View functionality
- `popup.html/js/css` - Extension popup interface
- `liveview.css` - Styles for the on-page Live View

### Build Process

1. Make your changes to the source files
2. Test the extension locally
3. Package for distribution using one of these methods:

   **Using npm (recommended):**
   ```
   npm run build-prod
   ```
   This command will automatically detect your operating system and use the appropriate build script.

   You can also specify the method:
   ```
   npm run build-prod:js    # Uses Node.js (cross-platform)
   npm run build-prod:win   # Uses Windows batch file
   npm run build-prod:unix  # Uses bash script on Linux/macOS
   ```

   **Direct script execution:**

   **For Windows:**
   ```
   .\build.bat
   ```

   **For Linux/macOS:**
   ```
   chmod +x build.sh
   ./build.sh
   ```

   This will create a ZIP file in the `dist` directory that's ready for uploading to the Chrome Web Store.

   **Manual packaging:**
   ```
   cd pixeltracer
   zip -r pixeltracer.zip * -x "*.git*" "*.DS_Store" "build.*" "temp/*" "dist/*"
   ```

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Ideas for contributions:
- Add support for new tracking providers
- Improve data visualization and reporting
- Add additional filtering options
- Create advanced privacy risk assessments

## License

MIT License

## Acknowledgements

- Font Awesome for icons
- The open-source community for inspiration and support

---

<p align="center">
  Made with ❤️ for privacy-conscious developers and analysts
</p> 