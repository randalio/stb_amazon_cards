/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/block.js":
/*!**********************!*\
  !*** ./src/block.js ***!
  \**********************/
/***/ (() => {

// Use window.wp to ensure dependencies are loaded
(function () {
  // Check if wp is available
  if (typeof wp === 'undefined' || !wp.blocks) {
    console.error('Amazon Product Block: WordPress blocks not available');
    return;
  }
  const {
    registerBlockType
  } = wp.blocks;
  const {
    InspectorControls,
    useBlockProps
  } = wp.blockEditor || {};
  const {
    PanelBody,
    TextControl,
    Button,
    Spinner,
    Notice,
    ToggleControl
  } = wp.components || {};
  const {
    useState,
    useEffect
  } = wp.element || {};

  // Check if all required components are available
  if (!registerBlockType || !InspectorControls || !useBlockProps || !PanelBody || !TextControl || !Button || !useState || !useEffect) {
    console.error('Amazon Product Block: Required WordPress components not available');
    return;
  }
  console.log('Amazon Product Block: All dependencies loaded, registering block...');

  // Helper function to detect if URL is a valid Amazon product URL
  const isValidAmazonUrl = url => {
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
        html: false
      },
      attributes: {
        productUrl: {
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
        lastFetched: {
          type: 'number',
          default: 0
        }
      },
      edit: function (props) {
        const {
          attributes,
          setAttributes
        } = props;
        const {
          productUrl,
          productData,
          autoFetch,
          lastFetched
        } = attributes;
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState('');
        const [fetchTimeout, setFetchTimeout] = useState(null);
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
              if (!silent) setAttributes({
                productData: {}
              });
            }
          } catch (err) {
            console.error('Fetch error details:', err);
            if (!silent) setError(`Network error: ${err.message}`);
            // Don't clear existing data on silent refresh failures
            if (!silent) setAttributes({
              productData: {}
            });
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
        const onUrlChange = newUrl => {
          setAttributes({
            productUrl: newUrl
          });
          if (!newUrl) {
            setAttributes({
              productData: {}
            });
            setError('');
          }
        };
        const manualRefresh = () => {
          fetchProductData(productUrl, false);
        };
        const hasProductData = productData && Object.keys(productData).length > 0;
        const dataAge = hasProductData && productData.fetchedAt ? Math.floor((Date.now() - productData.fetchedAt) / (1000 * 60)) : 0;
        return wp.element.createElement('div', blockProps, wp.element.createElement(InspectorControls, {}, wp.element.createElement(PanelBody, {
          title: 'Product Settings'
        }, wp.element.createElement(TextControl, {
          label: 'Amazon Product URL',
          value: productUrl,
          onChange: onUrlChange,
          placeholder: 'https://www.amazon.com/dp/ASIN',
          help: 'Enter the full Amazon product URL. Data will fetch automatically.'
        }), wp.element.createElement(ToggleControl, {
          label: 'Auto-fetch product data',
          checked: autoFetch,
          onChange: value => setAttributes({
            autoFetch: value
          }),
          help: 'Automatically fetch product data when URL changes and refresh periodically'
        }), wp.element.createElement('div', {
          style: {
            marginTop: '15px'
          }
        }, wp.element.createElement(Button, {
          isPrimary: true,
          onClick: manualRefresh,
          disabled: !productUrl || isLoading,
          style: {
            marginRight: '10px'
          }
        }, isLoading ? 'Refreshing...' : 'Refresh Data'), hasProductData && dataAge > 0 && wp.element.createElement('small', {
          style: {
            display: 'block',
            marginTop: '5px',
            color: dataAge > 60 ? '#d94f4f' : '#666',
            fontStyle: 'italic'
          }
        }, `Data is ${dataAge} minute${dataAge !== 1 ? 's' : ''} old`)))), wp.element.createElement('div', {
          className: 'amazon-product-block-placeholder'
        }, error && wp.element.createElement(Notice, {
          status: 'error',
          isDismissible: false
        }, error), !hasProductData && !isLoading && wp.element.createElement('div', {
          className: 'amazon-product-empty-state'
        }, wp.element.createElement('div', {
          className: 'amazon-product-icon'
        }, '🛒'), wp.element.createElement('h3', {}, 'Amazon Product Block'), wp.element.createElement('p', {}, autoFetch ? 'Enter an Amazon product URL above and data will be fetched automatically.' : 'Enter an Amazon product URL in the block settings and click "Refresh Data".')), isLoading && wp.element.createElement('div', {
          className: 'amazon-product-loading'
        }, wp.element.createElement(Spinner), wp.element.createElement('p', {}, 'Fetching product data...')), hasProductData && wp.element.createElement('div', {
          className: 'amazon-product-preview'
        }, wp.element.createElement('div', {
          className: 'amazon-product-card'
        }, productData.image && wp.element.createElement('div', {
          className: 'amazon-product-image'
        }, wp.element.createElement('img', {
          src: productData.image,
          alt: productData.title || 'Product Image'
        })), wp.element.createElement('div', {
          className: 'amazon-product-content'
        }, productData.title && wp.element.createElement('h3', {
          className: 'amazon-product-title'
        }, productData.title), productData.price && wp.element.createElement('div', {
          className: 'amazon-product-price'
        }, productData.price), wp.element.createElement('div', {
          className: 'amazon-product-button'
        }, 'Buy Now on Amazon'))))));
      },
      save: function () {
        // Server-side rendering with fresh data fetch
        return null;
      }
    });
    console.log('Amazon Product Block: Block registered successfully');
  } catch (error) {
    console.error('Amazon Product Block: Registration failed:', error);
  }
})();

/***/ }),

/***/ "./src/editor.scss":
/*!*************************!*\
  !*** ./src/editor.scss ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _block_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./block.js */ "./src/block.js");
/* harmony import */ var _block_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_block_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _editor_scss__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./editor.scss */ "./src/editor.scss");
/* harmony import */ var _style_scss__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./style.scss */ "./src/style.scss");
// Import the main block registration


// Import styles - WordPress build process will handle these



/***/ }),

/***/ "./src/style.scss":
/*!************************!*\
  !*** ./src/style.scss ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"index": 0,
/******/ 			"./style-index": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = globalThis["webpackChunkamazon_product_block"] = globalThis["webpackChunkamazon_product_block"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["./style-index"], () => (__webpack_require__("./src/index.js")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map