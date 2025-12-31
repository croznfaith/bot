// ============================================
// Thanks Pay Bot - VERCEL VERSION
// Node.js + Telegraf Framework
// ============================================

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ============ CONFIGURATION ============
const config = {
    BOT_TOKEN: "8551290266:AAF5cisieGvQvs0eJZQlta2AmopF1GY0uow",
    API_KEY: "bb_live_sk_d290e9e4dddead2c6b86172af26d37305e978d4c",
    
    // URLs
    API_URL_CREATE: "https://ownapi.me/api/v1/create",
    API_URL_STATUS: "https://ownapi.me/api/v1/order_status",
    GAME_API_URL: "https://xi.animecore.me/api/bgmi.php?userid=",
    EMAIL_API_URL: "https://xi.animecore.me/api/send.php",
    
    // Channel
    CHANNEL_USERNAME: "@ZasoMoney",
    ADMIN_USERNAME: "@Admin",
    
    // Games
    GAME_PACKS: {
        "bgmi": {
            "name": "BGMI UC",
            "currency": "UC",
            "icon": "🎮",
            "packs": [
                {"id": 1, "value": 60, "original": 99, "discounted": 1.50},
                {"id": 2, "value": 325, "original": 549, "discounted": 274.50},
                {"id": 3, "value": 660, "original": 1099, "discounted": 549.50},
                {"id": 4, "value": 1800, "original": 2999, "discounted": 1499.50},
                {"id": 5, "value": 3850, "original": 6499, "discounted": 3249.50},
            ]
        },
        "pubgm": {
            "name": "PUBGM UC",
            "currency": "UC",
            "icon": "📱",
            "packs": [
                {"id": 1, "value": 60, "original": 99, "discounted": 49.50},
                {"id": 2, "value": 325, "original": 549, "discounted": 274.50},
                {"id": 3, "value": 660, "original": 1099, "discounted": 549.50},
                {"id": 4, "value": 1800, "original": 2999, "discounted": 1499.50},
                {"id": 5, "value": 3850, "original": 6499, "discounted": 3249.50},
            ]
        },
        "freefire": {
            "name": "Free Fire Diamonds",
            "currency": "Diamonds",
            "icon": "💎",
            "packs": [
                {"id": 1, "value": 100, "original": 89, "discounted": 44.50},
                {"id": 2, "value": 550, "original": 499, "discounted": 249.50},
                {"id": 3, "value": 1200, "original": 999, "discounted": 499.50},
                {"id": 4, "value": 2500, "original": 1999, "discounted": 999.50},
                {"id": 5, "value": 5300, "original": 3999, "discounted": 1999.50},
            ]
        }
    },
    
    TPC_RATES: {
        "bgmi": 1000,
        "pubgm": 1000,
        "freefire": 900
    }
};

