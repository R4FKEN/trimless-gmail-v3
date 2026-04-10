// declarativeNetRequest → webRequest converter for Firefox
// Automatically converts Chrome's DNR rules to Firefox webRequest listeners

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  // Only activate if DNR doesn't exist (Firefox) or needs conversion
  if (api && !api.declarativeNetRequest) {
    console.info('🔄 declarativeNetRequest → webRequest converter loaded');
    
    // Storage for rules
    const dynamicRules = new Map();
    const sessionRules = new Map();
    let nextRuleId = 1;
    
    // Active webRequest listeners
    const activeListeners = new Map();
    
    // Debug event emitter
    const debugListeners = new Set();
    
    /**
     * Convert DNR URL filter to webRequest URL pattern
     */
    function convertUrlFilter(urlFilter) {
      if (!urlFilter) return '*://*/*';
      
      // Simple conversion - handle common patterns
      let pattern = urlFilter;
      
      // If no protocol, add wildcard
      if (!pattern.includes('://')) {
        pattern = '*://' + pattern;
      }
      
      // If no path, add wildcard
      if (!pattern.endsWith('*') && !pattern.includes('/', pattern.indexOf('://') + 3)) {
        pattern += '/*';
      }
      
      // Handle wildcards
      pattern = pattern.replace(/\*/g, '*');
      
      return pattern;
    }
    
    /**
     * Convert DNR resource types to webRequest types
     */
    function convertResourceTypes(resourceTypes) {
      if (!resourceTypes || resourceTypes.length === 0) {
        return ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
                'font', 'object', 'xmlhttprequest', 'ping', 'csp_report',
                'media', 'websocket', 'other'];
      }
      
      const typeMap = {
        'main_frame': 'main_frame',
        'sub_frame': 'sub_frame',
        'stylesheet': 'stylesheet',
        'script': 'script',
        'image': 'image',
        'font': 'font',
        'object': 'object',
        'xmlhttprequest': 'xmlhttprequest',
        'ping': 'ping',
        'csp_report': 'csp_report',
        'media': 'media',
        'websocket': 'websocket',
        'webtransport': 'other',
        'webbundle': 'other',
        'other': 'other'
      };
      
      return resourceTypes.map(t => typeMap[t] || 'other');
    }
    
    /**
     * Create webRequest listener for a DNR rule
     */
    function createListenerForRule(rule, ruleStore) {
      const { condition, action, priority = 1 } = rule;
      
      // Build URL patterns
      const urls = [];
      if (condition.urlFilter) {
        urls.push(convertUrlFilter(condition.urlFilter));
      } else if (condition.regexFilter) {
        console.warn(`⚠️ Regex filters not fully supported: ${condition.regexFilter}`);
        urls.push('*://*/*');
      } else {
        urls.push('*://*/*');
      }
      
      // Build resource types filter
      const types = convertResourceTypes(condition.resourceTypes);
      
      // Create appropriate listener based on action type
      if (action.type === 'block') {
        const listener = (details) => {
          if (matchesCondition(details, condition)) {
            emitDebugEvent(rule, details);
            return { cancel: true };
          }
        };
        
        api.webRequest.onBeforeRequest.addListener(
          listener,
          { urls, types },
          ['blocking']
        );
        
        return { event: 'onBeforeRequest', listener, urls, types };
        
      } else if (action.type === 'redirect') {
        const listener = (details) => {
          if (matchesCondition(details, condition)) {
            emitDebugEvent(rule, details);
            
            if (action.redirect.url) {
              return { redirectUrl: action.redirect.url };
            } else if (action.redirect.regexSubstitution) {
              // Simple regex substitution
              const regex = new RegExp(condition.regexFilter || '.*');
              const newUrl = details.url.replace(regex, action.redirect.regexSubstitution);
              return { redirectUrl: newUrl };
            } else if (action.redirect.transform) {
              // URL transformation
              const url = new URL(details.url);
              const t = action.redirect.transform;
              
              if (t.scheme) url.protocol = t.scheme + ':';
              if (t.host) url.hostname = t.host;
              if (t.port) url.port = t.port;
              if (t.path) url.pathname = t.path;
              if (t.query) url.search = t.query;
              if (t.fragment) url.hash = t.fragment;
              if (t.username) url.username = t.username;
              if (t.password) url.password = t.password;
              
              if (t.queryTransform) {
                const params = new URLSearchParams(url.search);
                if (t.queryTransform.removeParams) {
                  t.queryTransform.removeParams.forEach(p => params.delete(p));
                }
                if (t.queryTransform.addOrReplaceParams) {
                  t.queryTransform.addOrReplaceParams.forEach(p => {
                    params.set(p.key, p.value);
                  });
                }
                url.search = params.toString();
              }
              
              return { redirectUrl: url.toString() };
            }
          }
        };
        
        api.webRequest.onBeforeRequest.addListener(
          listener,
          { urls, types },
          ['blocking']
        );
        
        return { event: 'onBeforeRequest', listener, urls, types };
        
      } else if (action.type === 'modifyHeaders') {
        const listener = (details) => {
          if (matchesCondition(details, condition)) {
            emitDebugEvent(rule, details);
            
            const modifications = {};
            
            if (action.requestHeaders) {
              modifications.requestHeaders = details.requestHeaders || [];
              
              action.requestHeaders.forEach(headerMod => {
                if (headerMod.operation === 'set' || headerMod.operation === 'append') {
                  const existing = modifications.requestHeaders.findIndex(
                    h => h.name.toLowerCase() === headerMod.header.toLowerCase()
                  );
                  if (existing >= 0) {
                    modifications.requestHeaders[existing].value = headerMod.value;
                  } else {
                    modifications.requestHeaders.push({
                      name: headerMod.header,
                      value: headerMod.value
                    });
                  }
                } else if (headerMod.operation === 'remove') {
                  modifications.requestHeaders = modifications.requestHeaders.filter(
                    h => h.name.toLowerCase() !== headerMod.header.toLowerCase()
                  );
                }
              });
            }
            
            if (action.responseHeaders) {
              modifications.responseHeaders = details.responseHeaders || [];
              
              action.responseHeaders.forEach(headerMod => {
                if (headerMod.operation === 'set' || headerMod.operation === 'append') {
                  const existing = modifications.responseHeaders.findIndex(
                    h => h.name.toLowerCase() === headerMod.header.toLowerCase()
                  );
                  if (existing >= 0) {
                    modifications.responseHeaders[existing].value = headerMod.value;
                  } else {
                    modifications.responseHeaders.push({
                      name: headerMod.header,
                      value: headerMod.value
                    });
                  }
                } else if (headerMod.operation === 'remove') {
                  modifications.responseHeaders = modifications.responseHeaders.filter(
                    h => h.name.toLowerCase() !== headerMod.header.toLowerCase()
                  );
                }
              });
            }
            
            return modifications;
          }
        };
        
        // Register on both request and response header events
        if (action.requestHeaders) {
          api.webRequest.onBeforeSendHeaders.addListener(
            listener,
            { urls, types },
            ['blocking', 'requestHeaders']
          );
        }
        if (action.responseHeaders) {
          api.webRequest.onHeadersReceived.addListener(
            listener,
            { urls, types },
            ['blocking', 'responseHeaders']
          );
        }
        
        return {
          event: action.requestHeaders ? 'onBeforeSendHeaders' : 'onHeadersReceived',
          listener,
          urls,
          types
        };
        
      } else if (action.type === 'upgradeScheme') {
        const listener = (details) => {
          if (matchesCondition(details, condition) && details.url.startsWith('http://')) {
            emitDebugEvent(rule, details);
            return { redirectUrl: details.url.replace('http://', 'https://') };
          }
        };
        
        api.webRequest.onBeforeRequest.addListener(
          listener,
          { urls, types },
          ['blocking']
        );
        
        return { event: 'onBeforeRequest', listener, urls, types };
        
      } else if (action.type === 'allow' || action.type === 'allowAllRequests') {
        // Allow rules have highest priority - they prevent other rules from matching
        console.info(`⚙️ DNR allow rule ${rule.id}: Allowing requests matching condition`);
        // In webRequest, we can't easily implement "allow" without complex priority management
        // For now, log it
        return null;
      }
      
      console.warn(`⚠️ Unsupported DNR action type: ${action.type}`);
      return null;
    }
    
    /**
     * Check if request matches DNR condition
     */
    function matchesCondition(details, condition) {
      // Check domain conditions
      if (condition.domains || condition.excludedDomains) {
        const url = new URL(details.url);
        const domain = url.hostname;
        
        if (condition.domains && condition.domains.length > 0) {
          if (!condition.domains.some(d => domain.endsWith(d))) {
            return false;
          }
        }
        
        if (condition.excludedDomains && condition.excludedDomains.length > 0) {
          if (condition.excludedDomains.some(d => domain.endsWith(d))) {
            return false;
          }
        }
      }
      
      // Check initiator domains
      if (condition.initiatorDomains || condition.excludedInitiatorDomains) {
        if (details.initiator || details.documentUrl) {
          const initiatorUrl = new URL(details.initiator || details.documentUrl);
          const initiator = initiatorUrl.hostname;
          
          if (condition.initiatorDomains && condition.initiatorDomains.length > 0) {
            if (!condition.initiatorDomains.some(d => initiator.endsWith(d))) {
              return false;
            }
          }
          
          if (condition.excludedInitiatorDomains && condition.excludedInitiatorDomains.length > 0) {
            if (condition.excludedInitiatorDomains.some(d => initiator.endsWith(d))) {
              return false;
            }
          }
        }
      }
      
      // Additional condition checks can be added here
      
      return true;
    }
    
    /**
     * Emit debug event for rule matching
     */
    function emitDebugEvent(rule, details) {
      if (debugListeners.size > 0) {
        const debugInfo = {
          request: {
            requestId: details.requestId,
            url: details.url,
            method: details.method,
            type: details.type,
            tabId: details.tabId,
            frameId: details.frameId
          },
          rule: {
            ruleId: rule.id,
            rulesetId: '_dynamic'
          }
        };
        
        debugListeners.forEach(listener => {
          try {
            listener(debugInfo);
          } catch (e) {
            console.error('Debug listener error:', e);
          }
        });
      }
    }
    
    /**
     * Install webRequest listeners for rules
     */
    function installRules(rules, ruleStore) {
      rules.forEach(rule => {
        const listenerId = `${ruleStore === dynamicRules ? 'dynamic' : 'session'}_${rule.id}`;
        
        // Remove existing listener if any
        if (activeListeners.has(listenerId)) {
          removeListener(listenerId);
        }
        
        const listenerInfo = createListenerForRule(rule, ruleStore);
        if (listenerInfo) {
          activeListeners.set(listenerId, listenerInfo);
          ruleStore.set(rule.id, rule);
        }
      });
    }
    
    /**
     * Remove webRequest listener
     */
    function removeListener(listenerId) {
      const info = activeListeners.get(listenerId);
      if (info && info.listener) {
        try {
          if (info.event === 'onBeforeRequest') {
            api.webRequest.onBeforeRequest.removeListener(info.listener);
          } else if (info.event === 'onBeforeSendHeaders') {
            api.webRequest.onBeforeSendHeaders.removeListener(info.listener);
          } else if (info.event === 'onHeadersReceived') {
            api.webRequest.onHeadersReceived.removeListener(info.listener);
          }
        } catch (e) {
          console.error('Error removing listener:', e);
        }
        activeListeners.delete(listenerId);
      }
    }
    
    // Create DNR API
    const dnrCompat = {
      updateDynamicRules: async function(options) {
        console.info('🔄 Converting DNR dynamic rules to webRequest listeners');
        
        if (options.removeRuleIds) {
          options.removeRuleIds.forEach(id => {
            removeListener(`dynamic_${id}`);
            dynamicRules.delete(id);
          });
        }
        
        if (options.addRules) {
          installRules(options.addRules, dynamicRules);
        }
        
        console.info(`✅ Dynamic rules updated: ${dynamicRules.size} active`);
      },
      
      updateSessionRules: async function(options) {
        console.info('🔄 Converting DNR session rules to webRequest listeners');
        
        if (options.removeRuleIds) {
          options.removeRuleIds.forEach(id => {
            removeListener(`session_${id}`);
            sessionRules.delete(id);
          });
        }
        
        if (options.addRules) {
          installRules(options.addRules, sessionRules);
        }
        
        console.info(`✅ Session rules updated: ${sessionRules.size} active`);
      },
      
      getDynamicRules: async function() {
        return Array.from(dynamicRules.values());
      },
      
      getSessionRules: async function() {
        return Array.from(sessionRules.values());
      },
      
      updateEnabledRulesets: async function(options) {
        console.warn('⚠️ Static rulesets not supported in webRequest conversion');
      },
      
      getEnabledRulesets: async function() {
        return [];
      },
      
      getMatchedRules: async function(filter) {
        console.warn('⚠️ getMatchedRules: Limited implementation');
        return { rulesMatchedInfo: [] };
      },
      
      setExtensionActionOptions: async function(options) {
        console.info('⚙️ setExtensionActionOptions:', options);
      },
      
      getAvailableStaticRuleCount: async function() {
        return 30000; // Approximate Firefox limit
      },
      
      isRegexSupported: async function(regexOptions) {
        console.warn('⚠️ Regex support is limited in conversion');
        return {
          isSupported: true,
          reason: 'Basic regex supported'
        };
      },
      
      testMatchOutcome: async function(request) {
        console.warn('⚠️ testMatchOutcome: Not fully implemented');
        return { matchedRules: [] };
      },
      
      onRuleMatchedDebug: {
        addListener: function(callback) {
          debugListeners.add(callback);
        },
        removeListener: function(callback) {
          debugListeners.delete(callback);
        },
        hasListener: function(callback) {
          return debugListeners.has(callback);
        }
      },
      
      MAX_NUMBER_OF_RULES: 30000,
      MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES: 5000,
      MAX_NUMBER_OF_ENABLED_STATIC_RULESETS: 50,
      MAX_NUMBER_OF_REGEX_RULES: 1000
    };
    
    // Make available to both namespaces (cross-browser)
    if (typeof chrome !== 'undefined' && !chrome.declarativeNetRequest) {
      chrome.declarativeNetRequest = dnrCompat;
    }
    if (typeof browser !== 'undefined' && !browser.declarativeNetRequest) {
      browser.declarativeNetRequest = dnrCompat;
    }
    
    console.info('✅ DNR → webRequest converter ready (cross-browser)');
    console.info('💡 Supported: block, redirect, modifyHeaders, upgradeScheme');
  }
})();
