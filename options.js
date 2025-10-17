var tmpItems = null;

function save() {
  chrome.storage.sync.set(tmpItems, () => {
    $('#status').text('Saved!');
    setTimeout(() => $('#status').text(''), 2000);
  });
}

function updateColorValue() {
  $('#color-value').text(tmpItems['trimless-color-value']);
  $('#color-value').css('color', tmpItems['trimless-color-value']);
}

function handleColorChange(color) {
  tmpItems['trimless-color-value'] =
    color.toHexString().toUpperCase();
  tmpItems['trimless-color-border'] =
    color.lighten(27).toHexString().toUpperCase();
  updateColorValue();
}

function handleIntentationChange(e) {
  tmpItems['trimless-indentation-value'] = e.target.value;
  $('#indentation-value').text(tmpItems['trimless-indentation-value']);
}

// Update premium status display
async function updatePremiumStatus() {
  try {
    const localData = await chrome.storage.local.get(['trimless-paid', 'trimless-trial-started', 'trimless-daily-usage']);

    const isPaid = localData['trimless-paid'] || false;
    const trialStartedAt = localData['trimless-trial-started'] ? new Date(localData['trimless-trial-started']) : null;
    const dailyUsage = localData['trimless-daily-usage'] || { date: null, threads: [], count: 0 };

    // Hide all status sections first
    $('#status-paid, #status-trial, #status-free').hide();

    if (isPaid) {
      // User is paid
      $('#status-paid').show();
    } else if (trialStartedAt) {
      // Check if trial is still active
      const now = new Date();
      const sevenDays = 1000 * 60 * 60 * 24 * 7;
      const elapsed = now - trialStartedAt;

      if (elapsed < sevenDays) {
        // Trial is active
        const daysRemaining = Math.max(0, Math.ceil((sevenDays - elapsed) / (1000 * 60 * 60 * 24)));
        $('#trial-days-remaining').text(daysRemaining);
        $('#status-trial').show();
      } else {
        // Trial expired, show free status
        showFreeStatus(dailyUsage);
      }
    } else {
      // No trial started, show free status
      showFreeStatus(dailyUsage);
    }
  } catch (err) {
    console.error('Error updating premium status:', err);
    $('#status-free').show();
  }
}

function showFreeStatus(dailyUsage) {
  const today = new Date().toDateString();
  const count = (dailyUsage.date === today) ? dailyUsage.count : 0;
  $('#daily-usage-count').text(count);
  $('#status-free').show();
}

function initialize() {
  // Initialize color settings
  $('#color-enabled').on('change', function() {
    tmpItems['trimless-color-enabled'] = this.checked;
  });
  $('#color-enabled').prop('checked', tmpItems['trimless-color-enabled']);

  updateColorValue();

  $('#color-input').spectrum({
    color: tmpItems['trimless-color-value'],
    flat: true,
    showButtons: false,
    showInput: true,
    preferredFormat: 'hex',
    change: handleColorChange,
    move: handleColorChange
  });

  // Initialize indentation settings
  $('#indentation-enabled').on('change', function() {
    tmpItems['trimless-indentation-enabled'] = this.checked;
  });
  $('#indentation-enabled').prop(
    'checked', tmpItems['trimless-indentation-enabled']
  );

  $('#indentation-input').on('change', handleIntentationChange);
  $('#indentation-input').on('input change', handleIntentationChange);
  $('#indentation-input').val(tmpItems['trimless-indentation-value']);
  $('#indentation-input').trigger('change');

  // Initialize reply settings
  $('#reply-enabled').on('change', function() {
    tmpItems['trimless-reply-enabled'] = this.checked;
  });
  $('#reply-enabled').prop('checked', tmpItems['trimless-reply-enabled']);

  // Save button
  $('#save').on('click', save);

  // Reset button
  $('#reset').on('click', function() {
    $('#color-enabled').prop('checked', true);
    $('#color-enabled').trigger('change');
    $('#color-input').spectrum('set', '#888888');
    handleColorChange($('#color-input').spectrum('get'));

    $('#indentation-enabled').prop('checked', true);
    $('#indentation-enabled').trigger('change');
    $('#indentation-input').val(32);
    $('#indentation-input').trigger('change');

    $('#reply-enabled').prop('checked', false);
    $('#reply-enabled').trigger('change');
  });

  // Premium section button handlers
  $('#start-trial-btn').on('click', () => {
    chrome.runtime.sendMessage('extpay-open-trial');
  });

  $('#upgrade-btn, #upgrade-from-trial').on('click', () => {
    chrome.runtime.sendMessage('extpay-open-payment');
  });

  // Update premium status
  updatePremiumStatus();

  // Refresh premium status every 10 seconds
  setInterval(updatePremiumStatus, 10000);
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    chrome.storage.sync.get(null, function(items) {
      tmpItems = items;
      initialize();
    });
  }
);

// Listen for storage changes to update premium status in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes['trimless-paid'] || changes['trimless-trial-started'] || changes['trimless-daily-usage']) {
      updatePremiumStatus();
    }
  }
});
