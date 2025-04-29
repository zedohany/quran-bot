const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;// Replace with your new token after resetting
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID; // ID of the voice or Stage channel
const STREAM_URL = 'https://stream.radiojar.com/8s5u5tpdtwzuv'; // Stream URL

let currentVolume = 1; // Default volume level (100%)
let player; // Variable to store the audio player
let resource; // Variable to store the audio resource
let connection; // Variable to store the voice connection

// Function to reconnect to the channel
async function reconnect(channel) {
    console.log('⏳ Attempting to reconnect to the channel...');
    let retries = 5;

    while (retries > 0) {
        try {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false,
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
            console.log('✅ Successfully reconnected!');

            // If the channel is a Stage channel, set the bot as a Speaker directly
            if (channel.type === 13) { // 13 = Stage Channel
                const botMember = channel.guild.members.me;
                // Check for Manage Channels permission
                const hasManageChannels = channel.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels);
                if (!hasManageChannels) {
                    console.warn('⚠️ The bot lacks Manage Channels permission. It may not be able to speak directly.');
                }
                // Set the bot as a Speaker
                await botMember.voice.setSuppressed(false).catch(err => {
                    console.error('❌ Failed to set the bot as a Speaker:', err);
                });
                console.log('🎤 The bot has been set as a Speaker in the Stage channel.');
            }

            setupAudioPlayer(connection); // Set up the audio player after connecting
            return true;
        } catch (error) {
            console.error('❌ Reconnection failed:', error);
            retries--;
            if (retries > 0) {
                console.log(`⏳ Attempting to reconnect again... (${retries} retries remaining)`);
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay
            }
        }
    }

    console.error('❌ Reconnection failed after multiple attempts. Retrying later...');
    setTimeout(() => reconnect(channel), 10000); // Retry after 10 seconds
    return false;
}

// Function to set up the audio player and stream
function setupAudioPlayer(connection) {
    player = createAudioPlayer();
    resource = createAudioResource(STREAM_URL, { inlineVolume: true });
    resource.volume.setVolume(currentVolume); // Set the volume level
    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        console.log('🔁 Restarting the stream...');
        resource = createAudioResource(STREAM_URL, { inlineVolume: true });
        resource.volume.setVolume(currentVolume);
        player.play(resource);
    });

    player.on('error', (error) => {
        console.error('❌ Error playing the stream:', error);
        setTimeout(() => {
            console.log('🔁 Attempting to restart the stream...');
            resource = createAudioResource(STREAM_URL, { inlineVolume: true });
            resource.volume.setVolume(currentVolume);
            player.play(resource);
        }, 5000);
    });
}

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
    if (!channel || (channel.type !== 2 && channel.type !== 13)) {
        console.error('❌ The channel is not a voice or Stage channel.');
        return;
    }

    connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log('❌ The bot was disconnected from the channel. Attempting to reconnect...');
        await reconnect(channel);
    });

    connection.on(VoiceConnectionStatus.Ready, async () => {
        console.log('🔊 Successfully connected to the voice channel!');
        // If the channel is a Stage channel, set the bot as a Speaker directly
        if (channel.type === 13) {
            const botMember = channel.guild.members.me;
            // Check for Manage Channels permission
            const hasManageChannels = channel.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels);
            if (!hasManageChannels) {
                console.warn('⚠️ The bot lacks Manage Channels permission. It may not be able to speak directly.');
            }
            // Set the bot as a Speaker
            await botMember.voice.setSuppressed(false).catch(err => {
                console.error('❌ Failed to set the bot as a Speaker:', err);
            });
            console.log('🎤 The bot has been set as a Speaker in the Stage channel.');
        }
        setupAudioPlayer(connection);
    });

    connection.on('error', (error) => {
        console.error('❌ Connection error:', error);
    });
});

// Volume control commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Command to increase volume
    if (message.content.toLowerCase() === '!vup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You need Administrator permissions to increase the volume.');
        }

        if (currentVolume < 1.9) {
            currentVolume += 0.1;
            if (resource && resource.volume) {
                resource.volume.setVolume(currentVolume);
                message.reply(`🔊 Volume increased by 10%. Current level: ${(currentVolume * 100).toFixed(0)}%`);
            } else {
                message.reply('❌ The stream is not currently available.');
            }
        } else {
            message.reply('❌ The volume has reached the maximum limit.');
        }
    }

    // Command to decrease volume
    if (message.content.toLowerCase() === '!vdown') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You need Administrator permissions to decrease the volume.');
        }

        if (currentVolume > 0.1) {
            currentVolume -= 0.1;
            if (resource && resource.volume) {
                resource.volume.setVolume(currentVolume);
                message.reply(`🔉 Volume decreased by 10%. Current level: ${(currentVolume * 100).toFixed(0)}%`);
            } else {
                message.reply('❌ The stream is not currently available.');
            }
        } else {
            message.reply('❌ The volume has reached the minimum limit.');
        }
    }

    // Command to set volume directly
    if (message.content.toLowerCase().startsWith('v')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You need Administrator permissions to set the volume.');
        }

        const args = message.content.split(' ');
        if (args.length < 2) {
            return message.reply('❌ Please specify a volume percentage (e.g., v 50).');
        }

        const volumePercent = parseInt(args[1]);
        if (isNaN(volumePercent) || volumePercent < 10 || volumePercent > 190) {
            return message.reply('❌ Please enter a percentage between 10 and 190.');
        }

        currentVolume = volumePercent / 100;
        if (resource && resource.volume) {
            resource.volume.setVolume(currentVolume);
            message.reply(`🔊 Volume set to ${(currentVolume * 100).toFixed(0)}%`);
        } else {
            message.reply('❌ The stream is not currently available.');
        }
    }
});

client.login(TOKEN);