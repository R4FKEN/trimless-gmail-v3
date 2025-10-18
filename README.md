# Trimless for Gmail V3 - Chrome Extension

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)

**Never miss clipped Gmail messages again!** Automatically expand all truncated Gmail messages instantly.

## 🚀 Features

### Core Features

- ✅ **Automatic Message Expansion** - Expands clipped messages on page load
- ✅ **Dynamic Expansion** - Detects and expands new messages as they appear
- ✅ **Thread Expansion** - Expand all collapsed messages in conversations

### Premium Features (Paid Users)

- 💎 **Custom Color Picker** - Choose your preferred indicator color
- 💎 **Position Controls** - Shift expansion text for perfect alignment
- 💎 **Unlimited Expansions** - No daily quota restrictions

### Trial & Pricing

- 🎁 **7-day unlimited trial** (no credit card required)
- 🆓 **5 free expansions daily** after trial
- 💰 **$4.99 one-time** OR **$1.99/month** for unlimited

## 📦 Installation

### From Chrome Web Store (Recommended)

1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Enjoy automatic message expansion!

## 🎯 Usage

### Automatic Expansion

- Simply open Gmail - clipped messages expand automatically
- Works on page load and as new messages arrive
- No configuration needed!

### Settings & Customization

Click the extension icon to:

- Toggle features on/off
- Customize colors and positioning (Premium only)
- Check trial status and quota usage
- Upgrade to Premium

## ⚙️ Configuration

### Basic Settings (All Users)

- **Enable Extension** - Turn automatic expansion on/off
- **Auto-expand on page load** - Expand messages when Gmail loads
- **Expand entire threads** - Auto-expand collapsed thread messages

### Premium Settings (Paid Users Only)

- **Indicator Color** - Choose custom color for expansion indicators
- **Position Shift** - Adjust indicator text position (0-100px)

## 🔧 Technical Details

### Manifest V3 Compliance

This extension uses Chrome's latest Manifest V3 architecture:

- Service Worker background script (no persistent background pages)
- Content scripts for Gmail integration
- Chrome Storage Sync API for settings

### Permissions

- `storage` - Save settings and statistics
- `host_permissions` - Access to mail.google.com and extensionpay.com

### Privacy & Security

- ✅ **Zero data collection** - No tracking or analytics
- ✅ **Local processing** - Everything runs in your browser
- ✅ **No external servers** - No data leaves your device, except for payment details via ExtPay/Stripe
- ✅ **Open source ready** - Transparent architecture
- ✅ **Secure payments** - ExtensionPay/Stripe integration

## 💰 Payment Integration

This extension uses [ExtensionPay](https://extensionpay.com/) and Stripe for secure payment processing.

### Trial Period

- 7 days unlimited access
- Automatically starts on installation
- No credit card required
- After trial: 5 free expansions per day

## 🐛 Known Issues & Limitations

- Gmail's UI can change, which may require selector updates
- Some heavily formatted emails may not detect clipping correctly
- Expansion detection relies on Gmail's "Message clipped" text

## 🤝 Contributing

Bug reports and feature suggestions are welcome!

1. Send an email describing the bug or feature
2. Include Gmail version and Chrome version
3. Provide steps to reproduce (for bugs)

## 📄 License

MIT License with ExtensionPay integration.

- Personal and commercial use allowed after purchase
- Source code available for transparency

## 🆘 Support

- **Email**: support@trimlessforgmail.com
- **Documentation**: See this README

## 🙏 Acknowledgments

- Built for Gmail users frustrated with clipped messages
- Uses ExtensionPay for secure payment processing
- Manifest V3 compliant for future-proof compatibility

---

**Made with ❤️ for Gmail power users**

Version 1.0.0 | Manifest V3 | Chrome Extension
