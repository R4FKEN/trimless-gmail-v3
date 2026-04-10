// Storage session compatibility shim
// Provides in-memory fallback for chrome.storage.session (Chrome 102+)
// Firefox doesn't support storage.session, so we use an in-memory Map()

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  // In-memory storage for session data
  const sessionStore = new Map();
  
  const storageSessionCompat = {
    get: async function(keys) {
      if (keys === null || keys === undefined) {
        // Return all items
        const result = {};
        sessionStore.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }
      
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const result = {};
      
      if (typeof keys === 'string') {
        const value = sessionStore.get(keys);
        if (value !== undefined) {
          result[keys] = value;
        }
        return result;
      }
      
      if (Array.isArray(keys)) {
        keysArray.forEach(key => {
          const value = sessionStore.get(key);
          if (value !== undefined) {
            result[key] = value;
          }
        });
        return result;
      }
      
      if (typeof keys === 'object') {
        // Keys is an object with default values
        Object.keys(keys).forEach(key => {
          const value = sessionStore.get(key);
          result[key] = value !== undefined ? value : keys[key];
        });
        return result;
      }
      
      return result;
    },
    
    set: async function(items) {
      Object.keys(items).forEach(key => {
        sessionStore.set(key, items[key]);
      });
      return;
    },
    
    remove: async function(keys) {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        sessionStore.delete(key);
      });
      return;
    },
    
    clear: async function() {
      sessionStore.clear();
      return;
    },
    
    getBytesInUse: async function(keys) {
      console.warn('⚠️ storage.session.getBytesInUse is not implemented in polyfill');
      return 0;
    },
    
    getKeys: async function() {
      return Array.from(sessionStore.keys());
    },
    
    setAccessLevel: async function(accessOptions) {
      console.warn('⚠️ storage.session.setAccessLevel is not supported');
      return;
    },
    
    onChanged: {
      addListener: function(callback) {
        console.warn('⚠️ storage.session.onChanged is not supported in polyfill');
      },
      removeListener: function() {},
      hasListener: function() { return false; }
    }
  };
  
  // Attach polyfill to chrome/browser objects (cross-browser)
  if (api && api.storage && !api.storage.session) {
    api.storage.session = storageSessionCompat;
    console.info('✅ storage.session polyfill loaded (cross-browser)');
  }
})();
