// Notifications API compatibility for extended features
// Firefox notifications have different capabilities than Chrome

(function() {
  'use strict';
  
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  if (api && api.notifications && api.notifications.create) {
    const originalCreate = api.notifications.create;
    
    api.notifications.create = async function(notificationId, options) {
      console.info('⚙️ Adapting notification options for Firefox');
      
      const adaptedOptions = { ...options };
      
      // Firefox doesn't support buttons in notifications
      if (adaptedOptions.buttons) {
        console.warn('⚠️ notifications: buttons are not supported in Firefox');
        console.info('💡 Button actions: ' + 
          adaptedOptions.buttons.map(b => b.title).join(', '));
        delete adaptedOptions.buttons;
      }
      
      // Firefox has limited imageUrl support
      if (adaptedOptions.imageUrl) {
        console.warn('⚠️ notifications: imageUrl support is limited in Firefox');
        // Keep it but be aware it might not display
      }
      
      // Firefox doesn't support appIconMaskUrl
      if (adaptedOptions.appIconMaskUrl) {
        console.warn('⚠️ notifications: appIconMaskUrl not supported, using iconUrl instead');
        if (!adaptedOptions.iconUrl) {
          adaptedOptions.iconUrl = adaptedOptions.appIconMaskUrl;
        }
        delete adaptedOptions.appIconMaskUrl;
      }
      
      // Firefox doesn't support progress
      if (adaptedOptions.progress !== undefined) {
        console.warn('⚠️ notifications: progress indicator not supported in Firefox');
        delete adaptedOptions.progress;
      }
      
      // Firefox doesn't support requireInteraction the same way
      if (adaptedOptions.requireInteraction) {
        console.info('⚙️ notifications: requireInteraction support varies in Firefox');
        // Keep it but results may differ
      }
      
      // Firefox doesn't support silent notifications
      if (adaptedOptions.silent) {
        console.warn('⚠️ notifications: silent option not supported in Firefox');
        delete adaptedOptions.silent;
      }
      
      return await originalCreate.call(this, notificationId, adaptedOptions);
    };
    
    console.info('✅ Notifications API compatibility loaded (cross-browser)');
  }
})();
