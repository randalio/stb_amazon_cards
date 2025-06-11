// Frontend JavaScript for Amazon Product Block
(function() {
    'use strict';
    
    // Check if we have the necessary global variables
    if (typeof amazonProductFrontend === 'undefined') {
        console.error('Amazon Product Block: Frontend configuration not loaded');
        return;
    }

    const config = amazonProductFrontend;
    
    // Track active requests to prevent duplicates
    const activeRequests = new Set();
    
    // Initialize all product blocks on page load
    function initializeProductBlocks() {
        const blocks = document.querySelectorAll('.amazon-product-block-frontend');
        
        blocks.forEach(block => {
            const productUrl = block.dataset.productUrl;
            const autoFetch = block.dataset.autoFetch === 'true';
            const lastFetched = parseInt(block.dataset.lastFetched) || 0;
            
            if (!productUrl) return;
            
            // Check if data needs refreshing (older than 5 minutes)
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            const needsRefresh = lastFetched < fiveMinutesAgo;
            
            if (autoFetch && needsRefresh) {
                // Add a small random delay to prevent all blocks from fetching simultaneously
                const delay = Math.random() * 2000;
                setTimeout(() => {
                    fetchProductData(block, productUrl, true);
                }, delay);
            }
            
            // Set up periodic refresh if auto-fetch is enabled
            if (autoFetch) {
                setupPeriodicRefresh(block, productUrl);
            }
        });
    }
    
    // Setup periodic refresh for a block
    function setupPeriodicRefresh(block, productUrl) {
        // Refresh every 5 minutes
        const interval = setInterval(() => {
            // Only refresh if the block is still in the DOM and visible
            if (!document.body.contains(block)) {
                clearInterval(interval);
                return;
            }
            
            // Check if block is in viewport before refreshing
            if (isElementInViewport(block)) {
                fetchProductData(block, productUrl, true);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        // Store interval ID for cleanup
        block.dataset.refreshInterval = interval;
    }
    
    // Check if element is in viewport
    function isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // Fetch fresh product data
    async function fetchProductData(block, productUrl, silent = false) {
        // Prevent duplicate requests for the same URL
        if (activeRequests.has(productUrl)) {
            return;
        }
        
        activeRequests.add(productUrl);
        
        const priceContainer = block.querySelector('[data-price-container]');
        const priceValue = priceContainer?.querySelector('.price-value');
        const priceLoading = priceContainer?.querySelector('.price-loading');
        
        try {
            // Show loading state for price updates
            if (!silent && priceContainer) {
                if (priceValue) priceValue.style.opacity = '0.5';
                if (priceLoading) priceLoading.style.display = 'inline';
            }
            
            const formData = new FormData();
            formData.append('action', 'fetch_amazon_product_frontend');
            formData.append('productUrl', productUrl);
            formData.append('nonce', config.nonce);
            
            const response = await fetch(config.ajaxUrl, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                updateBlockContent(block, result.data);
                
                // Update the last fetched timestamp
                block.dataset.lastFetched = Date.now().toString();
                
                if (!silent) {
                    console.log('Amazon Product Block: Data refreshed for', productUrl);
                }
            } else {
                throw new Error(result.data || 'Failed to fetch product data');
            }
            
        } catch (error) {
            console.error('Amazon Product Block: Fetch error', error);
            
            // Only show error for non-silent requests
            if (!silent) {
                showError(block, 'Failed to update product information');
            }
        } finally {
            activeRequests.delete(productUrl);
            
            // Hide loading state
            if (priceContainer) {
                if (priceValue) priceValue.style.opacity = '1';
                if (priceLoading) priceLoading.style.display = 'none';
            }
        }
    }
    
    // Update block content with fresh data
    function updateBlockContent(block, data) {
        // Update title
        const titleElement = block.querySelector('.amazon-product-title');
        if (titleElement && data.title) {
            titleElement.textContent = data.title;
        }
        
        // Update price with animation
        const priceElement = block.querySelector('.price-value');
        if (priceElement && data.price) {
            // Only update if price has changed
            if (priceElement.textContent !== data.price) {
                priceElement.style.transition = 'all 0.3s ease';
                priceElement.style.transform = 'scale(1.05)';
                priceElement.textContent = data.price;
                
                // Add a subtle highlight effect
                priceElement.classList.add('price-updated');
                
                // Reset animation after a short delay
                setTimeout(() => {
                    priceElement.style.transform = 'scale(1)';
                    setTimeout(() => {
                        priceElement.classList.remove('price-updated');
                    }, 2000);
                }, 150);
            }
        }
        
        // Update image
        const imageElement = block.querySelector('.amazon-product-image img');
        if (imageElement && data.image) {
            imageElement.src = data.image;
            imageElement.alt = data.title || 'Product Image';
        }
        
        // If block was in loading state, replace with content
        const loadingElement = block.querySelector('.amazon-product-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
            
            // Create product card if it doesn't exist
            let productCard = block.querySelector('.amazon-product-card');
            if (!productCard) {
                productCard = createProductCard(data, block.dataset.productUrl);
                block.appendChild(productCard);
            }
        }
    }
    
    // Create product card element
    function createProductCard(data, productUrl) {
        const card = document.createElement('div');
        card.className = 'amazon-product-card';
        
        card.innerHTML = `
            ${data.image ? `
                <div class="amazon-product-image">
                    <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || 'Product Image')}" loading="lazy">
                </div>
            ` : ''}
            <div class="amazon-product-content">
                ${data.title ? `<h3 class="amazon-product-title">${escapeHtml(data.title)}</h3>` : ''}
                ${data.price ? `
                    <div class="amazon-product-price" data-price-container>
                        <span class="price-value">${escapeHtml(data.price)}</span>
                        <span class="price-loading" style="display: none;">Updating...</span>
                    </div>
                ` : ''}
                <a href="${escapeHtml(productUrl)}" class="amazon-product-button" target="_blank" rel="noopener noreferrer nofollow">
                    Buy Now on Amazon
                </a>
            </div>
        `;
        
        return card;
    }
    
    // Show error message
    function showError(block, message) {
        const existingError = block.querySelector('.amazon-product-error');
        if (existingError) {
            existingError.remove();
        }
        
        const errorElement = document.createElement('div');
        errorElement.className = 'amazon-product-error';
        errorElement.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${escapeHtml(message)}</span>
            </div>
        `;
        
        block.insertBefore(errorElement, block.firstChild);
        
        // Auto-remove error after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Add manual refresh functionality
    function addManualRefreshButton(block, productUrl) {
        const existingButton = block.querySelector('.manual-refresh-button');
        if (existingButton) return;
        
        const refreshButton = document.createElement('button');
        refreshButton.className = 'manual-refresh-button';
        refreshButton.innerHTML = '↻ Refresh';
        refreshButton.title = 'Refresh product data';
        
        refreshButton.addEventListener('click', (e) => {
            e.preventDefault();
            fetchProductData(block, productUrl, false);
        });
        
        const productCard = block.querySelector('.amazon-product-card');
        if (productCard) {
            productCard.appendChild(refreshButton);
        }
    }
    
    // Handle visibility change to pause/resume updates when tab is not active
    function handleVisibilityChange() {
        const blocks = document.querySelectorAll('.amazon-product-block-frontend');
        
        blocks.forEach(block => {
            const intervalId = block.dataset.refreshInterval;
            const productUrl = block.dataset.productUrl;
            const autoFetch = block.dataset.autoFetch === 'true';
            
            if (document.hidden) {
                // Pause updates when tab is not visible
                if (intervalId) {
                    clearInterval(parseInt(intervalId));
                    block.dataset.refreshInterval = '';
                }
            } else {
                // Resume updates when tab becomes visible
                if (autoFetch && !intervalId && productUrl) {
                    setupPeriodicRefresh(block, productUrl);
                    
                    // Immediately refresh if data is stale
                    const lastFetched = parseInt(block.dataset.lastFetched) || 0;
                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                    
                    if (lastFetched < fiveMinutesAgo) {
                        fetchProductData(block, productUrl, true);
                    }
                }
            }
        });
    }
    
    // Add intersection observer for lazy loading updates
    function setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            return; // Fallback for older browsers
        }
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const block = entry.target;
                const productUrl = block.dataset.productUrl;
                const autoFetch = block.dataset.autoFetch === 'true';
                
                if (entry.isIntersecting && autoFetch && productUrl) {
                    const lastFetched = parseInt(block.dataset.lastFetched) || 0;
                    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
                    
                    // If data is very stale and block just came into view, refresh it
                    if (lastFetched < tenMinutesAgo) {
                        fetchProductData(block, productUrl, true);
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        });
        
        // Observe all product blocks
        document.querySelectorAll('.amazon-product-block-frontend').forEach(block => {
            observer.observe(block);
        });
    }
    
    // Handle network status changes
    function handleNetworkChange() {
        if (navigator.onLine) {
            // Network is back online, refresh stale data
            const blocks = document.querySelectorAll('.amazon-product-block-frontend');
            
            blocks.forEach(block => {
                const productUrl = block.dataset.productUrl;
                const autoFetch = block.dataset.autoFetch === 'true';
                const lastFetched = parseInt(block.dataset.lastFetched) || 0;
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                
                if (autoFetch && productUrl && lastFetched < fiveMinutesAgo) {
                    // Add a random delay to prevent all blocks from updating simultaneously
                    const delay = Math.random() * 3000;
                    setTimeout(() => {
                        fetchProductData(block, productUrl, true);
                    }, delay);
                }
            });
        }
    }
    
    // Cleanup function for when blocks are removed from DOM
    function cleanupRemovedBlocks() {
        document.querySelectorAll('.amazon-product-block-frontend').forEach(block => {
            if (!document.body.contains(block)) {
                const intervalId = block.dataset.refreshInterval;
                if (intervalId) {
                    clearInterval(parseInt(intervalId));
                }
            }
        });
    }
    
    // Initialize everything when DOM is ready
    function init() {
        // Initialize existing blocks
        initializeProductBlocks();
        
        // Setup intersection observer for performance
        setupIntersectionObserver();
        
        // Add manual refresh buttons to blocks
        document.querySelectorAll('.amazon-product-block-frontend').forEach(block => {
            const productUrl = block.dataset.productUrl;
            if (productUrl) {
                addManualRefreshButton(block, productUrl);
            }
        });
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Handle network status changes
        window.addEventListener('online', handleNetworkChange);
        window.addEventListener('offline', handleNetworkChange);
        
        // Cleanup removed blocks periodically
        setInterval(cleanupRemovedBlocks, 30000); // Every 30 seconds
        
        console.log('Amazon Product Block: Frontend initialized');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Handle dynamic content (for themes that load content via AJAX)
    const originalCreateElement = document.createElement;
    document.createElement = function(...args) {
        const element = originalCreateElement.apply(this, args);
        
        // If new Amazon product blocks are added dynamically, initialize them
        if (element.classList && element.classList.contains('amazon-product-block-frontend')) {
            setTimeout(() => {
                const productUrl = element.dataset.productUrl;
                const autoFetch = element.dataset.autoFetch === 'true';
                
                if (productUrl && autoFetch) {
                    fetchProductData(element, productUrl, true);
                    setupPeriodicRefresh(element, productUrl);
                    addManualRefreshButton(element, productUrl);
                }
            }, 100);
        }
        
        return element;
    };
    
    // Expose some functions globally for debugging
    if (window.console && typeof window.console.log === 'function') {
        window.amazonProductBlockDebug = {
            refreshAll: function() {
                document.querySelectorAll('.amazon-product-block-frontend').forEach(block => {
                    const productUrl = block.dataset.productUrl;
                    if (productUrl) {
                        fetchProductData(block, productUrl, false);
                    }
                });
            },
            getBlockStatus: function() {
                const blocks = Array.from(document.querySelectorAll('.amazon-product-block-frontend'));
                return blocks.map(block => ({
                    url: block.dataset.productUrl,
                    autoFetch: block.dataset.autoFetch,
                    lastFetched: new Date(parseInt(block.dataset.lastFetched || 0)),
                    hasInterval: !!block.dataset.refreshInterval
                }));
            }
        };
    }
    
})();