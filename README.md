# PixelTracer

A Chrome extension for tracking and analyzing third-party requests to various analytics and tracking providers.

## Features

- 🔍 Detects network requests to common analytics and tracking providers
- 📊 Identifies Google Analytics, Google Ads, Facebook Pixel, and other tracking scripts
- 📱 Shows real-time tracking information in a clean interface
- 💾 Export tracking data for further analysis
- 🛡️ Monitor which trackers are collecting data on websites you visit

## Supported Tracking Providers

- Google Analytics
- Google Ads
- Google Ads Remarketing
- Facebook Pixel
- Twitter Pixel
- LinkedIn Insight
- Hotjar
- Mixpanel

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension is now installed and active

## Usage

1. Click the PixelTracer icon in your browser toolbar to open the popup
2. Browse websites as normal
3. PixelTracer will detect and log tracking requests in the background
4. The popup will show statistics and details about detected trackers
5. Use the "Export Data" button to save tracking information as a JSON file

## Development

### Project Structure

- `manifest.json` - Extension configuration
- `background.js` - Background script for monitoring network requests
- `content.js` - Content script that runs in the context of web pages
- `popup.html/js/css` - Extension popup interface
- `trackingProviders.js` - Configuration of tracking providers and their patterns

### Adding New Tracking Providers

To add support for a new tracking provider, edit the `trackingProviders.js` file and add a new entry with:

```javascript
'provider-id': {
  name: 'Provider Display Name',
  description: 'Brief description of the service',
  patterns: [
    'domain-to-match.com',
    /regex-pattern-to-match/
  ],
  category: 'analytics' // or ads, remarketing, social, etc.
}
```

## License

MIT License

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 