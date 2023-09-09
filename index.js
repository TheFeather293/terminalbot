const mineflayer = require('mineflayer');
const { Movements, goals, pathfinder, Pathfinder } = require('mineflayer-pathfinder');
const { GoalBlock, GoalNear } = require('mineflayer-pathfinder').goals;
const Minecraft = require('minecraft-data');
const minecraftData = require('minecraft-data');
const { Vec3 } = require('vec3'); // Add this line to require the vec3 module
const v = require('vec3');



const miningTasks = [];


const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const serverIP = 'localhost'; // Minecraft server IP

let input = '';


const botUsernames = [
    "KidPoi",
    "FarVatRut",
];

const delayBetweenJoins = 2000; // Delay in milliseconds (2 seconds)

const bots = [];

const createBot = (username) => {
    const bot = mineflayer.createBot({
        host: serverIP,
        username,
        port: 25565
    });

    bot.loadPlugin(pathfinder);
    bot.on('spawn', () => {
        console.log(`Bot ${username} spawned.`);
    });

    bot.on('error', (err) => {
        console.error(`Bot ${username} encountered an error:`, err);
    });

    bot.on('end', (reason) => {
        console.log(`Bot ${bot.username} ended. Reason: ${reason}`);
        // You can add custom error handling here
    });
    return bot;
};

// Create bots with a delay between each join
botUsernames.forEach((username, index) => {
    setTimeout(() => {
        const bot = createBot(username);
        bots.push(bot);
    }, index * delayBetweenJoins);
});



//QUARRY AND CUBOID CLASS

// Cuboid class

class Cuboid {
    constructor(point1, point2) {
        this.point1 = point1;
        this.point2 = point2;
        this.xMin = Math.min(point1.x, point2.x);
        this.xMax = Math.max(point1.x, point2.x);
        this.yMin = Math.min(point1.y, point2.y);
        this.yMax = Math.max(point1.y, point2.y);
        this.zMin = Math.min(point1.z, point2.z);
        this.zMax = Math.max(point1.z, point2.z);
        this.xMinCentered = this.xMin + 0.5;
        this.xMaxCentered = this.xMax + 0.5;
        this.yMinCentered = this.yMin + 0.5;
        this.yMaxCentered = this.yMax + 0.5;
        this.zMinCentered = this.zMin + 0.5;
        this.zMaxCentered = this.zMax + 0.5;
    }

    getBlockPositions() {
        let blocks = new Array();
        for (let y = this.yMin; y <= this.yMax; ++y) {
            for (let x = this.xMin; x <= this.xMax; ++x) {
                for (let z = this.zMin; z <= this.zMax; ++z) {
                    blocks.push(v(x, y, z));
                }
            }
        }
        return blocks;
    }

    // Returns vec3
    getCenter() {
        return v((this.xMax - this.xMin) / 2 + this.xMin, (this.yMax - this.yMin) / 2 + this.yMin, (this.zMax - this.zMin) / 2 + this.zMin);
    }

    // Returns double
    getDistance() {
        return this.point1.distanceTo(this.point2);
    }

    // TODO: Use mineflayer distanceTo
    // Returns double
    getDistanceSquared() {
        return this.getPoint1().distanceSquared(this.getPoint2());
    }

    // Returns int
    getHeight() {
        return this.yMax - this.yMin + 1;
    }

    // Returns vec3
    getPoint1() {
        return this.point1;
    }

    // Returns vec3
    getPoint2() {
        return this.point2;
    }

    // Returns vec3
    getRandomLocation() {
        let distX = Math.abs(this.xMax - this.xMin);
        let x = Math.floor(Math.random() * (distX + 1)) + this.xMin;

        let distY = Math.abs(this.yMax - this.yMin);
        let y = Math.floor(Math.random() * (distY + 1)) + this.yMin;

        let distZ = Math.abs(this.zMax - this.zMin);
        let z = Math.floor(Math.random() * (distZ + 1)) + this.zMin;

        return v(x, y, z);
    }

    // Returns int
    getTotalBlockSize() {
        return this.getHeight() * this.getXWidth() * this.getZWidth();
    }

    // Returns int
    getXWidth() {
        return this.xMax - this.xMin + 1;
    }