// ============ DATABASE ============
class Database {
    constructor() {
        this.db = new sqlite3.Database('bot.db', (err) => {
            if (err) {
                console.error('Database error:', err);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                username TEXT,
                name TEXT,
                balance REAL DEFAULT 50,
                email TEXT,
                referral_code TEXT,
                first_purchase INTEGER DEFAULT 1,
                joined_channel INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                order_id TEXT UNIQUE,
                game_type TEXT,
                amount REAL,
                game_uid TEXT,
                game_username TEXT,
                status TEXT DEFAULT 'pending',
                payment_method TEXT,
                email_sent INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS temp_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                key TEXT,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        queries.forEach(query => {
            this.db.run(query);
        });
    }

    getUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM users WHERE user_id = ?", [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createUser(userId, username, name) {
        const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        return new Promise((resolve, reject) => {
            this.db.run(
                "INSERT INTO users (user_id, username, name, referral_code) VALUES (?, ?, ?, ?)",
                [userId, username, name, referralCode],
                (err) => {
                    if (err) reject(err);
                    else this.getUser(userId).then(resolve).catch(reject);
                }
            );
        });
    }

    updateUser(userId, data) {
        const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = Object.values(data);
        values.push(userId);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users SET ${sets} WHERE user_id = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    setTemp(userId, key, value) {
        return new Promise((resolve, reject) => {
            // Delete old
            this.db.run(
                "DELETE FROM temp_data WHERE user_id = ? AND key = ?",
                [userId, key],
                () => {
                    // Insert new
                    this.db.run(
                        "INSERT INTO temp_data (user_id, key, value) VALUES (?, ?, ?)",
                        [userId, key, JSON.stringify(value)],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                }
            );
        });
    }

    getTemp(userId, key) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT value FROM temp_data WHERE user_id = ? AND key = ?",
                [userId, key],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? JSON.parse(row.value) : null);
                }
            );
        });
    }

    deleteTemp(userId, key) {
        return new Promise((resolve, reject) => {
            this.db.run(
                "DELETE FROM temp_data WHERE user_id = ? AND key = ?",
                [userId, key],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    addTransaction(userId, orderId, gameType, amount, uid = '', username = '') {
        return new Promise((resolve, reject) => {
            this.db.run(
                "INSERT INTO transactions (user_id, order_id, game_type, amount, game_uid, game_username) VALUES (?, ?, ?, ?, ?, ?)",
                [userId, orderId, gameType, amount, uid, username],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    updateTransaction(orderId, data) {
        const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = Object.values(data);
        values.push(orderId);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE transactions SET ${sets} WHERE order_id = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getTransaction(orderId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT * FROM transactions WHERE order_id = ?",
                [orderId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    getUserTransactions(userId, limit = 5) {
        return new Promise((resolve, reject) => {
            this.db.all(
                "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getPendingTransactions() {
        return new Promise((resolve, reject) => {
            this.db.all(
                "SELECT * FROM transactions WHERE status = 'pending' AND payment_method != 'TPC'",
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

// ============ PAYMENT API ============
class PaymentAPI {
    static async create(amount, orderId) {
        try {
            const data = {
                order_id: orderId,
                amount: amount,
                merchant_id: 'freecharge',
                redirect_url: 'https://google.com'
            };

            const response = await axios.post(config.API_URL_CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${config.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return response.data;
        } catch (error) {
            console.error('Payment creation error:', error.message);
            return null;
        }
    }

    static async status(orderId) {
        try {
            const response = await axios.post(config.API_URL_STATUS, 
                { order_id: orderId },
                {
                    headers: {
                        'Authorization': `Bearer ${config.API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return response.data;
        } catch (error) {
            console.error('Payment status error:', error.message);
            return null;
        }
    }
}

// ============ GAME USERNAME API ============
class GameAPI {
    static async getUsername(uid, gameType) {
        if (gameType === 'bgmi' || gameType === 'pubgm') {
            try {
                const response = await axios.get(`${config.GAME_API_URL}${uid}`, {
                    timeout: 10000
                });
                
                if (response.data && response.data.username) {
                    return response.data.username;
                }
            } catch (error) {
                console.error('Game API error:', error.message);
            }
        }
        
        return 'Player';
    }
}

// ============ BOT CLASS ============
class Bot {
    constructor() {
        this.bot = new Telegraf(config.BOT_TOKEN);
        this.db = new Database();
        this.userStates = new Map(); // For tracking user states
        
        this.setupHandlers();
        this.startAutoChecker();
    }

    setupHandlers() {
        // Start command
        this.bot.start(async (ctx) => {
            const userId = ctx.from.id;
            const username = ctx.from.username || '';
            const name = `${ctx.from.first_name} ${ctx.from.last_name || ''}`.trim();
            const referralCode = ctx.startPayload || '';

            try {
                let user = await this.db.getUser(userId);
                
                if (!user) {
                    user = await this.db.createUser(userId, username, name);
                }

                if (!user.email) {
                    await this.askForEmail(ctx);
                    return;
                }

                await this.showMainMenu(ctx, user);
            } catch (error) {
                console.error('Start error:', error);
                ctx.reply('❌ An error occurred. Please try again.');
            }
        });

        // Help command
        this.bot.command('help', (ctx) => {
            const helpText = `🆘 *Help*\n\n` +
                           `*Available Commands:*\n` +
                           `/start - Start the bot\n` +
                           `/status ORDER_ID - Check order status\n` +
                           `/help - Show this help\n\n` +
                           `*How to Buy:*\n` +
                           `1. Select game\n` +
                           `2. Choose package\n` +
                           `3. Enter UID\n` +
                           `4. Choose payment method\n` +
                           `5. Complete payment\n\n` +
                           `*Need Help?*\n` +
                           `Contact: ${config.ADMIN_USERNAME}`;
            
            ctx.reply(helpText, { parse_mode: 'Markdown' });
        });

        // Status command
        this.bot.command('status', async (ctx) => {
            const orderId = ctx.message.text.split(' ')[1];
            
            if (!orderId) {
                ctx.reply('Please provide Order ID: /status ORDER_ID');
                return;
            }

            await this.checkStatus(ctx, orderId);
        });

        // Text messages
        this.bot.on('text', async (ctx) => {
            const userId = ctx.from.id;
            const text = ctx.message.text;

            try {
                const user = await this.db.getUser(userId);
                if (!user) {
                    await ctx.reply('Please send /start first');
                    return;
                }

                // Check if waiting for email
                if (!user.email) {
                    await this.saveEmail(ctx, userId, text);
                    return;
                }

                // Check if waiting for UID
                const selection = await this.db.getTemp(userId, 'selected_pack');
                if (selection && /^\d+$/.test(text)) {
                    await this.saveUID(ctx, userId, text, user);
                    return;
                }

                // Default response
                await ctx.reply('Use the menu buttons or send /start');
            } catch (error) {
                console.error('Text handler error:', error);
            }
        });

        // Callback queries
        this.bot.on('callback_query', async (ctx) => {
            const data = ctx.callbackQuery.data;
            const userId = ctx.from.id;

            try {
                // Answer callback first
                await ctx.answerCbQuery();

                const user = await this.db.getUser(userId);
                if (!user) {
                    await ctx.reply('Please send /start first');
                    return;
                }

                // Handle different callbacks
                if (data === 'back_main') {
                    await this.showMainMenu(ctx, user);
                } else if (data.startsWith('game_')) {
                    await this.showGamePacks(ctx, data);
                } else if (data.startsWith('select_')) {
                    await this.selectPack(ctx, data, userId);
                } else if (data.startsWith('pay_')) {
                    await this.processPayment(ctx, data, user);
                } else if (data.startsWith('tpc_')) {
                    await this.processTPC(ctx, data, user);
                } else if (data === 'profile') {
                    await this.showProfile(ctx, user);
                } else if (data === 'history') {
                    await this.showHistory(ctx, user);
                } else if (data === 'support') {
                    await this.showSupport(ctx);
                } else if (data === 'earn_tpc') {
                    await this.showEarnTPC(ctx, user);
                } else if (data.startsWith('status_')) {
                    const orderId = data.substring(7);
                    await this.checkStatus(ctx, orderId);
                }
            } catch (error) {
                console.error('Callback error:', error);
                await ctx.reply('❌ An error occurred. Please try again.');
            }
        });
    }

    async askForEmail(ctx) {
        await ctx.reply(
            '📧 *Please enter your email:*\n\n' +
            'We\'ll send order receipts to this email.\n' +
            'Example: user@gmail.com',
            { parse_mode: 'Markdown' }
        );
    }

    async saveEmail(ctx, userId, email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            await ctx.reply('❌ Invalid email. Please enter a valid email.');
            return;
        }

        try {
            await this.db.updateUser(userId, { email: email.trim() });
            const user = await this.db.getUser(userId);
            
            await ctx.reply('✅ Email saved successfully!');
            await this.showMainMenu(ctx, user);
        } catch (error) {
            console.error('Save email error:', error);
            await ctx.reply('❌ Failed to save email. Please try again.');
        }
    }

    async showMainMenu(ctx, user) {
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🎮 BGMI UC', 'game_bgmi'),
                Markup.button.callback('📱 PUBGM UC', 'game_pubgm')
            ],
            [
                Markup.button.callback('💎 Free Fire', 'game_freefire')
            ],
            [
                Markup.button.callback('👤 Profile', 'profile'),
                Markup.button.callback('📜 History', 'history')
            ],
            [
                Markup.button.callback('💎 Earn TPC', 'earn_tpc'),
                Markup.button.callback('🛟 Support', 'support')
            ]
        ]);

        const message = `🏆 *Thanks Pay Gaming*\n\n` +
                       `💰 *Wallet:* ${user.balance} TPC\n` +
                       `📧 *Email:* ${user.email ? '✅ Registered' : '❌ Not Set'}\n\n` +
                       `Select a game to continue:`;

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        } else {
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }
    }

    async showGamePacks(ctx, data) {
        const gameType = data.substring(5);
        const game = config.GAME_PACKS[gameType];

        if (!game) {
            await ctx.reply('❌ Game not found');
            return;
        }

        const keyboardButtons = game.packs.map(pack => {
            const hasDiscount = ctx.from && await this.db.getUser(ctx.from.id).then(u => u.first_purchase);
            const price = hasDiscount ? pack.discounted : pack.original;
            const text = `${pack.value} ${game.currency} - ₹${price}${hasDiscount ? ' 🔥' : ''}`;
            
            return [Markup.button.callback(text, `select_${gameType}_${pack.id}`)];
        });

        // Add TPC option
        const user = await this.db.getUser(ctx.from.id);
        const tpcNeeded = config.TPC_RATES[gameType] || 1000;
        
        if (user.balance >= tpcNeeded) {
            keyboardButtons.push([
                Markup.button.callback(`💎 Pay with TPC (${tpcNeeded} TPC)`, `tpc_${gameType}_1`)
            ]);
        }

        // Add back button
        keyboardButtons.push([
            Markup.button.callback('↩️ Back', 'back_main')
        ]);

        const keyboard = Markup.inlineKeyboard(keyboardButtons);

        const message = `${game.icon} *${game.name}*\n\n` +
                       `Select a package:\n` +
                       `💰 Your TPC: ${user.balance}\n` +
                       (user.first_purchase ? '🎉 *50% First Purchase Discount!*' : '');

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async selectPack(ctx, data, userId) {
        const [, gameType, packId] = data.split('_');

        await this.db.setTemp(userId, 'selected_pack', {
            game_type: gameType,
            pack_id: parseInt(packId)
        });

        const game = config.GAME_PACKS[gameType];
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('↩️ Back', `game_${gameType}`)]
        ]);

        await ctx.editMessageText(
            `🎮 *${game.name}*\n\n` +
            `Please enter your *Game UID*:\n\n` +
            `Example: \`516183322\`\n\n` +
            `⬇️ Type your UID:`,
            {
                parse_mode: 'Markdown',
                ...keyboard
            }
        );
    }

    async saveUID(ctx, userId, uid, user) {
        const selection = await this.db.getTemp(userId, 'selected_pack');
        if (!selection) {
            await ctx.reply('❌ Please select a package first.');
            return;
        }

        const { game_type: gameType, pack_id: packId } = selection;
        const game = config.GAME_PACKS[gameType];
        const pack = game.packs.find(p => p.id === packId);

        if (!pack) {
            await ctx.reply('❌ Package not found.');
            return;
        }

        // Get username from API
        const username = await GameAPI.getUsername(uid, gameType);

        // Save UID and username
        await this.db.setTemp(userId, `uid_${gameType}_${packId}`, {
            uid: uid,
            username: username
        });

        const hasDiscount = user.first_purchase;
        const price = hasDiscount ? pack.discounted : pack.original;
        const orderId = `ORDER_${userId}_${Date.now()}`;

        const keyboardButtons = [
            [Markup.button.callback(`💳 Pay ₹${price}`, `pay_${gameType}_${packId}`)]
        ];

        // Add TPC option
        const tpcNeeded = config.TPC_RATES[gameType] || 1000;
        if (user.balance >= tpcNeeded) {
            keyboardButtons.push([
                Markup.button.callback(`💎 Use TPC (${tpcNeeded})`, `tpc_${gameType}_${packId}`)
            ]);
        }

        keyboardButtons.push([
            Markup.button.callback('↩️ Back', `game_${gameType}`)
        ]);

        const keyboard = Markup.inlineKeyboard(keyboardButtons);

        await ctx.reply(
            `📋 *Order Summary*\n\n` +
            `Game: ${game.name}\n` +
            `Package: ${pack.value} ${game.currency}\n` +
            `UID: \`${uid}\`\n` +
            `Player Name: ${username}\n` +
            `Price: ~~₹${pack.original}~~ *₹${price}*\n` +
            `Order ID: \`${orderId}\`\n\n` +
            `Select payment method:`,
            {
                parse_mode: 'Markdown',
                ...keyboard
            }
        );
    }

    async processPayment(ctx, data, user) {
        const [, gameType, packId] = data.split('_');
        const game = config.GAME_PACKS[gameType];
        const pack = game.packs.find(p => p.id === parseInt(packId));

        if (!pack) {
            await ctx.reply('❌ Package not found');
            return;
        }

        const hasDiscount = user.first_purchase;
        const amount = hasDiscount ? pack.discounted : pack.original;
        const orderId = `PAY_${user.user_id}_${Date.now()}`;

        // Get UID and username
        const uidData = await this.db.getTemp(user.user_id, `uid_${gameType}_${packId}`);
        if (!uidData) {
            await ctx.reply('❌ UID not found. Please re-select package.');
            return;
        }

        const uid = uidData.uid || uidData;
        const username = uidData.username || 'Player';

        // Create payment
        const payment = await PaymentAPI.create(amount, orderId);

        if (payment && payment.code === 200) {
            const paymentLink = payment.data?.payment_link || '';

            if (paymentLink) {
                // Save transaction
                await this.db.addTransaction(user.user_id, orderId, gameType, amount, uid, username);

                const keyboard = Markup.inlineKeyboard([
                    [
                        Markup.button.url('🔗 Pay Now', paymentLink),
                        Markup.button.callback('🔄 Check Status', `status_${orderId}`)
                    ],
                    [
                        Markup.button.callback('↩️ Back', `game_${gameType}`)
                    ]
                ]);

                await ctx.editMessageText(
                    `✅ *Payment Ready*\n\n` +
                    `Game: ${game.name}\n` +
                    `Package: ${pack.value} ${game.currency}\n` +
                    `UID: \`${uid}\`\n` +
                    `Player: ${username}\n` +
                    `Amount: ₹${amount}\n` +
                    `Order ID: \`${orderId}\`\n\n` +
                    `Click below to pay:`,
                    {
                        parse_mode: 'Markdown',
                        ...keyboard
                    }
                );

                if (hasDiscount) {
                    await this.db.updateUser(user.user_id, { first_purchase: 0 });
                }
            }
        } else {
            const error = payment?.message || 'Payment creation failed';
            await ctx.reply(`❌ Payment Error: ${error}`);
        }
    }

    async processTPC(ctx, data, user) {
        const [, gameType, packId] = data.split('_');
        const game = config.GAME_PACKS[gameType];
        const pack = game.packs.find(p => p.id === parseInt(packId));

        if (!pack) return;

        const tpcNeeded = config.TPC_RATES[gameType] || 1000;

        if (user.balance < tpcNeeded) {
            await ctx.answerCbQuery(`Need ${tpcNeeded} TPC!`, { show_alert: true });
            return;
        }

        // Get UID and username
        const uidData = await this.db.getTemp(user.user_id, `uid_${gameType}_${packId}`);
        if (!uidData) {
            await ctx.reply('❌ UID not found');
            return;
        }

        const uid = uidData.uid || uidData;
        const username = uidData.username || 'Player';

        // Deduct TPC
        const newBalance = user.balance - tpcNeeded;
        await this.db.updateUser(user.user_id, { balance: newBalance });

        const orderId = `TPC_${user.user_id}_${Date.now()}`;

        // Save transaction
        await this.db.addTransaction(user.user_id, orderId, gameType, 0, uid, username);
        await this.db.updateTransaction(orderId, {
            status: 'completed',
            payment_method: 'TPC'
        });

        const receipt = `
🎮 THANKS PAY RECEIPT
─────────────────────
Order ID: ${orderId}
Game: ${game.name}
Package: ${pack.value} ${game.currency}
UID: ${uid}
Player: ${username}
Paid: ${tpcNeeded} TPC
Status: ✅ COMPLETED
Date: ${new Date().toLocaleString('en-IN')}
─────────────────────
Delivery: 5-15 minutes
Support: ${config.ADMIN_USERNAME}
        `.trim();

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🏠 Home', 'back_main'),
                Markup.button.callback('📜 History', 'history')
            ]
        ]);

        await ctx.editMessageText(
            `\`\`\`\n${receipt}\n\`\`\`\n\n` +
            `✅ *Purchase Successful!*\n` +
            `New Balance: ${newBalance} TPC\n` +
            `Delivery in 5-15 minutes`,
            {
                parse_mode: 'Markdown',
                ...keyboard
            }
        );

        // Clean up temp data
        await this.db.deleteTemp(user.user_id, `uid_${gameType}_${packId}`);
        await this.db.deleteTemp(user.user_id, 'selected_pack');
    }

    async checkStatus(ctx, orderId) {
        const status = await PaymentAPI.status(orderId);

        if (status && status.code === 200) {
            const result = status.result || {};
            const stat = (result.status || 'PENDING').toUpperCase();

            let message = `📊 *Order Status*\n\n` +
                         `Order ID: \`${orderId}\`\n` +
                         `Status: ${stat}\n` +
                         `Amount: ₹${result.amount || 0}`;

            if (stat === 'SUCCESS') {
                message += `\n\n✅ *Payment Successful!*`;
                
                // Update transaction status
                await this.db.updateTransaction(orderId, { status: 'completed' });
            }

            await ctx.reply(message, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply('❌ Could not fetch status');
        }
    }

    async showProfile(ctx, user) {
        const message = `👤 *Profile*\n\n` +
                       `Name: ${user.name}\n` +
                       `User ID: \`${user.user_id}\`\n` +
                       `Email: ${user.email}\n` +
                       `Balance: ${user.balance} TPC\n` +
                       `Referral Code: \`${user.referral_code}\`\n` +
                       `Member Since: ${new Date(user.created_at).toLocaleDateString('en-IN')}`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Home', 'back_main')]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async showHistory(ctx, user) {
        const transactions = await this.db.getUserTransactions(user.user_id, 5);

        let message = `📜 *Recent Orders*\n\n`;

        if (transactions.length === 0) {
            message = `📜 No orders yet`;
        } else {
            transactions.forEach(txn => {
                const game = config.GAME_PACKS[txn.game_type] || { name: 'Unknown' };
                const date = new Date(txn.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                message += `• ${game.name}\n`;
                message += `  Amount: ${txn.amount > 0 ? `₹${txn.amount}` : 'TPC'}\n`;
                message += `  Status: ${txn.status}\n`;
                message += `  Date: ${date}\n\n`;
            });
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'history'),
                Markup.button.callback('🏠 Home', 'back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async showSupport(ctx) {
        const message = `🛟 *Support*\n\n` +
                       `Contact admin for help:\n` +
                       `${config.ADMIN_USERNAME}\n\n` +
                       `Issues:\n` +
                       `• Payment problems\n` +
                       `• Delivery delays\n` +
                       `• Account issues`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.url('📞 Contact Admin', `https://t.me/${config.ADMIN_USERNAME.replace('@', '')}`)
            ],
            [
                Markup.button.callback('🏠 Home', 'back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async showEarnTPC(ctx, user) {
        const message = `💎 *Earn TPC*\n\n` +
                       `Current Balance: ${user.balance} TPC\n\n` +
                       `Ways to earn:\n` +
                       `• Watch ads: +10 TPC\n` +
                       `• Refer friends: +50 TPC\n\n` +
                       `1000 TPC = Free game package!`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('📺 Watch Ad', 'watch_ad'),
                Markup.button.callback('👥 Refer Friend', 'refer_friend')
            ],
            [
                Markup.button.callback('🏠 Home', 'back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    startAutoChecker() {
        // Check pending transactions every 30 seconds
        setInterval(async () => {
            try {
                const pendingTxns = await this.db.getPendingTransactions();
                
                for (const txn of pendingTxns) {
                    const status = await PaymentAPI.status(txn.order_id);
                    
                    if (status && status.code === 200) {
                        const result = status.result || {};
                        const stat = (result.status || 'PENDING').toUpperCase();
                        
                        if (stat === 'SUCCESS' && txn.status !== 'completed') {
                            await this.db.updateTransaction(txn.order_id, { status: 'completed' });
                            
                            // Notify user
                            const user = await this.db.getUser(txn.user_id);
                            if (user) {
                                const game = config.GAME_PACKS[txn.game_type] || { name: 'Unknown' };
                                
                                const message = `✅ *Payment Confirmed!*\n\n` +
                                               `Order ID: \`${txn.order_id}\`\n` +
                                               `Game: ${game.name}\n` +
                                               `Amount: ₹${txn.amount}\n` +
                                               `Status: PAID\n\n` +
                                               `Your order is being processed. Delivery in 5-15 minutes.`;
                                
                                await this.bot.telegram.sendMessage(user.user_id, message, { parse_mode: 'Markdown' });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Auto checker error:', error);
            }
        }, 30000); // 30 seconds
    }

    launch() {
        this.bot.launch();
        console.log('🤖 Thanks Pay Bot is running...');
        
        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

// ============ VERCEL SERVERLESS HANDLER ============
// For Vercel deployment
module.exports = async (req, res) => {
    // Only handle POST requests (Telegram webhook)
    if (req.method === 'POST') {
        try {
            const bot = new Bot();
            await bot.bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).send('Error');
        }
    } else {
        res.status(200).json({ 
            status: 'online',
            message: 'Thanks Pay Bot is running',
            timestamp: new Date().toISOString()
        });
    }
};

// ============ LOCAL DEVELOPMENT ============
// Only run locally if not in Vercel
if (process.env.NODE_ENV !== 'production' && require.main === module) {
    const bot = new Bot();
    bot.launch();
}
