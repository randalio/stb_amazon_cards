# Amazon Product Block for WordPress

A WordPress Gutenberg block that integrates with the Amazon Product Advertising API to display product information with images, titles, prices, and buy buttons.

## Features

- 🛒 Fetch Amazon product data automatically from URLs
- 🖼️ Display product images, titles, and prices
- 🔗 Direct "Buy Now" links to Amazon
- 📱 Responsive design for all devices
- ⚙️ Easy configuration via WordPress admin
- 🎨 Clean, professional styling

## Requirements

- WordPress 5.0+
- PHP 7.4+
- Amazon Associates Program account
- Amazon Product Advertising API credentials

## Installation

### Step 1: Get Amazon API Credentials

1. Sign up for the [Amazon Associates Program](https://affiliate-program.amazon.com/)
2. Apply for [Product Advertising API access](https://webservices.amazon.com/paapi5/documentation/)
3. Once approved, you'll receive:
   - Access Key ID
   - Secret Access Key
   - Associate ID (Partner Tag)

### Step 2: Install the Plugin

1. Download or clone this repository to your WordPress plugins directory:
   ```
   wp-content/plugins/amazon-product-block/
   ```

2. Install dependencies and build the assets:
   ```bash
   cd wp-content/plugins/amazon-product-block/
   npm install
   npm run build
   ```

3. Activate the plugin in your WordPress admin dashboard

### Step 3: Configure API Settings

1. In WordPress admin, go to **Settings → Amazon Product Block**
2. Enter your Amazon API credentials:
   - **Access Key ID**: Your Amazon API access key
   - **Secret Access Key**: Your Amazon API secret key
   - **Partner Tag**: Your Amazon Associate ID (e.g., `yourname-20`)
   - **Region**: Select your Amazon marketplace region

3. Save the settings

## Usage

### Adding a Product Block

1. In the WordPress block editor, click the "+" button to add a new block
2. Search for "Amazon Product" and select it
3. In the block settings panel on the right:
   - Enter the full Amazon product URL
   - Click "Fetch Product Data"
4. The block will automatically display the product information

### Supported URL Formats

The block supports various Amazon URL formats:
- `https://www.amazon.com/dp/B08N5WRWNW`
- `https://www.amazon.com/product-name/dp/B08N5WRWNW`
- `https://www.amazon.com/gp/product/B08N5WRWNW`
- URLs with additional parameters

## File Structure

```
amazon-product-block/
├── amazon-product-block.php    # Main plugin file
├── package.json               # Build dependencies
├── src/                      # Source files
│   ├── index.js             # Entry point
│   ├── block.js             # Block registration
│   ├── editor.scss          # Editor styles
│   └── style.scss           # Frontend styles
├── build/                   # Built assets (generated)
│   ├── index.js
│   ├── editor.css
│   └── style.css
└── README.md
```

## Development

### Building Assets

To build the JavaScript and CSS files:

```bash
# Development build with watch mode
npm run start

# Production build
npm run build
```

### Customizing Styles

The block includes two sets of styles:

- **Editor styles** (`src/editor.scss`): Styles for the block editor
- **Frontend styles** (`src/style.scss`): Styles for the public-facing site

You can customize these styles and rebuild the assets.

## API Integration

The plugin uses the Amazon Product Advertising API 5.0 with proper AWS signature authentication. The API integration includes:

- Secure credential storage in WordPress options
- Proper request signing with AWS4-HMAC-SHA256
- Support for multiple Amazon marketplaces
- Error handling and user feedback

## Troubleshooting

### Common Issues

**"Amazon API credentials not configured"**
- Ensure you've entered all required API credentials in Settings → Amazon Product Block

**"Could not extract ASIN from URL"**
- Make sure you're using a valid Amazon product URL
- The URL should contain the product ASIN (Amazon Standard Identification Number)

**"Failed to fetch product data"**
- Check that your API credentials are correct
- Ensure your Amazon Associates account is active
- Verify the product exists and is available in your selected region

### Debug Mode

To enable debug logging, add this to your `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check `/wp-content/debug.log` for API-related errors.

## Security

- API credentials are stored securely in the WordPress database
- All user inputs are sanitized and validated
- AJAX requests use WordPress nonces for security
- External links include `rel="nofollow noopener"` attributes

## License

This plugin is licensed under the GPL v2 or later.

## Support

For support and feature requests, please create an issue in the repository or contact the plugin author.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or report issues.

---

**Disclaimer**: This plugin is not affiliated with Amazon. You must comply with Amazon's Terms of Service and Product Advertising API License Agreement when using this plugin.
