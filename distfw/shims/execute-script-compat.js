// executeScript parameter compatibility fix
// Chrome uses 'function', Firefox uses 'func' parameter
// This runtime interceptor makes extensions work in BOTH browsers

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  if (api && api.tabs && api.tabs.executeScript) {
    // Save original function
    if (!api.tabs.__executeScript) {
      api.tabs.__executeScript = api.tabs.executeScript;
      
      // Intercept and fix parameter names
      api.tabs.executeScript = function(tabId, details, callback) {
        const fixedDetails = { ...details };
        
        // Firefox uses 'func', Chrome uses 'function'
        if (details.function && !details.func) {
          fixedDetails.func = details.function;
          delete fixedDetails.function;
        }
        
        // Call original with fixed parameters
        return api.tabs.__executeScript(tabId, fixedDetails, callback);
      };
      
      console.info('✅ executeScript cross-browser compatibility enabled');
    }
  }
  
  // Also fix scripting.executeScript if it exists (Manifest V3)
  if (api && api.scripting && api.scripting.executeScript) {
    if (!api.scripting.__executeScript) {
      api.scripting.__executeScript = api.scripting.executeScript;
      
      api.scripting.executeScript = function(injection) {
        const fixedInjection = { ...injection };
        
        if (fixedInjection.func === undefined && fixedInjection.function) {
          fixedInjection.func = fixedInjection.function;
          delete fixedInjection.function;
        }
        
        return api.scripting.__executeScript(fixedInjection);
      };
      
      console.info('✅ scripting.executeScript cross-browser compatibility enabled');
    }
  }
})();
