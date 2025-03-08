require('dotenv').config();
const mineflayer = require('mineflayer');

// Debugging: Print connection details
console.log("Connecting to:", process.env.MINECRAFT_SERVER, process.env.MINECRAFT_PORT);
console.log("Username:", process.env.MINECRAFT_USERNAME);
console.log("Auth Type:", process.env.AUTH_TYPE);

const bot = mineflayer.createBot({
    host: process.env.MINECRAFT_SERVER,
    port: parseInt(process.env.MINECRAFT_PORT),
    username: process.env.MINECRAFT_USERNAME,
    auth: process.env.AUTH_TYPE === "microsoft" ? "microsoft" : "offline",
    password: process.env.AUTH_TYPE === "microsoft" ? process.env.MINECRAFT_PASSWORD : undefined,
    version: "1.21.4"  // 🔴 Replace with your actual Minecraft server version!
});

bot.on('login', () => {
    console.log(`✅ Logged in as ${bot.username}`);
});

bot.on('end', () => {
    console.log("❌ Bot disconnected. Reconnecting in 5 seconds...");
    setTimeout(() => process.exit(1), 5000);
});

bot.on('kicked', (reason) => console.log(`⚠️ Kicked: ${reason}`));
bot.on('error', (err) => console.log(`❗ Error:`, err));

bot.on('spawn', () => {
    bot.chat("Hello! I am now online. 🎮");
});

bot.on('chat', (username, message) => {
    if (username === bot.username) return; // Ignore bot's own messages

    if (message === "hi") {
        bot.chat(`Hello ${username}! 👋`);
    }
    
    if (message === "follow me") {
        const target = bot.players[username]?.entity;
        if (!target) {
            bot.chat("I can't see you! 🫣");
            return;
        }

        bot.chat("Following you...");
        bot.pathfinder.setGoal(new GoalFollow(target, 3));
    }
});

bot.on('end', () => {
    console.log("❌ Bot disconnected. Reconnecting in 5 seconds...");
    setTimeout(() => {
        process.exit(1); // Restart bot
    }, 5000);
});

function antiAFK() {
    setInterval(() => {
        const actions = [
            () => bot.setControlState('jump', true),   // Jump
            () => bot.setControlState('jump', false),
            () => bot.look(Math.random() * Math.PI, 0), // Random head movement
            () => bot.chat("I'm not AFK! 🏃‍♂️"), // Send a chat message
            () => bot.setControlState('forward', true), // Walk forward
            () => setTimeout(() => bot.setControlState('forward', false), 1000) // Stop after 1 sec
        ];

        const action = actions[Math.floor(Math.random() * actions.length)];
        action(); // Perform a random action
    }, 30 * 1000); // Every 30 seconds
}

// Start Anti-AFK when the bot spawns
bot.on('spawn', () => {
    console.log("✅ Anti-AFK started!");
    antiAFK();
});

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalBlock } = require('mineflayer-pathfinder').goals;
bot.loadPlugin(pathfinder);

const mcData = require('minecraft-data')(bot.version);

async function startFishing() {
    if (!bot.heldItem || bot.heldItem.name !== 'fishing_rod') {
        const rod = bot.inventory.items().find(item => item.name.includes('fishing_rod'));
        if (!rod) {
            bot.chat("I don't have a fishing rod! 🎣");
            return;
        }
        await bot.equip(rod, 'hand');
    }

    bot.chat("🎣 Starting auto-fishing...");
    bot.fish();
}

bot.on('chat', (username, message) => {
    if (message === "fish") {
        startFishing();
    }
});

bot.on('playerCollect', (collector, item) => {
    if (collector === bot.entity) {
        bot.chat("✅ Got a fish!");
        setTimeout(startFishing, 2000); // Start fishing again
    }
});

const mineflayerViewer = require('prismarine-viewer').mineflayer;

bot.once('spawn', () => {
    mineflayerViewer(bot, { port: 3000, firstPerson: true }); // View bot online at localhost:3000
});

async function mineBlock(name) {
    const block = bot.findBlock({
        matching: mcData.blocksByName[name].id,
        maxDistance: 32
    });

    if (!block) {
        bot.chat("I can't find any " + name);
        return;
    }

    bot.chat("⛏️ Mining " + name);
    await bot.dig(block);
}

bot.on('chat', (username, message) => {
    if (message.startsWith("mine ")) {
        const blockName = message.split(" ")[1];
        mineBlock(blockName);
    }
});

function attackMob() {
    const mob = bot.nearestEntity(entity => 
        entity.type === 'hostile' && (entity.name === 'zombie' || entity.name === 'skeleton')
    );

    if (!mob) {
        bot.chat("No mobs nearby! 🧟‍♂️");
        return;
    }

    bot.chat("⚔️ Attacking " + mob.name);
    bot.attack(mob);
}

bot.on('chat', (username, message) => {
    if (message === "attack") {
        attackMob();
    }
});
