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
        chrome.storage.local.set({ 'trimless-daily-usage': dailyUsage }).catch(() => { });
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

// Shadow DOM Helper
function createShadowPrompt(id, title, message, showMonthly = true) {
    const hostId = `trimless-shadow-${id}`;
    if (document.getElementById(hostId)) return;

    const host = document.createElement('div');
    host.id = hostId;
    host.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        :host { all: initial; }
        .modal {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            width: 320px;
            box-sizing: border-box;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .text { font-size: 14px; line-height: 1.5; opacity: 0.95; margin-bottom: 20px; }
        .actions { display: flex; gap: 10px; margin-bottom: 12px; }
        .btn {
            flex: 1;
            border: none;
            padding: 10px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
            transition: transform 0.1s;
        }
        .btn:active { transform: scale(0.98); }
        .btn-primary { background: white; color: #667eea; }
        .btn-outline { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); }
        .close {
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.7);
            width: 100%;
            padding: 8px;
            font-size: 12px;
            cursor: pointer;
        }
        .close:hover { color: white; }
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'modal';
    container.innerHTML = `
        <div class="title">${title}</div>
        <div class="text">${message}</div>
        <div class="actions">
            ${showMonthly ? '<button class="btn btn-primary" id="btn-monthly">$1.99/month</button>' : ''}
            <button class="btn ${showMonthly ? 'btn-outline' : 'btn-primary'}" id="btn-lifetime">
                ${showMonthly ? '$4.99 Lifetime' : 'Upgrade to Premium'}
            </button>
        </div>
        <button class="close" id="btn-close">Maybe Later</button>
    `;
    shadow.appendChild(container);

    // Event Listeners
    const btnMonthly = shadow.getElementById('btn-monthly');
    if (btnMonthly) {
        btnMonthly.onclick = () => {
            chrome.runtime.sendMessage({ type: 'extpay-open-plan', plan: 'monthly' }).catch(() => { });
            host.remove();
        };
    }

    shadow.getElementById('btn-lifetime').onclick = () => {
        chrome.runtime.sendMessage({ type: 'extpay-open-plan', plan: 'lifetime' }).catch(() => { });
        host.remove();
    };

    shadow.getElementById('btn-close').onclick = () => {
        host.remove();
    };

    // Auto-remove after 30s
    setTimeout(() => {
        if (host.isConnected) {
            container.style.opacity = '0';
            container.style.transform = 'translateX(120%)';
            container.style.transition = 'all 0.3s ease-in';
            setTimeout(() => host.remove(), 300);
        }
    }, 30000);
}

// Show upgrade prompt when limit is reached
function showUpgradePrompt() {
    createShadowPrompt(
        'limit-reached',
        'Daily Limit Reached',
        "You've untrimmed 5 emails today. Upgrade to Premium for unlimited access!"
    );
}

// Check and show trial reminder
async function checkTrialReminder() {
    if (!trialStartedAt || isPaid) return;

    const now = new Date();
    const sixDays = 1000 * 60 * 60 * 24 * 6;
    const elapsed = now - trialStartedAt;

    // Show only if 6+ days have passed AND trial is not yet expired (7 days)
    if (elapsed > sixDays && elapsed < (sixDays + (1000 * 60 * 60 * 24 * 2))) { // Allow a 2-day window
        const local = await chrome.storage.local.get('trimless-reminder-shown');
        const today = new Date().toDateString();

        if (local['trimless-reminder-shown'] !== today) {
            createShadowPrompt(
                'trial-reminder',
                'Trial Ending Soon',
                "Your 7-day free trial is ending soon. Upgrade now to keep using Trimless without limits!",
                false // Hide monthly button to simplify, or keep it. Let's keep it simple as requested "CTA to go Premium"
            );
            await chrome.storage.local.set({ 'trimless-reminder-shown': today });
        }
    }
}

const untrimTimer = new (function () {
    this.again = 0;
    this.isTicking = false;

    this.more = function () {
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

    this.stuff = function () {
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

    const ad = function (what) {
        const tmpad = $(this);
        if (!tmpad.text().trim().length) {
            tmpad.hide().removeClass(what).addClass('trimless-' + what);
        }
    };

    // "View entire message"
    $(".iX > a").each(function () {
        const tmpvem = $(this);
        $.get(this.href, function (data) {
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
    $('.adL').each(function () { ad.apply(this, ['adL']); });
    $('.adM').each(function () { ad.apply(this, ['adM']); });

    if (untrimReplies) {
        // Otherwise the main textarea steals the focus
        $('.ajR[style="user-select: none;"]').on('click', function (e) {
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
    const ad = function (what) {
        const tmpad = $(this);
        if (!tmpad.text().trim().length) {
            tmpad.removeClass('trimless-' + what).addClass(what).show();
        }
    }

    $('.trimless-adM').each(function () { ad.apply(this, ['adM']); });
    $('.trimless-adL').each(function () { ad.apply(this, ['adL']); });
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
$(window).on('load', () => {
    untrimTimer.more();
    checkTrialReminder();
});
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
        chrome.runtime.sendMessage(isEnabled).catch(() => { });
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
