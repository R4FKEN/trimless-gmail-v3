// Downloads API compatibility for Chrome-specific features
// Firefox doesn't support some Chrome-only downloads methods

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  if (api && api.downloads) {
    // downloads.acceptDanger stub
    if (!api.downloads.acceptDanger) {
      api.downloads.acceptDanger = async function(downloadId) {
        console.warn('⚠️ downloads.acceptDanger is not supported in Firefox');
        console.info('💡 Firefox handles dangerous downloads differently');
        throw new Error('downloads.acceptDanger not available in Firefox');
      };
    }
    
    // downloads.setShelfEnabled stub
    if (!api.downloads.setShelfEnabled) {
      api.downloads.setShelfEnabled = function(enabled) {
        console.warn('⚠️ downloads.setShelfEnabled is not supported in Firefox');
        console.info('💡 This controls Chrome\'s download shelf UI');
        // No-op in Firefox
      };
    }
    
    // Wrap downloads.download to filter unsupported options
    const originalDownload = api.downloads.download;
    api.downloads.download = async function(options) {
      const filteredOptions = { ...options };
      
      // Remove Chrome-only options
      if (filteredOptions.conflictAction) {
        console.warn('⚠️ downloads.download: conflictAction not supported in Firefox');
        delete filteredOptions.conflictAction;
      }
      
      return await originalDownload.call(this, filteredOptions);
    };
  }
  
  console.info('✅ Downloads API compatibility loaded (cross-browser)');
})();
