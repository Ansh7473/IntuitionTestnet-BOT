const puppeteer = require('puppeteer');
const fs = require('fs');
const ethers = require('ethers');
const readline = require('readline');

// Bridge Configuration 
const BRIDGE_CONFIG = {
    INTUITION_RPC_URL: "https://testnet.rpc.intuition.systems/http",
    INTUITION_EXPLORER: "https://testnet.explorer.intuition.systems/tx/",
    BASE_SEPOLIA_RPC_URL: "https://base-sepolia.rpc.dev.caldera.xyz/",
    BASE_SEPOLIA_EXPLORER: "https://sepolia.basescan.org/tx/",
    TTRUST_CONTRACT_ADDRESS: "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210",
    ARB_SYS_ADDRESS: "0x0000000000000000000000000000000000000064",
    INBOX_ADDRESS: "0xBd983e1350263d1BE5DE4AEB8b1704A0Ea0be350",
    OUTBOX_ADDRESS: "0xBEC1462f12f8a968e07ae3D60C8C32Cd32A23826"
};

// Contract ABIs
const ERC20_ABI = [
    {"type":"function","name":"balanceOf","stateMutability":"view","inputs":[{"name":"address","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
    {"type":"function","name":"allowance","stateMutability":"view","inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
    {"type":"function","name":"approve","stateMutability":"nonpayable","inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]},
    {"type":"function","name":"decimals","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint8"}]}
];

const BRIDGE_ABI = [
    {
        "type": "function",
        "name": "withdrawEth",
        "stateMutability": "payable",
        "inputs": [
            { "internalType": "address","name": "destination","type": "address" }
        ],
        "outputs": [
            { "internalType": "uint256","name": "","type": "uint256" }
        ]
    },
    {
        "type": "function",
        "name": "createRetryableTicket",
        "stateMutability": "nonpayable",
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "l2CallValue", "type": "uint256" },
            { "internalType": "uint256", "name": "maxSubmissionCost", "type": "uint256" },
            { "internalType": "address", "name": "excessFeeRefundAddress", "type": "address" },
            { "internalType": "address", "name": "callValueRefundAddress", "type": "address" },
            { "internalType": "uint256", "name": "gasLimit", "type": "uint256" },
            { "internalType": "uint256", "name": "maxFeePerGas", "type": "uint256" },
            { "internalType": "uint256", "name": "tokenTotalFeeAmount", "type": "uint256" },
            { "internalType": "bytes", "name": "data", "type": "bytes" }
        ],
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ]
    }
];

class IntuitionFaucetBot {
    constructor() {
        this.browser = null;
        this.page = null;
        this.walletData = [];
        this.FAUCET_URL = 'https://testnet.hub.intuition.systems/';
    }

