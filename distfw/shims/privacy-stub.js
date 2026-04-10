// Privacy API compatibility stub
// Firefox has limited support for chrome.privacy API

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  // Only activate if privacy API doesn't exist
  if (api && !api.privacy) {
    console.warn('⚠️ Privacy API stub loaded (cross-browser)');
    console.warn('⚠️ Firefox has different privacy settings architecture');
    
    const privacyStub = {
      network: {
        networkPredictionEnabled: {
          get: async function() {
            console.warn('⚠️ privacy.network.networkPredictionEnabled: Not supported');
            return { value: false, levelOfControl: 'not_controllable' };
          },
          set: async function() {
            console.warn('⚠️ privacy.network.networkPredictionEnabled: Not supported');
            throw new Error('privacy.network settings not controllable in Firefox');
          },
          clear: async function() {
            console.warn('⚠️ privacy.network.networkPredictionEnabled: Not supported');
          }
        },
        webRTCIPHandlingPolicy: {
          get: async function() {
            console.warn('⚠️ privacy.network.webRTCIPHandlingPolicy: Not supported');
            return { value: 'default', levelOfControl: 'not_controllable' };
          },
          set: async function() {
            console.warn('⚠️ privacy.network.webRTCIPHandlingPolicy: Not supported');
            throw new Error('privacy.network settings not controllable in Firefox');
          },
          clear: async function() {}
        }
      },
      services: {
        alternateErrorPagesEnabled: {
          get: async function() { 
            return { value: false, levelOfControl: 'not_controllable' }; 
          },
          set: async function() {
            throw new Error('privacy.services not controllable in Firefox');
          },
          clear: async function() {}
        },
        autofillEnabled: {
          get: async function() { 
            return { value: true, levelOfControl: 'not_controllable' }; 
          },
          set: async function() {
            throw new Error('privacy.services not controllable in Firefox');
          },
          clear: async function() {}
        },
        safeBrowsingEnabled: {
          get: async function() { 
            return { value: true, levelOfControl: 'not_controllable' }; 
          },
          set: async function() {
            throw new Error('privacy.services not controllable in Firefox');
          },
          clear: async function() {}
        }
      },
      websites: {
        thirdPartyCookiesAllowed: {
          get: async function() { 
            return { value: true, levelOfControl: 'not_controllable' }; 
          },
          set: async function() {
            throw new Error('privacy.websites not controllable in Firefox');
          },
          clear: async function() {}
        },
        hyperlinkAuditingEnabled: {
          get: async function() { 
            return { value: true, levelOfControl: 'not_controllable' }; 
          },
          set: async function() {
            throw new Error('privacy.websites not controllable in Firefox');
          },
          clear: async function() {}
        },
        referrersEnabled: {
          get: async function() { 
            return { value: true, levelOfControl: 'not_controllable' }; 
          },
          set: async function() {
            throw new Error('privacy.websites not controllable in Firefox');
          },
          clear: async function() {}
        }
      }
    };
    
    // Make available to both namespaces (cross-browser)
    if (typeof chrome !== 'undefined' && !chrome.privacy) {
      chrome.privacy = privacyStub;
    }
    if (typeof browser !== 'undefined' && !browser.privacy) {
      browser.privacy = privacyStub;
    }
    
    console.info('💡 Use browser preferences for privacy settings');
  }
})();
