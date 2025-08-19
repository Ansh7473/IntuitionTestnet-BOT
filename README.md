# 🧠 Intuition Testnet Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Network](https://img.shields.io/badge/Network-Intuition%20Testnet-blue.svg)](https://testnet.hub.intuition.systems/)

An advanced automation bot for **Intuition Testnet** operations including faucet claiming and bridge transactions between Intuition and Base Sepolia networks.

## 🚀 Features

- **💰 Faucet Bot**: Automated testnet token claiming with Vercel challenge bypass
- **🌉 Bridge Bot**: Bidirectional bridge operations (Intuition ↔ Base Sepolia)
- **🔐 Multi-Wallet Support**: Process multiple wallets from private keys file
- **🎯 Smart Transaction Management**: Round-robin wallet usage and customizable delays
- **📊 Real-time Monitoring**: Live transaction tracking with detailed logs
- **⚡ Enhanced Browser Automation**: System Chrome with anti-detection features

## 📋 Prerequisites

- **Node.js** 18+ installed
- **Google Chrome** browser installed
- **Virtual Display** (for headless environments)
- Private keys for testnet wallets

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ansh98998766/intuition.git
   cd intuition
   ```

2. **Install dependencies**
   ```bash
   npm install puppeteer ethers readline fs
   ```

3. **Setup virtual display** (for Linux/headless environments)
   ```bash
   # Install Xvfb if not already installed
   sudo apt-get update
   sudo apt-get install xvfb

   # Start virtual display
   Xvfb :99 -screen 0 1920x1080x24 &
   export DISPLAY=:99
   ```

4. **Create private keys file**
   ```bash
   touch private_keys.txt
   ```

## ⚙️ Configuration

### Private Keys Setup

Add your wallet private keys to `private_keys.txt` (one per line):

```
# Example private_keys.txt
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba
# Add more wallets as needed
```

> ⚠️ **Security Warning**: Never share your private keys or commit them to version control!

### Network Configuration

The bot supports these networks:
- **Intuition Testnet** (Chain ID: 13579)
- **Base Sepolia** (Chain ID: 84532)

## 🎮 Usage

### Starting the Bot

```bash
node intuition.js
```

### Menu Options

```
🎯 OPERATION MENU
─────────────────────────
1. 💰 Run Faucet Bot
2. 🌉 Run Bridge Bot  
3. 🚪 Exit
─────────────────────────
```

## 💰 Faucet Bot Features

The faucet bot automatically:
- ✅ Launches headless Chrome browser
- ✅ Bypasses Vercel protection challenges
- ✅ Claims testnet tokens for all wallets
- ✅ Handles rate limiting (24-hour cooldown)
- ✅ Provides detailed transaction logs

### Example Faucet Output
```
[ 02:15:30 WIB ] | 🚀 Launching browser...
[ 02:15:32 WIB ] | ✅ Browser setup complete
[ 02:15:35 WIB ] | ✅ _vcrcs cookie detected
[ 02:15:36 WIB ] | 💰 Processing wallet 1/3: 0x1234...abcd
[ 02:15:38 WIB ] | ✅ Faucet request successful!
```

## 🌉 Bridge Bot Features

The bridge bot supports:

### Bridge Directions
1. **Intuition → Base Sepolia** (withdrawEth)
2. **Base Sepolia → Intuition** (createRetryableTicket)
3. **Random Direction** (automatically selects)

### Bridge Configuration Options
- **Amount**: Specify ETH amount to bridge (e.g., 0.001)
- **Transactions**: Number of bridge transactions to execute
- **Delay**: Min/max seconds between transactions
- **Direction**: Choose bridge direction or random

### Example Bridge Setup
```
🌉 BRIDGE CONFIGURATION
──────────────────────────────
Select bridge direction:
1. Intuition → Base Sepolia (withdrawEth)
2. Base Sepolia → Intuition (createRetryableTicket)
3. Random direction
Choose direction (1-3): 1
Enter amount to bridge (ETH, e.g., 0.001): 0.0001
Number of bridge transactions: 5
Min delay between transactions (seconds): 3
Max delay between transactions (seconds): 7
```

### Bridge Transaction Flow
```
[ 02:18:42 WIB ] | 🌉 Processing transaction 1/5: 0x1234...abcd
[ 02:18:42 WIB ] | 🔄 Bridging 0.0001 ETH from Intuition → Base Sepolia
[ 02:18:42 WIB ] | 💰 Intuition balance: 0.1919 ETH
[ 02:18:43 WIB ] | ⛽ Estimating gas...
[ 02:18:45 WIB ] | 📋 Transaction Hash: 0x6a49c7b3967c...
[ 02:18:46 WIB ] | ✅ Bridge transaction confirmed! Block: 619199
```

## 🔧 Advanced Configuration

### Contract Addresses
```javascript
BRIDGE_CONFIG = {
    INTUITION_RPC_URL: "https://testnet.rpc.intuition.systems/http",
    BASE_SEPOLIA_RPC_URL: "https://base-sepolia.rpc.dev.caldera.xyz/",
    TTRUST_CONTRACT_ADDRESS: "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210",
    ARB_SYS_ADDRESS: "0x0000000000000000000000000000000000000064",
    INBOX_ADDRESS: "0xBd983e1350263d1BE5DE4AEB8b1704A0Ea0be350"
}
```

### Browser Configuration
- **Headless Mode**: Enabled for server environments
- **Anti-Detection**: Enhanced stealth features
- **Virtual Display**: DISPLAY=:99 for headless operation
- **System Chrome**: Uses `/usr/bin/google-chrome`

## 📊 Transaction Management

### Multi-Wallet Support
- Processes wallets in round-robin fashion
- Supports unlimited transactions per session
- Automatic wallet cycling for multiple transactions

### Error Handling
- **Rate Limiting**: Handles 24-hour faucet cooldowns
- **Gas Estimation**: Automatic with fallback values
- **Transaction Retries**: Built-in retry logic
- **Balance Checking**: Pre-transaction validation

## 🛡️ Security Features

- **Private Key Protection**: Local file storage only
- **Anti-Detection**: Advanced browser fingerprint masking
- **Session Management**: Automatic cookie handling
- **Error Logging**: Detailed failure analysis

## 🌐 Network Details

### Intuition Testnet
- **Chain ID**: 13579
- **Token**: tTRUST (TRUST)
- **RPC**: https://testnet.rpc.intuition.systems/http
- **Explorer**: https://testnet.explorer.intuition.systems/
- **Faucet**: https://testnet.hub.intuition.systems/

### Base Sepolia
- **Chain ID**: 84532
- **Token**: tTRUST
- **RPC**: https://base-sepolia.rpc.dev.caldera.xyz/
- **Explorer**: https://sepolia.basescan.org/

## 🐛 Troubleshooting

### Common Issues

1. **Browser Launch Failed**
   ```bash
   # Ensure virtual display is running
   Xvfb :99 -screen 0 1920x1080x24 &
   export DISPLAY=:99
   ```

2. **Transaction Failures**
   - Check wallet balances
   - Increase delay between transactions
   - Verify network connectivity

3. **Gas Estimation Errors**
   - Bot uses fallback gas limits
   - Ensure sufficient ETH for gas fees

4. **Rate Limiting**
   - Faucet has 24-hour cooldown
   - Bridge has no rate limits

## 📈 Performance Tips

- **Optimal Delays**: Use 5-10 seconds between bridge transactions
- **Batch Size**: Process 10-20 transactions per session
- **Network Timing**: Avoid peak hours for better success rates
- **Wallet Management**: Use dedicated testnet wallets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for **testnet use only**. Never use with mainnet private keys or real funds. The developers are not responsible for any loss of funds or misuse of this software.

## 🔗 Links

- **Intuition Website**: https://intuition.systems/
- **Testnet Hub**: https://testnet.hub.intuition.systems/
- **Bridge Portal**: https://testnet.bridge.intuition.systems/
- **Documentation**: https://docs.intuition.systems/

## 📞 Support

- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Updates**: Watch the repository for updates

---

**Made with ❤️ for the Intuition Testnet Community**

> 🚀 **Star this repo** if you find it helpful!
