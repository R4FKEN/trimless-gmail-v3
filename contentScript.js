let isEnabled;
let isPaid = false;
let trialStartedAt = null;
let dailyUsage = { date: null, threads: [], count: 0 };

// Load initial state
chrome.storage.local.get(null).then(items => {
    isEnabled = items['trimless-enabled'];
    isPaid = items['trimless-paid'] || false;
    trialStartedAt = items['trimless-trial-started'] ? new Date(items['trimless-trial-started']) : null;
    dailyUsage = items['trimless-daily-usage'] || { date: null, threads: [], count: 0 };
}).catch(err => {
    console.error('Trimless: Failed to load initial state (extension may have been reloaded):', err);
});

// Check if user has premium access (paid or in active trial)
function hasPremiumAccess() {
    if (isPaid) return true;

    if (trialStartedAt) {
        const now = new Date();
        const sevenDays = 1000 * 60 * 60 * 24 * 7; // 7 days in milliseconds
        return (now - trialStartedAt) < sevenDays;
    }

    return false;
}

// Get days remaining in trial
function getDaysRemainingInTrial() {
    if (!trialStartedAt) return 0;
    const now = new Date();
    const sevenDays = 1000 * 60 * 60 * 24 * 7;
    const elapsed = now - trialStartedAt;
    const remaining = sevenDays - elapsed;
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
}

// Extract thread ID from Gmail URL
function getCurrentThreadId() {
    const hash = window.location.hash;
    const match = hash.match(/\/([a-f0-9]+)$/);
    return match ? match[1] : null;
}

// Check if daily limit is reached
function isDailyLimitReached() {
    if (hasPremiumAccess()) return false;

    const today = new Date().toDateString();

    // Reset counter if it's a new day
    if (dailyUsage.date !== today) {
        dailyUsage = { date: today, threads: [], count: 0 };
        chrome.storage.local.set({ 'trimless-daily-usage': dailyUsage }).catch(() => {});
        return false;
    }

    return dailyUsage.count >= 5;
}

// Track email untrim
async function trackEmailUntrim() {
    if (hasPremiumAccess()) return true;

    const threadId = getCurrentThreadId();
    if (!threadId) return true; // Allow if we can't detect thread ID

    const today = new Date().toDateString();

    // Reset counter if it's a new day
    if (dailyUsage.date !== today) {
        dailyUsage = { date: today, threads: [], count: 0 };
    }

    // Check if we've already counted this thread today
    if (dailyUsage.threads.includes(threadId)) {
        return true; // Already counted, allow untrim
    }

    // Check if limit reached
    if (dailyUsage.count >= 5) {
        showUpgradePrompt();
        return false;
    }

    // Track this thread
    dailyUsage.threads.push(threadId);
    dailyUsage.count++;
    dailyUsage.date = today;

    try {
        await chrome.storage.local.set({ 'trimless-daily-usage': dailyUsage });
    } catch (err) {
        console.error('Trimless: Failed to save usage data (extension may have been reloaded):', err);
    }

    return true;
}

// Show upgrade prompt when limit is reached
function showUpgradePrompt() {
    // Remove existing prompt if any
    $('#trimless-upgrade-prompt').remove();

    const prompt = $(`
        <div id="trimless-upgrade-prompt" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">
                Daily Limit Reached
            </div>
            <div style="font-size: 14px; margin-bottom: 15px; opacity: 0.95;">
                You've untrimmed 5 emails today. Upgrade to Premium for unlimited access!
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button id="trimless-upgrade-monthly" style="
                    flex: 1;
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 10px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 13px;
                ">
                    $1.99/month
                </button>
                <button id="trimless-upgrade-lifetime" style="
                    flex: 1;
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 2px solid white;
                    padding: 10px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 13px;
                ">
                    $4.99 Lifetime
                </button>
            </div>
            <button id="trimless-close-prompt" style="
                width: 100%;
                background: transparent;
                color: white;
                border: 1px solid rgba(255,255,255,0.5);
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                opacity: 0.8;
            ">
                Maybe Later
            </button>
        </div>
    `);

    $('body').append(prompt);

    $('#trimless-upgrade-monthly').on('click', () => {
        chrome.runtime.sendMessage({ type: 'extpay-open-plan', plan: 'monthly' }).catch(() => {});
        prompt.remove();
    });

    $('#trimless-upgrade-lifetime').on('click', () => {
        chrome.runtime.sendMessage({ type: 'extpay-open-plan', plan: 'lifetime' }).catch(() => {});
        prompt.remove();
    });

    $('#trimless-close-prompt').on('click', () => {
        prompt.remove();
    });

    // Auto-remove after 30 seconds
    setTimeout(() => prompt.fadeOut(500, () => prompt.remove()), 30000);
}

const untrimTimer = new (function() {
    this.again = 0;
    this.isTicking = false;

    this.more = function() {
        if (!isEnabled) {
            ununtrim();
            return;
        }
        if (untrimTimer.again < 4) {
            ++untrimTimer.again;
        }
        if (!untrimTimer.isTicking) {
            untrimTimer.again = 2;
            untrimTimer.isTicking = true;
            untrimTimer.stuff();
        }
    }

    this.stuff = function() {
        if (!isEnabled) {
            ununtrim();
            untrimTimer.again = 0;
            untrimTimer.isTicking = false;
            return;
        }
        if (untrimTimer.again) {
            --untrimTimer.again;
            setTimeout(() => untrimTimer.stuff(), 1000);
        }
        else {
            untrimTimer.isTicking = false;
        }
        untrim();
    }
})();

