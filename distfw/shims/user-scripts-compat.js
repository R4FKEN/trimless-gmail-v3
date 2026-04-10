// userScripts API compatibility shim for Firefox
// Translates Chrome's userScripts API to Firefox's equivalent

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  // Only activate if userScripts doesn't exist
  if (api && !api.userScripts && typeof browser !== 'undefined') {
    console.info('⚙️ userScripts compatibility shim loaded (cross-browser)');
    
    const userScriptsCompat = {
      register: async function(scripts) {
        // Firefox uses browser.contentScripts.register() or browser.userScripts.register()
        if (browser.userScripts && browser.userScripts.register) {
          // Firefox supports userScripts API (Firefox 102+)
          return await browser.userScripts.register(scripts);
        } else if (browser.contentScripts && browser.contentScripts.register) {
          // Fallback to contentScripts API
          console.info('💡 Using contentScripts.register as fallback');
          return await browser.contentScripts.register(scripts);
        } else {
          throw new Error('Neither userScripts nor contentScripts API available');
        }
      },
      
      unregister: async function(filter) {
        console.warn('⚠️ userScripts.unregister: Limited support');
        // Firefox doesn't have direct unregister by filter
        return;
      },
      
      update: async function(scripts) {
        console.warn('⚠️ userScripts.update: Not directly supported, use unregister + register');
        throw new Error('userScripts.update not available, use unregister then register');
      },
      
      getScripts: async function(filter) {
        console.warn('⚠️ userScripts.getScripts: Not supported in Firefox');
        return [];
      }
    };
    
    // Make available to both namespaces (cross-browser)
    if (typeof chrome !== 'undefined' && !chrome.userScripts) {
      chrome.userScripts = userScriptsCompat;
    }
    if (typeof browser !== 'undefined' && !browser.userScripts) {
      browser.userScripts = userScriptsCompat;
    }
  }
})();
