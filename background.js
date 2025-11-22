// Load configuration
importScripts('config.js');

// Validate configuration
if (!CONFIG || !CONFIG.EXTPAY_ID || CONFIG.EXTPAY_ID === 'your-extension-id') {
    console.error('❌ Trimless: Invalid config.js - ExtPay ID not configured properly');
    console.error('Please create config.js with a valid EXTPAY_ID from https://extensionpay.com');
    // Extension will not function without valid config
    throw new Error('Invalid configuration - ExtPay ID required');
}

// Load ExtPay library
importScripts('vendor/ExtPay.js');

// Initialize ExtPay with validated config
const extpay = ExtPay(CONFIG.EXTPAY_ID);
extpay.startBackground();

// Listen for payment events
extpay.onPaid.addListener(async (user) => {
    console.log('User paid!', user);
    await chrome.storage.local.set({ 'trimless-paid': true });
    // Notify all Gmail tabs to update their state
    const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/mail/*' });
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'payment-updated' }).catch(() => { });
    });
});

// Listen for trial start events
extpay.onTrialStarted.addListener(async (user) => {
    console.log('Trial started!', user);
    await chrome.storage.local.set({ 'trimless-trial-started': user.trialStartedAt.toISOString() });
    // Notify all Gmail tabs to update their state
    const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/mail/*' });
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'trial-started' }).catch(() => { });
    });
});

chrome.runtime.onInstalled.addListener(async details => {
    if (details.reason !== 'install') return;

    const local = await chrome.storage.local.get(null);
    if (!local.hasOwnProperty('trimless-enabled')) {
        await chrome.storage.local.set({ 'trimless-enabled': true });
    }

    // Initialize payment state
    if (!local.hasOwnProperty('trimless-paid')) {
        await chrome.storage.local.set({ 'trimless-paid': false });
    }
    if (!local.hasOwnProperty('trimless-trial-started')) {
        await chrome.storage.local.set({ 'trimless-trial-started': null });
    }
    if (!local.hasOwnProperty('trimless-daily-usage')) {
        await chrome.storage.local.set({ 'trimless-daily-usage': { date: null, threads: [], count: 0 } });
    }

    const sync = await chrome.storage.sync.get(null);
    if (!sync.hasOwnProperty('trimless-color-enabled')) {
        await chrome.storage.sync.set({
            'trimless-color-enabled': true,
            'trimless-color-value': '#888888',
            'trimless-color-border': '#a8a8a8', // 27-lighten of above
            'trimless-indentation-enabled': true,
            'trimless-indentation-value': 32,
            'trimless-reply-enabled': false
        });
    }

    // On first install, show trial page after a short delay
    setTimeout(() => {
        extpay.openTrialPage('7-day');
    }, 1000);
});

function updateIcon(tabId, isEnabled) {
    chrome.action.setIcon({
        tabId: tabId,
        path: {
            '19': `images/icon-action${isEnabled ? '' : '-gray'}-19.png`,
            '38': `images/icon-action${isEnabled ? '' : '-gray'}-38.png`
        }
    });
    chrome.action.setTitle({
        tabId: tabId,
        title: isEnabled ? 'Trimless is enabled' : 'Trimless is disabled'
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, true).then(data => {
            if (data?.trimless) {
                chrome.storage.local.get(null).then(items => {
                    updateIcon(tabId, items['trimless-enabled']);
                });
            }
        }).catch(() => {
            // Ignore errors when content script is not ready
        });
    }
});

chrome.action.onClicked.addListener((tab) => {
    chrome.storage.local.get(null).then(items => {
        const newState = !items['trimless-enabled'];
        void chrome.storage.local.set({ 'trimless-enabled': newState });
        updateIcon(tab.id, newState);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle enable/disable messages from content script
    if (typeof message === 'boolean') {
        updateIcon(sender.tab.id, message);
        setTimeout(() => updateIcon(sender.tab.id, message), 100);
        setTimeout(() => updateIcon(sender.tab.id, message), 200);
        return;
    }

    // Handle ExtPay requests
    if (message === 'extpay-get-user') {
        extpay.getUser().then(user => {
            sendResponse(user);
        }).catch(err => {
            console.error('Error fetching user:', err);
            sendResponse(null);
        });
        return true; // Indicates async response
    }

    if (message === 'extpay-open-payment') {
        extpay.openPaymentPage();
        return;
    }

    if (message === 'extpay-open-trial') {
        extpay.openTrialPage('7-day');
        return;
    }

    if (message && message.type === 'extpay-open-plan') {
        extpay.openPaymentPage(message.plan);
        return;
    }
});

// Sync payment state from ExtPay on startup and periodically
async function syncPaymentState() {
    try {
        const user = await extpay.getUser();
        await chrome.storage.local.set({
            'trimless-paid': user.paid || false,
            'trimless-trial-started': user.trialStartedAt ? user.trialStartedAt.toISOString() : null
        });
    } catch (err) {
        console.error('Error syncing payment state:', err);
    }
}

// Sync on startup
syncPaymentState();

// Sync every 30 minutes
setInterval(syncPaymentState, 30 * 60 * 1000);
