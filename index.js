const {
    Client, GatewayIntentBits, PermissionsBitField
} = require('discord.js');
const voiceStateUpdateHandler = require('./events/voiceStateUpdate');
const audioManager = require('./audioManager');
require("dotenv").config();
const fs = require('fs');
const { REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

require('dotenv').config();
const { connectDB } = require('./db');

require('./models/Guild');
require('./models/User');
require('./models/Bookmark');
require('./models/Surah');
require('./models/Reciter');
require('./models/ReciterSurahLink');

const Guild = require('./models/Guild');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

let STREAM_URL = 'https://stream.radiojar.com/8s5u5tpdtwzuv'; // default stream
// let STREAM_URL = 'https://download.quranicaudio.com/quran/maher_almu3aiqly/year1440//022.mp3'; // default stream
let currentVolume = 1;

client.commands = new Map();

// Load all command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.on('voiceStateUpdate', require('./events/voiceStateUpdate'));

async function joinAndPlay(guildData, client) {
    try {
        const guild = client.guilds.cache.get(guildData.guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(guildData.voiceChannelId);
        if (!channel || channel.type !== 2) return; // 2 = voice channel

        // استخدام مدير الصوت الجديد
        await audioManager.joinVoiceChannel(guildData.guildId, channel.id, guild);
        
        // تشغيل الراديو تلقائياً
        await audioManager.playRadio(guildData.guildId, STREAM_URL);
        
        console.log(`✅ تم الانضمام وتشغيل الراديو في السيرفر ${guildData.guildId}`);
    } catch (error) {
        console.error('❌ خطأ في الانضمام وتشغيل الراديو:', error);
    }
}

// Handle command interactions
client.on('interactionCreate', async interaction => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('Command execution error:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: '❌ An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
      }
    }
    return;
  }

  // Handle other interactions (buttons, select menus, modals)
  try {
    const interactionHandler = require('./events/interactionCreate');
    await interactionHandler.execute(interaction);
  } catch (err) {
    console.error('Interaction handling error:', err);
  }
});

// Bot readiness logic
client.once('clientReady', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await connectDB();

    // Register slash commands
    const commands = [];
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log(`✅ Slash commands registered successfully: ${commands.length} command(s).`);
    } catch (error) {
        console.error('❌ Failed to register slash commands:', error);
    }

    // Join 24/7 voice channels
    try {
    const guilds = await Guild.findAll({ where: { voice24_7: true } });
    for (const guildData of guilds) {
        joinAndPlay(guildData, client);
    }
    } catch (err) {
        console.error('❌ Error joining 24/7 voice channels:', err);
    }
});

client.login(TOKEN);