    log(message) {
        const now = new Date();
        const timeStr = now.toLocaleString('en-GB', { 
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        console.log(`[ ${timeStr} WIB ] | ${message}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    displayBanner() {
        console.log('\n' + '═'.repeat(60));
        console.log('    ⚡ INTUITION FAUCET BOT ⚡');
        console.log('    ─────────────────────────────');
        console.log('    🧠 Project    : Intuition Testnet Faucet');
        console.log('    🧑‍💻 Author     : Ansh');
        console.log('    🌐 Network    : Intuition Testnet');
        console.log('    ─────────────────────────────');
        console.log('    🔍 System Chrome → 🔐 Enhanced Vercel Challenge');
        console.log('    💰 Advanced Faucet Operations');
        console.log('═'.repeat(60) + '\n');
    }

    loadWallets() {
        try {
            const content = fs.readFileSync('private_keys.txt', 'utf8');
            const lines = content.split('\n');
            const wallets = [];
            
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.length > 0) {
                    try {
                        const cleanKey = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
                        const wallet = new ethers.Wallet(cleanKey);
                        
                        wallets.push({
                            address: wallet.address,
                            privateKey: trimmed,
                            index: wallets.length + 1
                        });
                        
                        this.log(`✅ Loaded wallet: ${wallet.address}`);
                    } catch (error) {
                        this.log(`❌ Invalid private key on line ${index + 1}: ${error.message}`);
                    }
                }
            });
            
            this.log(`📊 Total valid wallets loaded: ${wallets.length}`);
            return wallets;
        } catch (error) {
            this.log(`❌ Error loading wallets: ${error.message}`);
            return [];
        }
    }

   
       async setupBrowser() {
           try {
               this.log('🚀 Launching browser...');
               
               // Auto-detect Chrome executable path based on OS
               const getChromePath = () => {
                   const os = require('os');
                   const fs = require('fs');
                   const path = require('path');
                   
                   const possiblePaths = {
                       win32: [
                           'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                           'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                           path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
                           path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe')
                       ],
                       darwin: [
                           '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                           '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
                           '/usr/bin/google-chrome',
                           '/usr/bin/chromium'
                       ],
                       linux: [
                           '/usr/bin/google-chrome',
                           '/usr/bin/google-chrome-stable',
                           '/usr/bin/chromium',
                           '/usr/bin/chromium-browser',
                           '/snap/bin/chromium',
                           '/usr/bin/google-chrome-unstable',
                           '/usr/bin/google-chrome-beta',
                           '/opt/google/chrome/chrome'
                       ]
                   };
                   
                   const platform = os.platform();
                   const paths = possiblePaths[platform] || possiblePaths.linux;
                   
                   // Try to find existing Chrome installation
                   for (const chromePath of paths) {
                       try {
                           if (fs.existsSync(chromePath)) {
                               this.log(`✅ Found Chrome at: ${chromePath}`);
                               return chromePath;
                           }
                       } catch (error) {
                           // Continue to next path
                       }
                   }
                   
                   // Default fallback for Linux containers
                   return '/usr/bin/google-chrome';
               };
               
               this.browser = await puppeteer.launch({
                   headless: "new",
                   devtools: false,
                   defaultViewport: null,
                   executablePath: getChromePath(),
                   env: {
                       ...process.env,
                       DISPLAY: ':99'
                   },
                   args: [
                       '--no-sandbox',
                       '--disable-dev-shm-usage',
                       '--disable-web-security',
                       '--disable-features=VizDisplayCompositor',
                       '--no-first-run',
                       '--disable-default-apps',
                       '--disable-sync',
                       '--disable-translate',
                       '--disable-extensions',
                       '--disable-background-networking',
                       '--disable-blink-features=AutomationControlled',
                       '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                   ],
                   ignoreDefaultArgs: ['--enable-automation'],
                   ignoreHTTPSErrors: true
               });
   
               const pages = await this.browser.pages();
               this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
               
               await this.page.setViewport({
                   width: 1920,
                   height: 1080,
                   deviceScaleFactor: 1,
                   isMobile: false,
                   hasTouch: false,
                   isLandscape: true
               });
               
               // Enhanced anti-detection
               await this.page.evaluateOnNewDocument(() => {
                   Object.defineProperty(navigator, 'webdriver', {
                       get: () => undefined,
                   });
                   delete navigator.__proto__.webdriver;
                   
                   if (!window.chrome) {
                       window.chrome = {
                           runtime: {},
                           loadTimes: function() {},
                           csi: function() {},
                       };
                   }
                   
                   Object.defineProperty(navigator, 'hardwareConcurrency', {
                       get: () => 8
                   });
                   
                   Object.defineProperty(navigator, 'languages', {
                       get: () => ['en-US', 'en'],
                   });
               });
   
               this.log('✅ Browser setup complete');
               return true;
           } catch (error) {
               this.log(`❌ Browser setup failed: ${error.message}`);
               return false;
           }
       }
   
       async loadSiteAndWaitForChallenge() {
           try {
               this.log('🌐 Navigating to Intuition faucet...');
               
               // Monitor for Vercel challenge completion
               let challengeJsLoaded = false;
               let challengeWasmLoaded = false;
               let challengeRequestCompleted = false;
               let vcrcsSet = false;
               
               this.page.on('response', async (response) => {
                   const url = response.url();
                   
                   if (url.includes('challenge.v2.min.js')) {
                       challengeJsLoaded = true;
                       this.log('📄 Vercel challenge JS loaded');
                   }
                   
                   if (url.includes('challenge.v2.wasm')) {
                       challengeWasmLoaded = true;
                       this.log('🔧 Vercel challenge WASM loaded');
                   }
                   
                   if (url.includes('/request-challenge')) {
                       challengeRequestCompleted = true;
                       this.log('🔐 Vercel challenge request completed');
                       
                       const cookies = await this.page.cookies();
                       const vcrcs = cookies.find(cookie => cookie.name === '_vcrcs');
                       if (vcrcs) {
                           vcrcsSet = true;
                           this.log(`✅ _vcrcs cookie detected: ${vcrcs.value.substring(0, 50)}...`);
                       }
                   }
               });
               
            // Navigate to the site
            await this.page.goto(this.FAUCET_URL, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });               // Wait for challenge completion
               const maxWait = 45000; // 45 seconds max
               const startTime = Date.now();
               
               this.log('🔍 Waiting for Vercel challenge completion...');
               
               while (Date.now() - startTime < maxWait) {
                   const cookies = await this.page.cookies();
                   const vcrcs = cookies.find(cookie => cookie.name === '_vcrcs');
                   if (vcrcs && !vcrcsSet) {
                       vcrcsSet = true;
                       challengeRequestCompleted = true;
                       this.log(`✅ _vcrcs cookie detected: ${vcrcs.value.substring(0, 50)}...`);
                       break;
                   }
                   
                   if (challengeJsLoaded && challengeWasmLoaded && challengeRequestCompleted && vcrcsSet) {
                       this.log('✅ Complete Vercel challenge sequence detected!');
                       break;
                   }
                   
                   await this.delay(2000);
               }
               
               await this.delay(3000);
               
               const finalCookies = await this.page.cookies();
               const finalVcrcs = finalCookies.find(cookie => cookie.name === '_vcrcs');
               
               if (finalVcrcs) {
                   this.log('✅ Vercel challenge completed successfully!');
                   return true;
               } else {
                   this.log('⚠️ No _vcrcs cookie found, but proceeding...');
                   return true;
               }
               
           } catch (error) {
               this.log(`❌ Error loading site: ${error.message}`);
               return false;
           }
       }
   
       async runFaucet() {
           try {
               this.log('🎯 Starting Faucet Operations...');
               
               const setupSuccess = await this.setupBrowser();
               if (!setupSuccess) {
                   this.log('❌ Failed to setup browser');
                   return;
               }
   
               // Load site and wait for Vercel challenge
               await this.loadSiteAndWaitForChallenge();
   
               let successCount = 0;
               let processedCount = 0;
               const totalWallets = this.walletData.length;
   
               for (const walletInfo of this.walletData) {
                   processedCount++;
                   
                   console.log('\n' + '='.repeat(60));
                   this.log(`💰 Processing wallet ${processedCount}/${totalWallets}: ${walletInfo.address}`);
                   
                   // Use browser's fetch with cookies (proven working approach)
                   const result = await this.page.evaluate(async (walletAddress) => {
                       try {
                           const apiUrl = 'https://testnet.hub.intuition.systems/api/trpc/faucet.requestFaucetFunds?batch=1';
                           const payload = {
                               "0": {
                                   "json": {
                                       "rollupSubdomain": "intuition-testnet",
                                       "recipientAddress": walletAddress,
                                       "turnstileToken": "",
                                       "tokenRollupAddress": null
                                   },
                                   "meta": {
                                       "values": {
                                           "tokenRollupAddress": ["undefined"]
                                       }
                                   }
                               }
                           };
                           
                           const response = await fetch(apiUrl, {
                               method: 'POST',
                               headers: {
                                   'Content-Type': 'application/json',
                               },
                               body: JSON.stringify(payload)
                           });
                           
                           return {
                               status: response.status,
                               statusText: response.statusText,
                               data: await response.text()
                           };
                       } catch (error) {
                           return { error: error.message };
                       }
                   }, walletInfo.address);
                   
                   this.log(`📡 API Response: Status ${result.status}`);
                   
                   if (result.error) {
                       this.log(`❌ Request error: ${result.error}`);
                   } else if (result.status === 200) {
                       this.log(`✅ Faucet request successful!`);
                       try {
                           const responseData = JSON.parse(result.data);
                           this.log(`📄 Response: ${JSON.stringify(responseData, null, 2)}`);
                       } catch (parseError) {
                           this.log(`📄 Response: ${result.data.substring(0, 200)}...`);
                       }
                       successCount++;
                   } else if (result.status === 429) {
                       this.log(`⏰ Rate limited: You can only request funds once every 24 hours`);
                   } else if (result.status === 403) {
                       this.log('⚠️ Blocked or need to refresh session, refreshing...');
                       
                       // Refresh session by reloading the page
                       await this.page.reload({ waitUntil: 'networkidle2' });
                       await this.delay(5000);
                   } else {
                       this.log(`❌ Request failed: ${result.status} ${result.statusText}`);
                       this.log(`📄 Error details: ${result.data?.substring(0, 200)}...`);
                   }
   
                   await this.delay(2000);
               }
   
               this.log('🎉 Faucet operations completed!');
               this.log(`📊 Results: ${successCount}/${totalWallets} successful requests`);
               
           } catch (error) {
               this.log(`❌ Faucet error: ${error.message}`);
           } finally {
               if (this.browser) {
                   await this.browser.close();
               }
           }
       }

    async runFaucet() {
        try {
            this.log('🎯 Starting Faucet Operations...');
            
            const setupSuccess = await this.setupBrowser();
            if (!setupSuccess) {
                this.log('❌ Failed to setup browser');
                return;
            }

            // Load site and wait for Vercel challenge
            await this.loadSiteAndWaitForChallenge();

            let successCount = 0;
            let processedCount = 0;
            const totalWallets = this.walletData.length;

            for (const walletInfo of this.walletData) {
                processedCount++;
                
                console.log('\n' + '='.repeat(60));
                this.log(`💰 Processing wallet ${processedCount}/${totalWallets}: ${walletInfo.address}`);
                
                // Use browser's fetch with cookies (proven working approach)
                const result = await this.page.evaluate(async (walletAddress) => {
                    try {
                        const apiUrl = 'https://testnet.hub.intuition.systems/api/trpc/faucet.requestFaucetFunds?batch=1';
                        const payload = {
                            "0": {
                                "json": {
                                    "rollupSubdomain": "intuition-testnet",
                                    "recipientAddress": walletAddress,
                                    "turnstileToken": "",
                                    "tokenRollupAddress": null
                                },
                                "meta": {
                                    "values": {
                                        "tokenRollupAddress": ["undefined"]
                                    }
                                }
                            }
                        };
                        
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payload)
                        });
                        
                        return {
                            status: response.status,
                            statusText: response.statusText,
                            data: await response.text()
                        };
                    } catch (error) {
                        return { error: error.message };
                    }
                }, walletInfo.address);
                
                this.log(`📡 API Response: Status ${result.status}`);
                
                if (result.error) {
                    this.log(`❌ Request error: ${result.error}`);
                } else if (result.status === 200) {
                    this.log(`✅ Faucet request successful!`);
                    try {
                        const responseData = JSON.parse(result.data);
                        this.log(`📄 Response: ${JSON.stringify(responseData, null, 2)}`);
                    } catch (parseError) {
                        this.log(`📄 Response: ${result.data.substring(0, 200)}...`);
                    }
                    successCount++;
                } else if (result.status === 429) {
                    this.log(`⏰ Rate limited: You can only request funds once every 24 hours`);
                } else if (result.status === 403) {
                    this.log('⚠️ Blocked or need to refresh session, refreshing...');
                    
                    // Refresh session by reloading the page
                    await this.page.reload({ waitUntil: 'networkidle2' });
                    await this.delay(5000);
                } else {
                    this.log(`❌ Request failed: ${result.status} ${result.statusText}`);
                    this.log(`📄 Error details: ${result.data?.substring(0, 200)}...`);
                }

                await this.delay(2000);
            }

            this.log('🎉 Faucet operations completed!');
            this.log(`📊 Results: ${successCount}/${totalWallets} successful requests`);
            
        } catch (error) {
            this.log(`❌ Faucet error: ${error.message}`);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    async displayMenu() {
        console.log('\n🎯 OPERATION MENU');
        console.log('─'.repeat(25));
        console.log('1. 💰 Run Faucet Bot');
        console.log('2. 🌉 Run Bridge Bot');
        console.log('3. 🚪 Exit');
        console.log('─'.repeat(25));
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('Select option (1-3): ', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }

    // Bridge functionality methods
    async getTokenBalance(address, rpcUrl, contractAddress) {
        try {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            
            if (contractAddress === "0x0000000000000000000000000000000000000000") {
                // Native token balance
                const balance = await provider.getBalance(address);
                return ethers.formatEther(balance);
            } else {
                // ERC20 token balance
                const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
                const balance = await contract.balanceOf(address);
                const decimals = await contract.decimals();
                return ethers.formatUnits(balance, decimals);
            }
        } catch (error) {
            this.log(`❌ Error getting token balance: ${error.message}`);
            return null;
        }
    }

    async approveToken(wallet, spenderAddress, amount) {
        try {
            const provider = new ethers.JsonRpcProvider(BRIDGE_CONFIG.BASE_SEPOLIA_RPC_URL);
            const connectedWallet = wallet.connect(provider);
            
            const tokenContract = new ethers.Contract(
                BRIDGE_CONFIG.TTRUST_CONTRACT_ADDRESS, 
                ERC20_ABI, 
                connectedWallet
            );

            const allowance = await tokenContract.allowance(wallet.address, spenderAddress);
            const amountWei = ethers.parseEther(amount.toString());
            
            this.log(`🔍 Current allowance: ${ethers.formatEther(allowance)} tTRUST`);
            this.log(`📊 Required amount: ${amount} tTRUST`);
            
            if (allowance < amountWei) {
                this.log('📝 Approving token for bridge contract...');
                
                // Use a large allowance to avoid frequent approvals
                const maxAllowance = ethers.parseEther("1000000"); // 1M tokens
                
                const approveTx = await tokenContract.approve(spenderAddress, maxAllowance, {
                    gasLimit: 100000 // Standard gas limit for approval
                });
                
                this.log(`📋 Approval tx: ${approveTx.hash}`);
                this.log('⏳ Waiting for approval confirmation...');
                
                const receipt = await approveTx.wait();
                
                if (receipt.status === 1) {
                    this.log('✅ Token approval confirmed');
                    return true;
                } else {
                    this.log('❌ Token approval failed');
                    return false;
                }
            }
            
            this.log('✅ Token already approved');
            return true;
        } catch (error) {
            this.log(`❌ Token approval failed: ${error.message}`);
            if (error.message.includes('insufficient funds')) {
                this.log('💸 Insufficient ETH for approval gas fees');
            }
            return false;
        }
    }

    async withdrawEth(wallet, amount) {
        try {
            const provider = new ethers.JsonRpcProvider(BRIDGE_CONFIG.INTUITION_RPC_URL);
            const connectedWallet = wallet.connect(provider);
            
            // Use proper ArbSys contract for withdrawals
            const arbSysContract = new ethers.Contract(
                BRIDGE_CONFIG.ARB_SYS_ADDRESS,
                BRIDGE_ABI,
                connectedWallet
            );

            const amountWei = ethers.parseEther(amount.toString());
            
            this.log('⛽ Estimating gas...');
            
            // Try gas estimation with fallback
            let gasLimit;
            try {
                const gasEstimate = await arbSysContract.withdrawEth.estimateGas(
                    wallet.address,
                    { value: amountWei }
                );
                gasLimit = gasEstimate * 120n / 100n; // 20% buffer
            } catch (gasError) {
                this.log('⚠️ Gas estimation failed, using default gas limit');
                gasLimit = 100000n; // Default gas limit
            }

            this.log('🔄 Sending withdraw transaction...');
            const tx = await arbSysContract.withdrawEth(wallet.address, {
                value: amountWei,
                gasLimit: gasLimit
            });

            this.log(`📋 Transaction Hash: ${tx.hash}`);
            this.log(`🔗 Explorer: ${BRIDGE_CONFIG.INTUITION_EXPLORER}${tx.hash}`);
            
            this.log('⏳ Waiting for transaction confirmation...');
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                this.log(`✅ Bridge transaction confirmed! Block: ${receipt.blockNumber}`);
                return true;
            } else {
                this.log('❌ Bridge transaction failed');
                return false;
            }
        } catch (error) {
            this.log(`❌ Withdraw ETH failed: ${error.message}`);
            if (error.message.includes('insufficient funds')) {
                this.log('💸 Make sure you have enough ETH for gas fees');
            } else if (error.message.includes('execution reverted')) {
                this.log('🔄 Transaction reverted - check bridge contract status');
            }
            return false;
        }
    }

    async createRetryableTicket(wallet, amount) {
        try {
            const provider = new ethers.JsonRpcProvider(BRIDGE_CONFIG.BASE_SEPOLIA_RPC_URL);
            const connectedWallet = wallet.connect(provider);
            
            const amountWei = ethers.parseEther(amount.toString());
            const gasLimit = 27514n;
            const maxFeePerGas = 600000000n;
            const bridgeFees = gasLimit * maxFeePerGas;
            const amountWithFees = bridgeFees + amountWei;

            this.log(`💰 Amount: ${ethers.formatEther(amountWei)} tTRUST`);
            this.log(`⛽ Bridge fees: ${ethers.formatEther(bridgeFees)} tTRUST`);
            this.log(`📊 Total required: ${ethers.formatEther(amountWithFees)} tTRUST`);

            // Check tTRUST balance first
            const balance = await this.getTokenBalance(wallet.address, BRIDGE_CONFIG.BASE_SEPOLIA_RPC_URL, BRIDGE_CONFIG.TTRUST_CONTRACT_ADDRESS);
            if (!balance || parseFloat(balance) < parseFloat(ethers.formatEther(amountWithFees))) {
                this.log(`❌ Insufficient tTRUST balance. Need: ${ethers.formatEther(amountWithFees)}, Have: ${balance}`);
                return false;
            }

            // Approve token first
            this.log('📝 Checking/approving token for bridge contract...');
            const approved = await this.approveToken(wallet, BRIDGE_CONFIG.INBOX_ADDRESS, ethers.formatEther(amountWithFees));
            if (!approved) {
                return false;
            }

            const inboxContract = new ethers.Contract(
                BRIDGE_CONFIG.INBOX_ADDRESS,
                BRIDGE_ABI,
                connectedWallet
            );

            this.log('⛽ Estimating gas for retryable ticket...');
            
            // Try gas estimation with fallback
            let gasLimitForTx;
            try {
                const gasEstimate = await inboxContract.createRetryableTicket.estimateGas(
                    wallet.address,    // to
                    amountWei,        // l2CallValue
                    0n,               // maxSubmissionCost
                    wallet.address,   // excessFeeRefundAddress
                    wallet.address,   // callValueRefundAddress
                    gasLimit,         // gasLimit
                    maxFeePerGas,     // maxFeePerGas
                    amountWithFees,   // tokenTotalFeeAmount
                    '0x'             // data
                );
                gasLimitForTx = gasEstimate * 120n / 100n; // 20% buffer
            } catch (gasError) {
                this.log('⚠️ Gas estimation failed, using default gas limit');
                gasLimitForTx = 300000n; // Default gas limit
            }

            this.log('🔄 Sending retryable ticket transaction...');
            const tx = await inboxContract.createRetryableTicket(
                wallet.address,
                amountWei,
                0n,
                wallet.address,
                wallet.address,
                gasLimit,
                maxFeePerGas,
                amountWithFees,
                '0x',
                {
                    gasLimit: gasLimitForTx
                }
            );

            this.log(`📋 Transaction Hash: ${tx.hash}`);
            this.log(`🔗 Explorer: ${BRIDGE_CONFIG.BASE_SEPOLIA_EXPLORER}${tx.hash}`);
            
            this.log('⏳ Waiting for transaction confirmation...');
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                this.log(`✅ Bridge transaction confirmed! Block: ${receipt.blockNumber}`);
                return true;
            } else {
                this.log('❌ Bridge transaction failed');
                return false;
            }
        } catch (error) {
            this.log(`❌ Create retryable ticket failed: ${error.message}`);
            if (error.message.includes('insufficient funds')) {
                this.log('💸 Make sure you have enough tTRUST for fees');
            } else if (error.message.includes('execution reverted')) {
                this.log('🔄 Transaction reverted - check bridge contract status');
            } else if (error.message.includes('allowance')) {
                this.log('🔐 Token approval issue - try again');
            }
            return false;
        }
    }

    async getBridgeParameters() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const question = (query) => new Promise((resolve) => rl.question(query, resolve));
        
        try {
            console.log('\n🌉 BRIDGE CONFIGURATION');
            console.log('─'.repeat(30));
            
            // Bridge direction
            console.log('Select bridge direction:');
            console.log('1. Intuition → Base Sepolia (withdrawEth)');
            console.log('2. Base Sepolia → Intuition (createRetryableTicket)');
            console.log('3. Random direction');
            
            let direction;
            while (true) {
                const directionInput = await question('Choose direction (1-3): ');
                const dir = parseInt(directionInput.trim());
                if ([1, 2, 3].includes(dir)) {
                    direction = dir;
                    break;
                }
                console.log('❌ Invalid choice. Please enter 1, 2, or 3.');
            }
            
            // Bridge amount
            let amount;
            while (true) {
                const amountInput = await question('Enter amount to bridge (ETH, e.g., 0.001): ');
                const amountNum = parseFloat(amountInput.trim());
                if (!isNaN(amountNum) && amountNum > 0) {
                    amount = amountNum;
                    break;
                }
                console.log('❌ Invalid amount. Please enter a positive number.');
            }
            
            // Number of transactions
            let txCount;
            while (true) {
                const txInput = await question('Number of bridge transactions: ');
                const count = parseInt(txInput.trim());
                if (!isNaN(count) && count > 0) {
                    txCount = count;
                    break;
                }
                console.log('❌ Invalid count. Please enter a positive number.');
            }
            
            // Delay range
            let minDelay;
            while (true) {
                const delayInput = await question('Min delay between transactions (seconds): ');
                const delay = parseInt(delayInput.trim());
                if (!isNaN(delay) && delay >= 0) {
                    minDelay = delay;
                    break;
                }
                console.log('❌ Invalid delay. Please enter a non-negative number.');
            }
            
            let maxDelay;
            while (true) {
                const delayInput = await question('Max delay between transactions (seconds): ');
                const delay = parseInt(delayInput.trim());
                if (!isNaN(delay) && delay >= minDelay) {
                    maxDelay = delay;
                    break;
                }
                console.log(`❌ Invalid delay. Please enter a number >= ${minDelay}.`);
            }
            
            rl.close();
            
            return {
                direction,
                amount,
                txCount,
                minDelay,
                maxDelay
            };
        } catch (error) {
            rl.close();
            throw error;
        }
    }

    async runBridge() {
        try {
            this.log('🌉 Starting Bridge Operations...');
            
            // Get bridge parameters
            const params = await this.getBridgeParameters();
            
            console.log('\n✅ Bridge Configuration:');
            const directionText = params.direction === 1 ? 'Intuition → Base Sepolia' : 
                                params.direction === 2 ? 'Base Sepolia → Intuition' : 'Random Direction';
            console.log(`  • Direction: ${directionText}`);
            console.log(`  • Amount: ${params.amount} ETH`);
            console.log(`  • Transactions: ${params.txCount}`);
            console.log(`  • Delay: ${params.minDelay}-${params.maxDelay} seconds`);
            
            let successCount = 0;
            const totalTxs = params.txCount; // Use the exact number of transactions requested
            
            for (let i = 0; i < totalTxs; i++) {
                // Use wallets in round-robin fashion if more transactions than wallets
                const walletIndex = i % this.walletData.length;
                const walletInfo = this.walletData[walletIndex];
                const wallet = new ethers.Wallet(walletInfo.privateKey);
                
                console.log('\n' + '='.repeat(60));
                this.log(`🌉 Processing transaction ${i + 1}/${totalTxs}: ${walletInfo.address}`);
                
                let currentDirection = params.direction;
                if (params.direction === 3) {
                    currentDirection = Math.random() < 0.5 ? 1 : 2;
                    const randomText = currentDirection === 1 ? 'Intuition → Base Sepolia' : 'Base Sepolia → Intuition';
                    this.log(`🎲 Random direction selected: ${randomText}`);
                }
                
                let success = false;
                
                if (currentDirection === 1) {
                    // Intuition to Base Sepolia
                    this.log(`🔄 Bridging ${params.amount} tTRUST from Intuition → Base Sepolia`);
                    
                    // Check balance on Intuition
                    const balance = await this.getTokenBalance(walletInfo.address, BRIDGE_CONFIG.INTUITION_RPC_URL, "0x0000000000000000000000000000000000000000");
                    this.log(`💰 Intuition balance: ${balance} tTRUST`);

                    if (balance && parseFloat(balance) >= params.amount) {
                        success = await this.withdrawEth(wallet, params.amount);
                    } else {
                        this.log('❌ Insufficient balance on Intuition');
                    }
                } else {
                    // Base Sepolia to Intuition
                    this.log(`🔄 Bridging ${params.amount} tTRUST from Base Sepolia → Intuition`);
                    
                    // Check tTRUST balance on Base Sepolia
                    const balance = await this.getTokenBalance(walletInfo.address, BRIDGE_CONFIG.BASE_SEPOLIA_RPC_URL, BRIDGE_CONFIG.TTRUST_CONTRACT_ADDRESS);
                    this.log(`💰 Base Sepolia tTRUST balance: ${balance} tTRUST`);
                    
                    if (balance && parseFloat(balance) >= params.amount) {
                        success = await this.createRetryableTicket(wallet, params.amount);
                    } else {
                        this.log('❌ Insufficient tTRUST balance on Base Sepolia');
                    }
                }
                
                if (success) {
                    successCount++;
                    this.log(`✅ Bridge transaction ${i + 1} completed successfully`);
                } else {
                    this.log(`❌ Bridge transaction ${i + 1} failed`);
                }
                
                // Delay between transactions (except for the last one)
                if (i < totalTxs - 1) {
                    const delay = Math.floor(Math.random() * (params.maxDelay - params.minDelay + 1)) + params.minDelay;
                    this.log(`⏳ Waiting ${delay} seconds before next transaction...`);
                    await this.delay(delay * 1000);
                }
            }
            
            this.log('🎉 Bridge operations completed!');
            this.log(`📊 Results: ${successCount}/${totalTxs} successful transactions`);
            
        } catch (error) {
            this.log(`❌ Bridge error: ${error.message}`);
        }
    }

    async run() {
        this.displayBanner();
        
        // Load wallet data
        this.walletData = this.loadWallets();
        if (this.walletData.length === 0) {
            this.log('❌ No valid wallets found. Please check private_keys.txt');
            return;
        }

        while (true) {
            try {
                const choice = await this.displayMenu();
                
                switch (choice) {
                    case '1':
                        await this.runFaucet();
                        break;
                    case '2':
                        await this.runBridge();
                        break;
                    case '3':
                        this.log('👋 Exiting bot...');
                        if (this.browser) {
                            await this.browser.close();
                        }
                        process.exit(0);
                        break;
                    default:
                        this.log('❌ Invalid option. Please select 1, 2, or 3.');
                        break;
                }
            } catch (error) {
                this.log(`❌ Menu error: ${error.message}`);
            }
        }
    }
}

// Run the bot
const bot = new IntuitionFaucetBot();
bot.run().catch(console.error);