let untrimReplies = false;

async function applyOptions() {
    const options = await chrome.storage.sync.get(null);
    applyOptionsInterface(options);
    untrimReplies = options['trimless-reply-enabled'];
    untrimTimer.more();
}

async function untrim() {
    // Check if user can untrim emails
    const canUntrim = await trackEmailUntrim();
    if (!canUntrim) {
        return; // Limit reached, prompt already shown
    }

    const ad = function(what) {
        const tmpad = $(this);
        if (!tmpad.text().trim().length) {
            tmpad.hide().removeClass(what).addClass('trimless-' + what);
        }
    };

    // "View entire message"
    $(".iX > a").each(function() {
        const tmpvem = $(this);
        $.get(this.href, function(data) {
            tmpvem.parents().eq(1).html($('font[size=-1]', data).last().html());
        });
    });

    await applyOptions();
    $('.adP').removeClass('adP').addClass('trimless-adP');
    $('.adO').removeClass('adO').addClass('trimless-adO');
    $('.adL > .im, .adL.im').add(
        $('.h5').removeClass('h5').addClass('im').addClass('trimless-h5')
    ).addClass('trimless-content');
    $('.ajU, .ajV, .adm').hide().addClass('trimless-button');
    $('.adL').each(function() { ad.apply(this, ['adL']); });
    $('.adM').each(function() { ad.apply(this, ['adM']); });

    if (untrimReplies) {
        // Otherwise the main textarea steals the focus
        $('.ajR[style="user-select: none;"]').on('click', function(e) {
            e.stopPropagation();
        });
        // Harder to undo, since this part isn't read-only
        $('.ajR[style="user-select: none;"] > .uC').trigger('click');
    }

    const tmpah1 = $('.et .aH1');
    if (tmpah1.is(':visible')) {
        tmpah1.trigger('click');
        const tmpextra = $('.editable > .gmail_extra');
        if (!tmpextra.prev('br').length) {
            tmpextra.prepend('<br />');
        }
    }
}

function ununtrim() {
    const ad = function(what) {
        const tmpad = $(this);
        if (!tmpad.text().trim().length) {
            tmpad.removeClass('trimless-' + what).addClass(what).show();
        }
    }

    $('.trimless-adM').each(function() { ad.apply(this, ['adM']); });
    $('.trimless-adL').each(function() { ad.apply(this, ['adL']); });
    $('.trimless-button').removeClass('trimless-button').show();
    $('.trimless-content').removeClass('trimless-content');
    $('.trimless-h5').removeClass('trimless-h5')
        .removeClass('im').addClass('h5');
    $('.trimless-adO').removeClass('trimless-adO').addClass('adO');
    $('.trimless-adP').removeClass('trimless-adP').addClass('adP');
}

function untrimOnClick(event) {
    if (isEnabled && !$(event.target).is('.aH1')) {
        untrimTimer.more();
    }
}

function applyOptionsInterface(options) {
    if (!document.getElementById('trimless-style')) {
        $('head').append('<style id="trimless-style"></style>');
    }

    let trimlessStyle = '';

    if (options['trimless-color-enabled']) {
        trimlessStyle +=
            '.trimless-content, .trimless-content * {' +
            'color: ' + options['trimless-color-value'] +
            ' !important;' +
            'border-color: ' + options['trimless-color-border'] +
            ' !important;' +
            '}';
    }

    if (options['trimless-indentation-enabled']) {
        trimlessStyle +=
            '.trimless-content {' +
            'padding-left: ' + options['trimless-indentation-value'] +
            'px !important;' +
            '}';
    }

    $('#trimless-style').html(trimlessStyle);
}

untrimTimer.more();
$(window).on('hashchange', untrimTimer.more);
$(document).on('click', untrimOnClick);
$(window).on('load', untrimTimer.more);
$(applyOptions);

$(document).on('visibilitychange', untrimTimer.more);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle payment/trial updates
    if (message && message.type === 'payment-updated') {
        chrome.storage.local.get(null).then(items => {
            isPaid = items['trimless-paid'] || false;
        });
        return;
    }

    if (message && message.type === 'trial-started') {
        chrome.storage.local.get(null).then(items => {
            trialStartedAt = items['trimless-trial-started'] ? new Date(items['trimless-trial-started']) : null;
        });
        return;
    }

    // Original message handler
    sendResponse({ trimless: true });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
        applyOptions();
        return;
    }

    if (changes['trimless-enabled']) {
        isEnabled = changes['trimless-enabled'].newValue;
        chrome.runtime.sendMessage(isEnabled).catch(() => {});
        if (isEnabled) {
            untrimTimer.more();
        } else {
            ununtrim();
        }
    }

    if (changes['trimless-paid']) {
        isPaid = changes['trimless-paid'].newValue;
    }

    if (changes['trimless-trial-started']) {
        trialStartedAt = changes['trimless-trial-started'].newValue ?
            new Date(changes['trimless-trial-started'].newValue) : null;
    }
});
