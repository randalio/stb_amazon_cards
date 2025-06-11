// Use window.wp to ensure dependencies are loaded
(function() {
    // Check if wp is available
    if (typeof wp === 'undefined' || !wp.blocks) {
        console.error('Amazon Product Block: WordPress blocks not available');
        return;
    }

    const { registerBlockType } = wp.blocks;
    const { 
        InspectorControls, 
        useBlockProps 
    } = wp.blockEditor || {};
    const { 
        PanelBody, 
        TextControl, 
        TextareaControl,
        Button, 
        Spinner, 
        Notice,
        ToggleControl 
    } = wp.components || {};
    const { useState, useEffect } = wp.element || {};

    // Check if all required components are available
    if (!registerBlockType || !InspectorControls || !useBlockProps || !PanelBody || !TextControl || !Button || !useState || !useEffect) {
        console.error('Amazon Product Block: Required WordPress components not available');
        return;
    }

    console.log('Amazon Product Block: All dependencies loaded, registering block...');

    // Helper function to detect if URL is a valid Amazon product URL
    const isValidAmazonUrl = (url) => {
        if (!url) return false;
        const amazonRegex = /amazon\.(com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp|in|com\.br|com\.mx)\/.*\/dp\/[A-Z0-9]{10}/i;
        const amazonShortRegex = /amzn\.to\/[A-Za-z0-9]+/i;
        return amazonRegex.test(url) || amazonShortRegex.test(url) || url.includes('/dp/') || url.includes('/gp/product/');
    };

    try {
        registerBlockType('amazon-product/block', {
            title: 'Amazon Product',
            description: 'Display an Amazon product with image, title, price, and buy button',
            category: 'embed',
            icon: 'cart',
            supports: {
                html: false,
            },
            attributes: {
                productUrl: {
                    type: 'string',
                    default: ''
                },
                alternateTitle: {
                    type: 'string',
                    default: ''
                },
                additionalText: {
                    type: 'string',
                    default: ''
                },
                productData: {
                    type: 'object',
                    default: {}
                },
                autoFetch: {
                    type: 'boolean',
                    default: true
                },
                orientation: {
                    type: 'boolean',
                    default: true
                },
                lastFetched: {
                    type: 'number',
                    default: 0
                }
            },

            edit: function(props) {
                const { attributes, setAttributes } = props;
                const { productUrl, alternateTitle, additionalText, productData, autoFetch, orientation, lastFetched } = attributes;
                const [isLoading, setIsLoading] = useState(false);
                const [error, setError] = useState('');
                const [fetchTimeout, setFetchTimeout] = useState(null);

                const orientationClass = attributes.orientation ? 'vertical' : 'horizontal' ;
                
                const blockProps = useBlockProps({
                    className: 'amazon-product-block-editor'
                });

                // Fetch product data function
                const fetchProductData = async (url = productUrl, silent = false) => {
                    console.log('fetchProductData called with URL:', url);
                    
                    if (!url) {
                        if (!silent) setError('Please enter a product URL');
                        return;
                    }

                    if (!isValidAmazonUrl(url)) {
                        if (!silent) setError('Please enter a valid Amazon product URL');
                        return;
                    }

                    if (!window.amazonProductBlock) {
                        console.error('amazonProductBlock not found on window object');
                        if (!silent) setError('Amazon Product Block not properly initialized. Please check your API settings.');
                        return;
                    }

                    console.log('amazonProductBlock object:', window.amazonProductBlock);

                    if (!silent) setIsLoading(true);
                    setError('');

                    try {
                        const formData = new FormData();
                        formData.append('action', 'fetch_amazon_product');
                        formData.append('productUrl', url);
                        formData.append('nonce', window.amazonProductBlock.nonce);

                        console.log('Sending request to:', window.amazonProductBlock.ajaxUrl);

                        const response = await fetch(window.amazonProductBlock.ajaxUrl, {
                            method: 'POST',
                            body: formData
                        });

                        console.log('Response status:', response.status);

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const result = await response.json();
                        console.log('Response result:', result);

                        if (result.success) {
                            console.log('Product data received:', result.data);
                            
                            // Add timestamp to track when data was last fetched
                            const updatedData = {
                                ...result.data,
                                fetchedAt: Date.now()
                            };
                            
                            setAttributes({ 
                                productData: updatedData,
                                lastFetched: Date.now()
                            });
                            setError('');
                            console.log('Product data set successfully:', updatedData);
                        } else {
                            const errorMessage = result.data || 'Failed to fetch product data';
                            console.error('Server returned error:', errorMessage);
                            if (!silent) setError(errorMessage);
                            // Don't clear existing data on silent refresh failures
                            if (!silent) setAttributes({ productData: {} });
                        }
                    } catch (err) {
                        console.error('Fetch error details:', err);
                        if (!silent) setError(`Network error: ${err.message}`);
                        // Don't clear existing data on silent refresh failures
                        if (!silent) setAttributes({ productData: {} });
                    } finally {
                        if (!silent) setIsLoading(false);
                    }
                };

                // Auto-fetch when URL changes
                useEffect(() => {
                    if (fetchTimeout) {
                        clearTimeout(fetchTimeout);
                    }

                    if (productUrl && autoFetch && isValidAmazonUrl(productUrl)) {
                        // Debounce the fetch to avoid too many requests while typing
                        const timeout = setTimeout(() => {
                            fetchProductData(productUrl, true);
                        }, 1000);
                        setFetchTimeout(timeout);
                    }

                    return () => {
                        if (fetchTimeout) {
                            clearTimeout(fetchTimeout);
                        }
                    };
                }, [productUrl, autoFetch]);

                // Auto-refresh data periodically (every 5 minutes if block is selected)
                useEffect(() => {
                    if (!autoFetch || !productUrl || !props.isSelected) return;

                    const interval = setInterval(() => {
                        const now = Date.now();
                        const fiveMinutes = 5 * 60 * 1000;
                        
                        if (now - lastFetched > fiveMinutes) {
                            console.log('Auto-refreshing product data...');
                            fetchProductData(productUrl, true);
                        }
                    }, 60000); // Check every minute

                    return () => clearInterval(interval);
                }, [productUrl, autoFetch, lastFetched, props.isSelected]);

                const onUrlChange = (newUrl) => {
                    setAttributes({ productUrl: newUrl });
                    if (!newUrl) {
                        setAttributes({ productData: {} });
                        setError('');
                    }
                };

                const manualRefresh = () => {
                    fetchProductData(productUrl, false);
                };

                const hasProductData = productData && Object.keys(productData).length > 0;
                const dataAge = hasProductData && productData.fetchedAt ? 
                    Math.floor((Date.now() - productData.fetchedAt) / (1000 * 60)) : 0;

                return wp.element.createElement('div', blockProps,
                    wp.element.createElement(InspectorControls, {},
                        wp.element.createElement(PanelBody, { title: 'Product Settings' },
                            wp.element.createElement(TextControl, {
                                label: 'Amazon Product URL',
                                value: productUrl,
                                onChange: onUrlChange,
                                placeholder: 'https://www.amazon.com/dp/ASIN',
                                help: 'Enter the full Amazon product URL. Data will fetch automatically.'
                            }),
                            wp.element.createElement(TextControl, {
                                label: 'Alternate Title',
                                value: alternateTitle,
                                onChange: (value) => setAttributes({ alternateTitle: value }),
                                placeholder: '',
                                help: 'Replace the default Amazon title with custom text.'
                            }),
                            wp.element.createElement(TextareaControl, {
                                label: 'Additional Text',
                                value: additionalText,
                                onChange: (value) => setAttributes({ additionalText: value }),
                                placeholder: '',
                                help: 'Additional paragraph text (optional).'
                            }),
                            wp.element.createElement(ToggleControl, {
                                label: 'Auto-fetch product data',
                                checked: autoFetch,
                                onChange: (value) => setAttributes({ autoFetch: value }),
                                help: 'Automatically fetch product data when URL changes and refresh periodically'
                            }),
                            wp.element.createElement(ToggleControl, {
                                label: 'Horizontal/ Vertical',
                                checked: orientation,
                                onChange: (value) => setAttributes({ orientation: value }),
                                help: 'Choose the orientation of the product display.'
                            }),
                            wp.element.createElement('div', { style: { marginTop: '15px' } },
                                wp.element.createElement(Button, {
                                    isPrimary: true,
                                    onClick: manualRefresh,
                                    disabled: !productUrl || isLoading,
                                    style: { marginRight: '10px' }
                                }, isLoading ? 'Refreshing...' : 'Refresh Data'),
                                hasProductData && dataAge > 0 && wp.element.createElement('small', {
                                    style: { 
                                        display: 'block', 
                                        marginTop: '5px', 
                                        color: dataAge > 60 ? '#d94f4f' : '#666',
                                        fontStyle: 'italic'
                                    }
                                }, `Data is ${dataAge} minute${dataAge !== 1 ? 's' : ''} old`)
                            )
                        )
                    ),
                    wp.element.createElement('div', { className: 'amazon-product-block-placeholder' },
                        error && wp.element.createElement(Notice, { status: 'error', isDismissible: false }, error),
                        !hasProductData && !isLoading && wp.element.createElement('div', { className: 'amazon-product-empty-state' },
                            wp.element.createElement('div', { className: 'amazon-product-icon' }, '🛒'),
                            wp.element.createElement('h3', {}, 'Amazon Product Block'),
                            wp.element.createElement('p', {}, autoFetch ? 
                                'Enter an Amazon product URL above and data will be fetched automatically.' :
                                'Enter an Amazon product URL in the block settings and click "Refresh Data".'
                            )
                        ),
                        isLoading && wp.element.createElement('div', { className: 'amazon-product-loading' },
                            wp.element.createElement(Spinner),
                            wp.element.createElement('p', {}, 'Fetching product data...')
                        ),
                        hasProductData && wp.element.createElement('div', { className: 'amazon-product-preview' },
                            wp.element.createElement('div', { className: 'amazon-product-card orientation-'+orientationClass+'' },
                                productData.image && wp.element.createElement('div', { className: 'amazon-product-image' },
                                    wp.element.createElement('img', {
                                        src: productData.image,
                                        alt: productData.title || 'Product Image'
                                    })
                                ),
                                wp.element.createElement('div', { className: 'amazon-product-content' },
                                    productData.title && wp.element.createElement('h3', { className: 'amazon-product-title' }, alternateTitle !== '' ? alternateTitle : productData.title),
                                    wp.element.createElement('p', { className: 'amazon-product-description' }, additionalText ),
                                    productData.price && wp.element.createElement('div', { className: 'amazon-product-price' }, productData.price),
                                    wp.element.createElement('div', { className: 'amazon-product-button' }, 'Buy Now on Amazon')
                                )
                            )
                        )
                    )
                );
            },

            save: function() {
                // Server-side rendering with fresh data fetch
                return null;
            }
        });

        console.log('Amazon Product Block: Block registered successfully');
    } catch (error) {
        console.error('Amazon Product Block: Registration failed:', error);
    }
})();