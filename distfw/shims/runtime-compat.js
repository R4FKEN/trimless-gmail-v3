// Runtime API compatibility stubs
// Handles Chrome-specific runtime methods

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  if (api && api.runtime) {
    // runtime.getPackageDirectoryEntry stub
    if (!api.runtime.getPackageDirectoryEntry) {
      api.runtime.getPackageDirectoryEntry = function(callback) {
        console.warn('⚠️ runtime.getPackageDirectoryEntry is not supported in Firefox');
        console.info('💡 Use browser.runtime.getURL() for extension resources instead');
        
        // Return a stub DirectoryEntry-like object
        const stub = {
          isFile: false,
          isDirectory: true,
          name: 'extension-root',
          fullPath: '/',
          getFile: function() {
            throw new Error('getFile not supported - use browser.runtime.getURL()');
          },
          getDirectory: function() {
            throw new Error('getDirectory not supported - use browser.runtime.getURL()');
          }
        };
        
        if (callback) callback(stub);
        return Promise.resolve(stub);
      };
    }
  }
  
  console.info('✅ Runtime API compatibility loaded (cross-browser)');
})();
