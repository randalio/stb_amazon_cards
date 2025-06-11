<?php
/**
 * Plugin Name: Amazon Product Block
 * Description: A Gutenberg block that displays Amazon product information using the Product API
 * Version: 1.0.0
 * Author: Your Name
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class AmazonProductBlock {
    
    public function __construct() {
        add_action('init', array($this, 'register_block'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'settings_init'));
        add_action('wp_ajax_fetch_amazon_product', array($this, 'fetch_amazon_product'));
        add_action('wp_ajax_nopriv_fetch_amazon_product', array($this, 'fetch_amazon_product'));
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_block_editor_assets'));
        
        // Add filter to preserve price formatting
        add_filter('rest_pre_insert_post', array($this, 'preserve_price_format'), 10, 2);
    }
    
    
    // Update your register_block method to ensure price is handled as string
    public function register_block() {
        // Register the script manually with proper dependencies
        $asset_file_path = plugin_dir_path(__FILE__) . 'build/index.asset.php';
        $asset_file = file_exists($asset_file_path) ? include $asset_file_path : array(
            'dependencies' => array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n'),
            'version' => '1.0.0'
        );
        
        wp_register_script(
            'amazon-product-block-editor',
            plugin_dir_url(__FILE__) . 'build/index.js',
            $asset_file['dependencies'],
            $asset_file['version'],
            true
        );
        
        // Register styles if they exist
        $editor_css_path = plugin_dir_path(__FILE__) . 'build/index.css';
        if (file_exists($editor_css_path)) {
            wp_register_style(
                'amazon-product-block-editor-style',
                plugin_dir_url(__FILE__) . 'build/index.css',
                array('wp-edit-blocks'),
                filemtime($editor_css_path)
            );
        }
        
        $frontend_css_path = plugin_dir_path(__FILE__) . 'build/style-index.css';
        if (file_exists($frontend_css_path)) {
            wp_register_style(
                'amazon-product-block-style',
                plugin_dir_url(__FILE__) . 'build/style-index.css',
                array(),
                filemtime($frontend_css_path)
            );
        }
        
        // Register the block type with proper attribute definitions
        register_block_type('amazon-product/block', array(
            'editor_script' => 'amazon-product-block-editor',
            'editor_style' => file_exists($editor_css_path) ? 'amazon-product-block-editor-style' : null,
            'style' => file_exists($frontend_css_path) ? 'amazon-product-block-style' : null,
            'render_callback' => array($this, 'render_block'),
            'attributes' => array(
                'productUrl' => array(
                    'type' => 'string',
                    'default' => ''
                ),
                'productData' => array(
                    'type' => 'object',
                    'default' => array(),
                    'properties' => array(
                        'title' => array(
                            'type' => 'string'
                        ),
                        'price' => array(
                            'type' => 'string'  // Explicitly define as string
                        ),
                        'image' => array(
                            'type' => 'string'
                        ),
                        'url' => array(
                            'type' => 'string'
                        )
                    )
                )
            )
        ));
    }


    public function preserve_price_format($prepared_post, $request) {
        if (isset($prepared_post->post_content)) {
            // Prevent modification of price data in blocks
            $prepared_post->post_content = preg_replace_callback(
                '/<!-- wp:amazon-product\/block ({.*?}) \/-->/',
                function($matches) {
                    $attributes = json_decode($matches[1], true);
                    if (isset($attributes['productData']['price'])) {
                        // Ensure price remains as string
                        $attributes['productData']['price'] = (string)$attributes['productData']['price'];
                    }
                    return '<!-- wp:amazon-product/block ' . wp_json_encode($attributes) . ' /-->';
                },
                $prepared_post->post_content
            );
        }
        return $prepared_post;
    }


    


    
    public function enqueue_block_editor_assets() {
        wp_localize_script('amazon-product-block-editor', 'amazonProductBlock', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('amazon_product_nonce')
        ));
    }
    
    public function render_block($attributes) {
        $product_data = $attributes['productData'] ?? array();
        
        if (empty($product_data)) {
            return '<div class="amazon-product-error">No product data available</div>';
        }
        
        $image = $product_data['image'] ?? '';
        $title = $product_data['title'] ?? '';
        $price = $product_data['price'] ?? '';
        $url = $attributes['productUrl'] ?? '';
        $altTitle = $attributes['alternateTitle'] ?? '';
        $orientation = $attributes['orientation'] ?? 'horizontal';
        // if orientation is not set, default to horizontal
        if (!in_array($orientation, array('horizontal', 'vertical'))) {
            $orientation = 'horizontal';
        }else{
            $orientation = 'vertical';
        }
        

        //print_r( $attributes );
        
        ob_start();
        ?>
        <div class="amazon-product-card orientation-<?php echo $orientation; ?>">
            <?php if ($image): ?>
                <div class="amazon-product-image">
                    <img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($title); ?>" />
                </div>
            <?php endif; ?>
            
            <div class="amazon-product-content">
                <?php if (!$altTitle): ?>
                    <h3 class="amazon-product-title"><?php echo esc_html($title); ?></h3>
                <?php elseif( $title): ?>
                    <h3 class="amazon-product-title"><?php echo esc_html($altTitle); ?></h3>
                <?php endif; ?>
                
                <?php if ($price): ?>
                    <div class="amazon-product-price"><?php echo esc_html($price); ?></div>
                <?php endif; ?>
                
                <?php if ($url):  $partner_tag = get_option('amazon_product_partner_tag'); ?>
                    <a href="<?php echo esc_url($url) .'&tag='.$partner_tag; ?>" class="amazon-product-button" target="_blank" rel="nofollow noopener">
                        Buy Now on Amazon
                    </a>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }


    public function clear_product_cache($asin) {
        delete_transient('amazon_product_' . $asin);
    }
    
    // Add this modified fetch_amazon_product method to debug the issue
    public function fetch_amazon_product() {
        // Add debugging
        error_log('Amazon Product Block: AJAX request received');
        error_log('POST data: ' . print_r($_POST, true));
        
        check_ajax_referer('amazon_product_nonce', 'nonce');
        
        $product_url = sanitize_url($_POST['productUrl'] ?? '');
        error_log('Product URL: ' . $product_url);
        
        if (empty($product_url)) {
            error_log('Amazon Product Block: Empty product URL');
            wp_send_json_error('Product URL is required');
        }
        
        // Extract ASIN from URL
        $asin = $this->extract_asin_from_url($product_url);
        error_log('Extracted ASIN: ' . $asin);
        
        if (!$asin) {
            error_log('Amazon Product Block: Could not extract ASIN');
            wp_send_json_error('Could not extract ASIN from URL. Please check the URL format.');
        }
        
        // TEMPORARY: Clear cache for these specific ASINs to force re-scrape
        if (in_array($asin, ['B0DRT6F3PB', 'B0DKJ347ZJ'])) {
            delete_transient('amazon_product_' . $asin);
            error_log('Cleared cache for ASIN: ' . $asin);
        }
        
        // Try to get from cache first
        $cache_key = 'amazon_product_' . $asin;
        $cached_data = get_transient($cache_key);
        
        if ($cached_data !== false) {
            error_log('Returning cached data for ASIN: ' . $asin);
            error_log('Cached price value: ' . $cached_data['price']);
            wp_send_json_success($cached_data);
            return;
        }
        
        // Get API credentials
        $api_key = get_option('amazon_product_api_key');
        $secret_key = get_option('amazon_product_secret_key');
        $partner_tag = get_option('amazon_product_partner_tag');
        $region = get_option('amazon_product_region', 'us-east-1');
        
        $product_data = false;
        
        // Try API first if credentials are available
        if (!empty($api_key) && !empty($secret_key) && !empty($partner_tag)) {
            error_log('Attempting to fetch via API...');
            $product_data = $this->fetch_from_amazon_api($asin, $api_key, $secret_key, $partner_tag, $region);
        }
        
        // If API fails or no credentials, try web scraping
        if (!$product_data) {
            error_log('API failed or no credentials, attempting web scraping...');
            $product_data = $this->scrape_amazon_product($product_url);
        }
        
        if ($product_data) {
            // Debug: Log the exact price data before caching
            error_log('Product data before caching:');
            error_log('Price: ' . var_export($product_data['price'], true));
            error_log('Full product data: ' . print_r($product_data, true));
            
            // Cache the data for 12 hours
            set_transient($cache_key, $product_data, 12 * HOUR_IN_SECONDS);
            
            // Debug: Verify what we're sending back
            error_log('Sending to frontend - Price: ' . $product_data['price']);
            
            wp_send_json_success($product_data);
        } else {
            error_log('Failed to fetch product data');
            wp_send_json_error('Failed to fetch product data. Please check the URL and try again.');
        }
    }


    
    private function scrape_amazon_product($url) {
        // Set up the request with proper headers to avoid bot detection
        $args = array(
            'timeout' => 30,
            'redirection' => 5,
            'httpversion' => '1.1',
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'headers' => array(
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.9',
                'Accept-Encoding' => 'gzip, deflate, br',
                'Connection' => 'keep-alive',
                'Upgrade-Insecure-Requests' => '1',
                'Cache-Control' => 'max-age=0'
            ),
            'cookies' => array()
        );
        
        $response = wp_remote_get($url, $args);
        
        if (is_wp_error($response)) {
            error_log('Scraping error: ' . $response->get_error_message());
            return false;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200) {
            error_log('Scraping returned status code: ' . $status_code);
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        if (empty($body)) {
            error_log('Empty response body');
            return false;
        }
        
        // Parse the HTML
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        @$dom->loadHTML($body);
        libxml_clear_errors();
        
        $xpath = new DOMXPath($dom);
        
        $product_data = array();
        
        // Extract title - Amazon uses various selectors
        $title_selectors = array(
            '//span[@id="productTitle"]',
            '//h1[@id="title"]/span',
            '//h1[contains(@class, "product-title-word-break")]',
            '//h1[@class="a-size-large a-spacing-none"]//span',
            '//span[@id="ebooksProductTitle"]'
        );
        
        foreach ($title_selectors as $selector) {
            $nodes = $xpath->query($selector);
            if ($nodes->length > 0) {
                $product_data['title'] = trim($nodes->item(0)->textContent);
                break;
            }
        }
        
        // Extract price with comprehensive approach
        $product_data['price'] = $this->extract_price_from_page($xpath, $body);
        
        // Extract main image
        $image_selectors = array(
            '//img[@id="landingImage"]/@src',
            '//img[@id="imgBlkFront"]/@src',
            '//img[@id="main-image"]/@src',
            '//div[@id="imgTagWrapperId"]/img/@src',
            '//div[contains(@class, "imgTagWrapper")]/img/@src',
            '//div[@id="mainImageContainer"]//img/@src',
            '//img[@data-old-hires]/@data-old-hires',
            '//img[@id="ebooksImgBlkFront"]/@src'
        );
        
        foreach ($image_selectors as $selector) {
            $nodes = $xpath->query($selector);
            if ($nodes->length > 0) {
                $image_url = $nodes->item(0)->nodeValue;
                // Make sure it's a full URL
                if (strpos($image_url, 'http') === 0) {
                    $product_data['image'] = $image_url;
                    break;
                }
            }
        }
        
        // Try to get high-res image from JavaScript data
        if (empty($product_data['image'])) {
            if (preg_match('/"hiRes":"([^"]+)"/', $body, $matches)) {
                $product_data['image'] = $matches[1];
            } elseif (preg_match('/"large":"([^"]+)"/', $body, $matches)) {
                $product_data['image'] = $matches[1];
            }
        }
        
        // Add the product URL
        $product_data['url'] = $url;
        
        // Log what we found
        error_log('Scraped data: ' . print_r($product_data, true));
        
        // Validate we got at least title or image
        if (empty($product_data['title']) && empty($product_data['image'])) {
            error_log('No title or image found - scraping failed');
            return false;
        }
        
        return $product_data;
    }
    
    private function extract_price_from_page($xpath, $body) {
        // Method 1: Look for the complete price in offscreen/accessibility elements
        $offscreen_selectors = array(
            '//span[@class="a-offscreen"][1]', // First offscreen element often has the price
            '//span[contains(@class, "a-price")]//span[@class="a-offscreen"]',
            '//div[contains(@class, "a-section")]//span[@class="a-offscreen"][1]',
            '//span[@class="a-price a-text-price a-size-medium apexPriceToPay"]//span[@class="a-offscreen"]',
            '//span[contains(@class, "priceToPay")]//span[@class="a-offscreen"]'
        );
        
        foreach ($offscreen_selectors as $selector) {
            $nodes = $xpath->query($selector);
            if ($nodes->length > 0) {
                $price = trim($nodes->item(0)->textContent);
                if (!empty($price) && (strpos($price, '$') !== false || preg_match('/^\d+\.\d{2}$/', $price))) {
                    // Add $ if it's just numbers
                    if (preg_match('/^\d+\.\d{2}$/', $price)) {
                        $price = '$' . $price;
                    }
                    error_log("Found complete price in offscreen element: $price");
                    return $price;
                }
            }
        }
        
        // Method 2: Build from parts - but make sure we get ALL parts
        $whole = '';
        $fraction = '';
        $symbol = '$';
        
        // Look for the price container first
        $price_containers = $xpath->query('//span[contains(@class, "a-price") and not(contains(@class, "a-text-price-range"))]');
        
        foreach ($price_containers as $container) {
            // Within this container, look for parts
            $whole_nodes = $xpath->query('.//span[@class="a-price-whole"]', $container);
            $fraction_nodes = $xpath->query('.//span[@class="a-price-fraction"]', $container);
            $symbol_nodes = $xpath->query('.//span[@class="a-price-symbol"]', $container);
            
            if ($whole_nodes->length > 0) {
                $whole = trim($whole_nodes->item(0)->textContent);
                $whole = rtrim($whole, '.'); // Remove trailing period
                
                if ($fraction_nodes->length > 0) {
                    $fraction = trim($fraction_nodes->item(0)->textContent);
                }
                
                if ($symbol_nodes->length > 0) {
                    $symbol = trim($symbol_nodes->item(0)->textContent);
                }
                
                if (!empty($whole)) {
                    $complete_price = $symbol . $whole;
                    if (!empty($fraction)) {
                        $complete_price .= '.' . $fraction;
                    } else {
                        $complete_price .= '.00';
                    }
                    error_log("Built price from parts: $complete_price");
                    return $complete_price;
                }
            }
        }
        
        // Method 3: Extract from structured data or JavaScript
        if (preg_match('/"priceAmount":\s*"?(\d+(?:\.\d{2})?)"?/', $body, $matches)) {
            $price = '$' . $matches[1];
            if (strpos($matches[1], '.') === false) {
                $price = '$' . $matches[1] . '.00';
            }
            error_log("Found price in JavaScript: $price");
            return $price;
        }
        
        // Method 4: Look for aria-label with price
        $aria_labels = $xpath->query('//*[@aria-label[contains(., "$")]]/@aria-label');
        foreach ($aria_labels as $label) {
            if (preg_match('/\$\d+(?:\.\d{2})?/', $label->nodeValue, $matches)) {
                error_log("Found price in aria-label: " . $matches[0]);
                return $matches[0];
            }
        }
        
        error_log("No price found - body sample: " . substr($body, 0, 1000));
        return '';
    }
    
    // Update the extract_asin_from_url method to be more robust
    private function extract_asin_from_url($url) {
        // Clean the URL
        $url = trim($url);
        
        // Common Amazon URL patterns
        $patterns = array(
            '/\/dp\/([A-Z0-9]{10})/',
            '/\/gp\/product\/([A-Z0-9]{10})/',
            '/\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/',
            '/\/o\/ASIN\/([A-Z0-9]{10})/',
            '/\/gp\/aw\/d\/([A-Z0-9]{10})/',
            '/product\/([A-Z0-9]{10})/',
            '/ASIN\/([A-Z0-9]{10})/',
            '/\/([A-Z0-9]{10})(?:\/|\?|$)/'
        );
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return $matches[1];
            }
        }
        
        // Try to find any 10-character alphanumeric string that looks like an ASIN
        if (preg_match('/\b([A-Z0-9]{10})\b/', $url, $matches)) {
            return $matches[1];
        }
        
        return false;
    }
    
    private function fetch_from_amazon_api($asin, $access_key, $secret_key, $partner_tag, $region) {
        // Amazon Product Advertising API 5.0 implementation
        $host = "webservices.amazon.{$this->get_domain_for_region($region)}";
        $uri = "/paapi5/getitems";
        $payload = json_encode(array(
            'ItemIds' => array($asin),
            'Resources' => array(
                'Images.Primary.Large',
                'ItemInfo.Title',
                'Offers.Listings.Price'
            ),
            'PartnerTag' => $partner_tag,
            'PartnerType' => 'Associates',
            'Marketplace' => "www.amazon.{$this->get_domain_for_region($region)}"
        ));
        
        $headers = $this->get_aws_headers($host, $uri, $payload, $access_key, $secret_key, $region);
        
        $response = wp_remote_post("https://{$host}{$uri}", array(
            'headers' => $headers,
            'body' => $payload,
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['ItemsResult']['Items'][0])) {
            $item = $data['ItemsResult']['Items'][0];
            return array(
                'title' => $item['ItemInfo']['Title']['DisplayValue'] ?? '',
                'image' => $item['Images']['Primary']['Large']['URL'] ?? '',
                'price' => $item['Offers']['Listings'][0]['Price']['DisplayAmount'] ?? 'Price not available'
            );
        }
        
        return false;
    }
    
    private function get_domain_for_region($region) {
        $domains = array(
            'us-east-1' => 'com',
            'eu-west-1' => 'co.uk',
            'us-west-2' => 'com',
            'ap-southeast-1' => 'com'
        );
        
        return $domains[$region] ?? 'com';
    }
    
    private function get_aws_headers($host, $uri, $payload, $access_key, $secret_key, $region) {
        $service = 'ProductAdvertisingAPI';
        $timestamp = gmdate('Ymd\THis\Z');
        $date = gmdate('Ymd');
        
        // Create canonical request
        $canonical_headers = "content-type:application/json; charset=utf-8\n";
        $canonical_headers .= "host:{$host}\n";
        $canonical_headers .= "x-amz-date:{$timestamp}\n";
        $canonical_headers .= "x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n";
        
        $signed_headers = 'content-type;host;x-amz-date;x-amz-target';
        $payload_hash = hash('sha256', $payload);
        
        $canonical_request = "POST\n{$uri}\n\n{$canonical_headers}\n{$signed_headers}\n{$payload_hash}";
        
        // Create string to sign
        $algorithm = 'AWS4-HMAC-SHA256';
        $credential_scope = "{$date}/{$region}/{$service}/aws4_request";
        $string_to_sign = "{$algorithm}\n{$timestamp}\n{$credential_scope}\n" . hash('sha256', $canonical_request);
        
        // Calculate signature
        $k_date = hash_hmac('sha256', $date, 'AWS4' . $secret_key, true);
        $k_region = hash_hmac('sha256', $region, $k_date, true);
        $k_service = hash_hmac('sha256', $service, $k_region, true);
        $k_signing = hash_hmac('sha256', 'aws4_request', $k_service, true);
        $signature = hash_hmac('sha256', $string_to_sign, $k_signing);
        
        // Create authorization header
        $authorization = "{$algorithm} Credential={$access_key}/{$credential_scope}, SignedHeaders={$signed_headers}, Signature={$signature}";
        
        return array(
            'Content-Type' => 'application/json; charset=utf-8',
            'Authorization' => $authorization,
            'X-Amz-Date' => $timestamp,
            'X-Amz-Target' => 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems'
        );
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Amazon Product Block Settings',
            'Amazon Product Block',
            'manage_options',
            'amazon-product-block',
            array($this, 'settings_page')
        );
    }
    
    public function settings_init() {
        register_setting('amazon_product_settings', 'amazon_product_api_key');
        register_setting('amazon_product_settings', 'amazon_product_secret_key');
        register_setting('amazon_product_settings', 'amazon_product_partner_tag');
        register_setting('amazon_product_settings', 'amazon_product_region');
        
        add_settings_section(
            'amazon_product_section',
            'Amazon API Configuration',
            array($this, 'settings_section_callback'),
            'amazon_product_settings'
        );
        
        add_settings_field(
            'amazon_product_api_key',
            'Access Key ID',
            array($this, 'api_key_callback'),
            'amazon_product_settings',
            'amazon_product_section'
        );
        
        add_settings_field(
            'amazon_product_secret_key',
            'Secret Access Key',
            array($this, 'secret_key_callback'),
            'amazon_product_settings',
            'amazon_product_section'
        );
        
        add_settings_field(
            'amazon_product_partner_tag',
            'Partner Tag (Associate ID)',
            array($this, 'partner_tag_callback'),
            'amazon_product_settings',
            'amazon_product_section'
        );
        
        add_settings_field(
            'amazon_product_region',
            'Region',
            array($this, 'region_callback'),
            'amazon_product_settings',
            'amazon_product_section'
        );
    }
    
    public function settings_section_callback() {
        echo '<p>Enter your Amazon Product Advertising API credentials below. You can get these from the Amazon Associates program.</p>';
    }
    
    public function api_key_callback() {
        $value = get_option('amazon_product_api_key');
        echo '<input type="text" name="amazon_product_api_key" value="' . esc_attr($value) . '" class="regular-text" />';
    }
    
    public function secret_key_callback() {
        $value = get_option('amazon_product_secret_key');
        echo '<input type="password" name="amazon_product_secret_key" value="' . esc_attr($value) . '" class="regular-text" />';
    }
    
    public function partner_tag_callback() {
        $value = get_option('amazon_product_partner_tag');
        echo '<input type="text" name="amazon_product_partner_tag" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">Your Amazon Associate ID (e.g., yourname-20)</p>';
    }
    
    public function region_callback() {
        $value = get_option('amazon_product_region', 'us-east-1');
        $regions = array(
            'us-east-1' => 'United States',
            'eu-west-1' => 'United Kingdom',
            'us-west-2' => 'United States (West)',
            'ap-southeast-1' => 'Singapore'
        );
        
        echo '<select name="amazon_product_region">';
        foreach ($regions as $key => $label) {
            echo '<option value="' . esc_attr($key) . '"' . selected($value, $key, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
    }
    
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>Amazon Product Block Settings</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('amazon_product_settings');
                do_settings_sections('amazon_product_settings');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }
}

new AmazonProductBlock();