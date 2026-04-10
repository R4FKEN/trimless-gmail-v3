// sidePanel API compatibility shim for Firefox
// Chrome's sidePanel API is not available in Firefox - provides sidebar fallback

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  // Only activate in Firefox where sidePanel doesn't exist but sidebarAction does
  if (api && !api.sidePanel && typeof browser !== 'undefined' && browser.sidebarAction) {
    console.info('⚙️ sidePanel compatibility shim loaded - using Firefox sidebar API');
    
    const sidePanelCompat = {
      setOptions: async function(options) {
        try {
          const firefoxOptions = {};
          if (options.tabId !== undefined) firefoxOptions.tabId = options.tabId;
          if (options.path !== undefined) firefoxOptions.panel = options.path;
          if (options.enabled !== undefined && options.enabled) {
            await browser.sidebarAction.open();
          }
          await browser.sidebarAction.setPanel(firefoxOptions);
        } catch (error) {
          console.error('❌ sidePanel.setOptions failed:', error);
          throw error;
        }
      },
      
      open: async function(options) {
        try {
          const openOptions = {};
          if (options && options.windowId !== undefined) {
            openOptions.windowId = options.windowId;
          }
          await browser.sidebarAction.open(openOptions);
        } catch (error) {
          console.error('❌ sidePanel.open failed:', error);
          throw error;
        }
      },
      
      getOptions: async function(options) {
        console.warn('⚠️ sidePanel.getOptions: Limited support in Firefox');
        try {
          const panel = await browser.sidebarAction.getPanel(options || {});
          return { path: panel, enabled: true };
        } catch (error) {
          return { enabled: false };
        }
      },
      
      setPanelBehavior: async function() {
        console.warn('⚠️ sidePanel.setPanelBehavior: Not supported in Firefox');
        return;
      },
      
      getPanelBehavior: async function() {
        return { openPanelOnActionClick: false };
      },
      
      onOpened: {
        addListener: function() {
          console.warn('⚠️ sidePanel.onOpened: Cannot be fully emulated in Firefox');
        },
        removeListener: function() {},
        hasListener: function() { return false; }
      }
    };
    
    // Make available to both namespaces (cross-browser)
    if (typeof chrome !== 'undefined' && !chrome.sidePanel) chrome.sidePanel = sidePanelCompat;
    if (typeof browser !== 'undefined' && !browser.sidePanel) browser.sidePanel = sidePanelCompat;
  }
})();