    // Returns int
    getZWidth() {
        return this.zMax - this.zMin + 1;
    }

    // Returns boolean
    posIsIn(loc) {
        return loc.x >= this.xMin && loc.x <= this.xMax && loc.y >= this.yMin && loc.y <= this.yMax && loc.z >= this.zMin && loc.z <= this.zMax;
    }

    // Returns boolean
    entityIsIn(entity) {
        if (!entity.position) return false;
        return this.posIsIn(entity.position);
    }

    // Returns boolean
    isInWithMarge(loc, marge) {
        return loc.x >= this.xMinCentered - marge && loc.x <= this.xMaxCentered + marge && loc.y >= this.yMinCentered - marge && loc.y <= this.yMaxCentered + marge && loc.z >= this.zMinCentered - marge && loc.z <= this.zMaxCentered + marge;
    }
}

const BLACKLISTED_BLOCKS = ['minecraft:bedrock', 'minecraft:air', 'minecraft:lava', 'minecraft:water'];

class QuarryBot {
    constructor(bot) {
        this.bot = bot;
        this.isMining = false; // Add a flag to track mining status
    }

    async mineQuarry(x1, y1, z1, x2, y2, z2) {
        const mcData = require('minecraft-data')(this.bot.version);
        const defaultMove = new Movements(this.bot, mcData);
        const cuboid = new Cuboid(v(x1, y1, z1), v(x2, y2, z2));
        const targetBlocks = cuboid.getBlockPositions().sort((a, b) => b.y - a.y);

        for (const targetBlock of targetBlocks) {
            const block = this.bot.blockAt(targetBlock);

            // Check if the bot should mine this block and if it's not already mining
            if (block && this.bot.canDigBlock(block) && !BLACKLISTED_BLOCKS.includes(block.name) && !this.isMining) {
                try {
                    this.isMining = true; // Set mining flag to true
                    await this.bot.dig(block);
                    console.log(`Bot ${this.bot.username} mined block at (${targetBlock.x}, ${targetBlock.y}, ${targetBlock.z}).`);
                } catch (err) {
                    console.error(`Error mining block at (${targetBlock.x}, ${targetBlock.y}, ${targetBlock.z}): ${err}`);
                } finally {
                    this.isMining = false; // Set mining flag to false after mining
                }
            } else {
                // If the block is unreachable, use pathfinding to get closer to it
                const botPosition = this.bot.entity.position;
                const goal = new goals.GoalNear(targetBlock.x, targetBlock.y, targetBlock.z, 1);

                this.bot.pathfinder.setMovements(defaultMove);

                // Check if the bot is already moving to a goal
                if (!this.bot.pathfinder.isMoving()) {
                    this.bot.pathfinder.setGoal(goal);

                    const pathfinderResult = await this.bot.pathfinder.goto(goal);

                    if (pathfinderResult && pathfinderResult.status === 'arrived') {
                        // If the bot arrived at the goal, try to mine again
                        try {
                            const newBlock = this.bot.blockAt(targetBlock);
                            if (newBlock && this.bot.canDigBlock(newBlock) && !BLACKLISTED_BLOCKS.includes(newBlock.name) && !this.isMining) {
                                this.isMining = true; // Set mining flag to true
                                await this.bot.dig(newBlock);
                                console.log(`Bot ${this.bot.username} mined block at (${targetBlock.x}, ${targetBlock.y}, ${targetBlock.z}).`);
                            }
                        } catch (err) {
                            console.error(`Error mining block at (${targetBlock.x}, ${targetBlock.y}, ${targetBlock.z}): ${err}`);
                        } finally {
                            this.isMining = false; // Set mining flag to false after mining
                        }
                    } else {
                        console.log(`Bot ${this.bot.username} couldn't reach block at (${targetBlock.x}, ${targetBlock.y}, ${targetBlock.z}).`);
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500)); // Delay before mining the next block
        }

        // Stop the bot from swinging its pickaxe after mining
        this.bot.setControlState('sprint', false);
        this.bot.setControlState('forward', false);
        this.bot.clearControlStates();

        console.log(`Bot ${this.bot.username} finished mining the quarry.`);
    }
}


// Command handler for the /quarry command
async function handleQuarryCommand(botNames, x1, y1, z1, x2, y2, z2) {
    const botNamesArray = botNames.split(';');
    for (const botName of botNamesArray) {
      if (botName.toLowerCase() === 'all') {
        // Mine quarry for all bots
        for (const bot of bots) {
          const quarryBot = new QuarryBot(bot);
          await quarryBot.mineQuarry(x1, y1, z1, x2, y2, z2);
        }
      } else {
        const bot = bots.find((bot) => bot.username === botName);
        if (bot) {
          // Mine quarry for the specified bot
          const quarryBot = new QuarryBot(bot);
          await quarryBot.mineQuarry(x1, y1, z1, x2, y2, z2);
        } else {
          console.log(`Bot ${botName} not found.`);
        }
      }
    }
  }

// Function to handle the /follow command for selected bots or all bots
const handleFollowCommandForSelected = (botNames, usernameToFollow) => {
    const botNamesArray = botNames.split(';');
    botNamesArray.forEach((botName) => {
        if (botName.toLowerCase() === 'all') {
            bots.forEach((bot) => {
                const player = bot.players[usernameToFollow];
                if (usernameToFollow === bot.username) return;
                const target = player ? player.entity : null;

                if (target) {
                    bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
                } else {
                    console.log(`Player ${usernameToFollow} not found for Bot ${bot.username}.`);
                }
            });
        } else {
            const bot = bots.find((bot) => bot.username === botName);
            if (bot) {
                const player = bot.players[usernameToFollow];
                if (usernameToFollow === bot.username) return;
                const target = player ? player.entity : null;

                if (target) {
                    bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
                } else {
                    console.log(`Player ${usernameToFollow} not found for Bot ${bot.username}.`);
                }
            } else {
                console.log(`Bot ${botName} not found.`);
            }
        }
    });
};

// Function to handle the /stopfollow command for selected bots or all bots
const handleStopFollowCommandForSelected = (botNames) => {
    const botNamesArray = botNames.split(';');
    botNamesArray.forEach((botName) => {
        if (botName.toLowerCase() === 'all') {
            bots.forEach((bot) => {
                disablePathfinding(bot);
                console.log(`Bot ${bot.username} stopped following.`);
            });
        } else {
            const bot = bots.find((bot) => bot.username === botName);
            if (bot) {
                disablePathfinding(bot);
                console.log(`Bot ${bot.username} stopped following.`);
            } else {
                console.log(`Bot ${botName} not found.`);
            }
        }
    });
};

// Function to disable pathfinding for a bot
const disablePathfinding = (bot) => {
    bot.pathfinder.setGoal(null);
    bot.off('path_update', onPathUpdate); // Remove the path_update event listener
    bot.off('goal_reached', onGoalReached); // Remove the goal_reached event listener
    console.log(`Pathfinding disabled for Bot ${bot.username}.`);
};

// Define onPathUpdate and onGoalReached functions
const onPathUpdate = (results) => {
    // Handle path updates if needed
};

const onGoalReached = () => {
    // Handle goal reached event if needed
};


// Function to handle the /activateitem command for selected bots or all bots
const handleActivateItemCommand = (botNames) => {
    const botNamesArray = botNames.split(';');
    botNamesArray.forEach((botName) => {
        if (botName.toLowerCase() === 'all') {
            bots.forEach((bot) => {
                bot.activateItem();
                console.log(`Activated held item by Bot ${bot.username}.`); // Log the activation
            });
        } else {
            const bot = bots.find((bot) => bot.username === botName);
            if (bot) {
                bot.activateItem();
                console.log(`Activated held item by Bot ${bot.username}.`); // Log the activation
            } else {
                console.log(`Bot ${botName} not found.`);
            }
        }
    });
};

// Function to handle the /chat command for selected bots or all bots
const handleChatCommand = (botNames, message) => {
    const botNamesArray = botNames.split(';');
    botNamesArray.forEach((botName) => {
        if (botName.toLowerCase() === 'all') {
            bots.forEach((bot) => {
                sendChatMessage(bot, message);
            });
        } else {
            const bot = bots.find((bot) => bot.username === botName);
            if (bot) {
                sendChatMessage(bot, message);
            } else {
                console.log(`Bot ${botName} not found.`);
            }
        }
    });
};

// Function to send a chat message
const sendChatMessage = (bot, message) => {
    bot.chat(message);
};

// Function to display help information
const displayHelp = () => {
    console.log("Available commands:");
    console.log("/quarry <bot/all> <x1> <y1> <z1> <x2> <y2> <z2> - Mine a quarry");
    console.log("/follow <bot/all> <username> - Make bot(s) follow a player");
    console.log("/stopfollow <bot/all> - Stop bot(s) from following");
    console.log("/activateitem <bot/all> - Activate held item");
    console.log("/chat <bot/all> <message> - Send a chat message");
    console.log("/clickwindow <bot/all> <slot> <clickType> - Click a window slot");
    console.log("/restart <bot/all> - Restart bot(s)");
    console.log("/sethotbar <botName> <slot> - Set hotbar slot for a bot");
    console.log("/chaton <bot/all> - Enable chat messages for bot(s)");
    console.log("/chatoff <bot/all> - Disable chat messages for bot(s)");
    console.log("/help - Display this help message");
};


// Function to handle the /clickwindow command for selected bots or all bots
const handleClickWindowCommand = (botNames, slot, clickType) => {
    const botNamesArray = botNames.split(';');
    botNamesArray.forEach((botName) => {
        if (botName.toLowerCase() === 'all') {
            bots.forEach((bot) => {
                handleClickWindow(bot, slot, clickType, botName); // Pass botName to log which bot initiated the command
            });
        } else {
            const bot = bots.find((bot) => bot.username === botName);
            if (bot) {
                handleClickWindow(bot, slot, clickType, botName); // Pass botName to log which bot initiated the command
            } else {
                console.log(`Bot ${botName} not found.`);
            }
        }
    });
};


// Handle the /drop and /dropall commands
if (input.startsWith('/drop ')) {
    const inputParts = input.split(' ');
    const botNames = inputParts[1];
    const slot = parseInt(inputParts[inputParts.length - 1], 10);

    if (isNaN(slot)) {
        console.log(`Invalid slot. Please provide a valid slot number.`);
    } else {
        handleDropCommand(botNames, slot);
    }
} else if (input.startsWith('/dropall ')) {
    const botNames = input.split(' ')[1];
    handleDropAllCommand(botNames);
}



// Function to handle the actual clickWindow action
const handleClickWindow = (bot, slot, clickType, botName) => {
    if (clickType === 0) {
        bot.simpleClick.leftMouse(slot);
        console.log(`Bot ${botName} initiated left click at slot ${slot}.`); // Log the click
    } else if (clickType === 1) {
        bot.simpleClick.rightMouse(slot);
        console.log(`Bot ${botName} initiated right click at slot ${slot}.`); // Log the click
    } else {
        console.log(`Invalid clickType ${clickType}. Use 0 for left click or 1 for right click.`);
    }
};

// Function to handle the /chaton and /chatoff commands
const handleChatToggleCommand = (botNames, enableChat) => {
    if (!botNames) {
        console.log("Bot names not specified.");
        return;
    }

    const botNamesArray = botNames.split(';');
    botNamesArray.forEach((botName) => {
        if (botName.toLowerCase() === 'all') {
            bots.forEach((bot) => {
                enableChat ? enableChatMessages(bot) : disableChatMessages(bot);
            });
        } else {
            const bot = bots.find((bot) => bot.username === botName);
            if (bot) {
                enableChat ? enableChatMessages(bot) : disableChatMessages(bot);
            } else {
                console.log(`Bot ${botName} not found.`);
            }
        }
    });
};

// Function to enable chat messages for a bot
const enableChatMessages = (bot) => {
    if (!bot.chatEnabled) {
        bot.chatEnabled = true;
        bot.on('message', (message) => {
            console.log(`[${bot.username}] ${message.toString()}`);
        });
        console.log(`Chat messages enabled for Bot ${bot.username}.`);
    }
};

// Function to disable chat messages for a bot
const disableChatMessages = (bot) => {
    if (bot.chatEnabled) {
        bot.chatEnabled = false;
        bot.removeAllListeners('message'); // Remove the message event listener
        console.log(`Chat messages disabled for Bot ${bot.username}.`);
    }
};

// Function to handle the /sethotbar command for selected bots
const handleSetHotbarCommand = (botName, slot) => {
    const bot = bots.find((bot) => bot.username === botName);
    if (bot) {
        setHotbarSlot(bot, slot);
    } else {
        console.log(`Bot ${botName} not found.`);
    }
};

// Function to set an item in the hotbar
const setHotbarSlot = (bot, slot) => {
    if (slot >= 0 && slot <= 8) {
        // Ensure the slot is within the hotbar range (0-8)
        bot.setQuickBarSlot(slot);
        console.log(`Set hotbar slot ${slot} for Bot ${bot.username}.`);
    } else {
        console.log(`Invalid slot number. Use a slot number between 0 and 8.`);
    }
};

// Function to handle the /restart command for selected bots or all bots
const handleRestartCommand = (botNames) => {
    const botNamesArray = botNames.split(';');
    botNamesArray.forEach((botName) => {
        if (botName.toLowerCase() === 'all') {
            bots.forEach((bot) => {
                handleRestart(bot);
            });
        } else {
            const bot = bots.find((bot) => bot.username === botName);
            if (bot) {
                handleRestart(bot);
            } else {
                console.log(`Bot ${botName} not found.`);
            }
        }
    });
};


// Handle the /quarry command
if (input.startsWith('/quarry ')) {
    const inputParts = input.split(' ');
    const botNames = inputParts[1]; // Extract the botNames from inputParts[1]

    if (botNames.toLowerCase() === 'all') {
        const x1 = parseInt(inputParts[2], 10);
        const y1 = parseInt(inputParts[3], 10);
        const z1 = parseInt(inputParts[4], 10);
        const x2 = parseInt(inputParts[5], 10);
        const y2 = parseInt(inputParts[6], 10);
        const z2 = parseInt(inputParts[7], 10);

        if (
            !isNaN(x1) && !isNaN(y1) && !isNaN(z1) &&
            !isNaN(x2) && !isNaN(y2) && !isNaN(z2)
        ) {
            bots.forEach((bot) => {
                mineQuarry(bot, x1, y1, z1, x2, y2, z2);
            });
        } else {
            console.log('Invalid coordinates. Usage: /quarry (bot/all) x1 y1 z1 x2 y2 z2');
        }
    } else {
        const bot = bots.find((bot) => bot.username === botNames);

        if (bot) {
            const x1 = parseInt(inputParts[2], 10);
            const y1 = parseInt(inputParts[3], 10);
            const z1 = parseInt(inputParts[4], 10);
            const x2 = parseInt(inputParts[5], 10);
            const y2 = parseInt(inputParts[6], 10);
            const z2 = parseInt(inputParts[7], 10);

            if (
                !isNaN(x1) && !isNaN(y1) && !isNaN(z1) &&
                !isNaN(x2) && !isNaN(y2) && !isNaN(z2)
            ) {
                mineQuarry(bot, x1, y1, z1, x2, y2, z2);
            } else {
                console.log('Invalid coordinates. Usage: /quarry (bot/all) x1 y1 z1 x2 y2 z2');
            }
        } else {
            console.log(`Bot ${botNames} not found.`);
        }
    }
}

// Function to handle the actual bot restart action
const handleRestart = (bot) => {
    // Implement your bot restart logic here
    // You may need to disconnect and create a new bot instance
    // based on your specific requirements
    bot.end('Restarting...');
    setTimeout(() => {
        const newBot = createBot(bot.username);
        bots[bots.indexOf(bot)] = newBot;
    }, delayBetweenJoins);
};

bots.forEach((bot) => {
    bot.on('message', (message) => {
        console.log(`[${bot.username}] ${message.toString()}`);
    });
});

// Listen for console input to control bots
rl.setPrompt('Enter a command: ');
rl.prompt();

rl.on('line', (line) => {
    input = line.trim();

    // Handle commands here

    // Check for /activateitem command
    if (input.startsWith('/activateitem ')) {
        const inputParts = input.split(' ');
        const botNames = inputParts[1];
        handleActivateItemCommand(botNames);
    }

    // Check for /follow command
    if (input.startsWith('/follow ')) {
        const inputParts = input.split(' ');
        const botNames = inputParts[1];
        const usernameToFollow = inputParts[2];
        handleFollowCommandForSelected(botNames, usernameToFollow);
    }

// Check for /chat command
if (input.startsWith('/chat ')) {
    const inputParts = input.split(' ');
    const botNames = inputParts[1];
    const message = inputParts.slice(2).join(' ');
    handleChatCommand(botNames, message); // Change to handleChatCommand
}

    // Check for /clickwindow command
    if (input.startsWith('/clickwindow ')) {
        const inputParts = input.split(' ');
        const botNames = inputParts[1];
        const slot = parseInt(inputParts[2], 10);
        const clickType = parseInt(inputParts[3], 10);
        handleClickWindowCommand(botNames, slot, clickType);
    }

    // Check for /restart command
    if (input.startsWith('/restart ')) {
        const inputParts = input.split(' ');
        const botNames = inputParts[1];
        handleRestartCommand(botNames);
    }

// Check for /stopfollow command
if (input.startsWith('/stopfollow ')) {
    const inputParts = input.split(' ');
    const botNames = inputParts[1];
    handleStopFollowCommandForSelected(botNames);
}



// Check for the /chaton and /chatoff commands
    if (input.startsWith('/chaton')) {
        const botNames = input.split(' ')[1];
        handleChatToggleCommand(botNames, true);
    }

    if (input.startsWith('/chatoff')) {
        const botNames = input.split(' ')[1];
        handleChatToggleCommand(botNames, false);
    }


// Check for /quarry command
if (input.startsWith('/quarry ')) {
    const inputParts = input.split(' ');
    const botNames = inputParts[1]; // Extract the botNames from inputParts[1]

    if (botNames.toLowerCase() === 'all') {
        const x1 = parseInt(inputParts[2], 10);
        const y1 = parseInt(inputParts[3], 10);
        const z1 = parseInt(inputParts[4], 10);
        const x2 = parseInt(inputParts[5], 10);
        const y2 = parseInt(inputParts[6], 10);
        const z2 = parseInt(inputParts[7], 10);

        if (
            !isNaN(x1) && !isNaN(y1) && !isNaN(z1) &&
            !isNaN(x2) && !isNaN(y2) && !isNaN(z2)
        ) {
            handleQuarryCommand(botNames, x1, y1, z1, x2, y2, z2); // Call the correct function
        } else {
            console.log('Invalid coordinates. Usage: /quarry (bot/all) x1 y1 z1 x2 y2 z2');
        }
    } else {
        const bot = bots.find((bot) => bot.username === botNames);

        if (bot) {
            const x1 = parseInt(inputParts[2], 10);
            const y1 = parseInt(inputParts[3], 10);
            const z1 = parseInt(inputParts[4], 10);
            const x2 = parseInt(inputParts[5], 10);
            const y2 = parseInt(inputParts[6], 10);
            const z2 = parseInt(inputParts[7], 10);

            if (
                !isNaN(x1) && !isNaN(y1) && !isNaN(z1) &&
                !isNaN(x2) && !isNaN(y2) && !isNaN(z2)
            ) {
                handleQuarryCommand(botNames, x1, y1, z1, x2, y2, z2); // Call the correct function
            } else {
                console.log('Invalid coordinates. Usage: /quarry (bot/all) x1 y1 z1 x2 y2 z2');
            }
        } else {
            console.log(`Bot ${botNames} not found.`);
        }
    }
}


// Handle the /help command
if (input.startsWith('/help')) {
    displayHelp();
}

    // Check for /sethotbar command
    if (input.startsWith('/sethotbar ')) {
        const inputParts = input.split(' ');
        const botName = inputParts[1];
        const slot = parseInt(inputParts[2], 10);

        if (isNaN(slot)) {
            console.log(`Invalid slot. Please provide a valid slot number.`);
        } else {
            handleSetHotbarCommand(botName, slot);
        }
    }

    rl.prompt();
});
