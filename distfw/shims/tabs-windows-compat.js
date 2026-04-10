// Legacy tabs/windows API compatibility shim
// Maps deprecated Chrome APIs to modern equivalents

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  if (api && api.tabs) {
    // tabs.getSelected → tabs.query({active: true, currentWindow: true})
    if (!api.tabs.getSelected) {
      api.tabs.getSelected = async function(windowId, callback) {
        console.warn('⚠️ tabs.getSelected is deprecated, using tabs.query instead');
        const query = { active: true };
        if (windowId !== null && windowId !== undefined) {
          query.windowId = windowId;
        } else {
          query.currentWindow = true;
        }
        
        try {
          const tabs = await api.tabs.query(query);
          const result = tabs[0] || null;
          if (callback) callback(result);
          return result;
        } catch (error) {
          if (callback) callback(null);
          throw error;
        }
      };
    }
    
    // tabs.getAllInWindow → tabs.query({windowId: ...})
    if (!api.tabs.getAllInWindow) {
      api.tabs.getAllInWindow = async function(windowId, callback) {
        console.warn('⚠️ tabs.getAllInWindow is deprecated, using tabs.query instead');
        const query = windowId !== null && windowId !== undefined
          ? { windowId }
          : { currentWindow: true };
        
        try {
          const tabs = await api.tabs.query(query);
          if (callback) callback(tabs);
          return tabs;
        } catch (error) {
          if (callback) callback([]);
          throw error;
        }
      };
    }
  }
  
  if (api && api.windows && api.windows.create) {
    // Wrap windows.create to handle focused parameter
    const originalCreate = api.windows.create;
    api.windows.create = async function(createData, callback) {
      console.info('⚙️ windows.create: handling focused parameter');
      
      // Firefox supports focused parameter differently
      const data = { ...createData };
      if (data.focused !== undefined) {
        // Convert to state parameter for Firefox
        if (data.focused === false && !data.state) {
          data.state = 'minimized';
        }
      }
      
      try {
        const result = await originalCreate.call(this, data);
        if (callback) callback(result);
        return result;
      } catch (error) {
        if (callback) callback(null);
        throw error;
      }
    };
  }
  
  console.info('✅ Legacy tabs/windows API compatibility loaded (cross-browser)');
})();
