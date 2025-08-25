const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const { spawn } = require('child_process');
const { PermissionsBitField } = require('discord.js');

class AudioManager {
    constructor() {
        this.connections = new Map();
        this.players = new Map();
        this.currentStreams = new Map();
        this.volume = 1;
    }

    async retryJoinVoiceChannel(guildId, channelId, guild, maxRetries = 3) {
        let attempts = 0;
        while (attempts < maxRetries) {
            try {
                return await this.joinVoiceChannel(guildId, channelId, guild);
            } catch (error) {
                attempts++;
                console.error(`[AudioManager] Attempt ${attempts}/${maxRetries} failed for guild ${guildId}:`, error);
                if (attempts === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async joinVoiceChannel(guildId, channelId, guild) {
        try {
            console.log(`[AudioManager] Attempting to join voice channel ${channelId} in guild ${guildId}`);
            
            // Check bot permissions
            const channel = guild.channels.cache.get(channelId);
            if (!channel) throw new Error(`[AudioManager] Channel ${channelId} not found in guild ${guildId}`);
            const permissions = channel.permissionsFor(guild.members.me);
            if (!permissions.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
                throw new Error(`[AudioManager] Missing permissions to join voice channel ${channelId} in guild ${guildId}`);
            }

            const existingConnection = getVoiceConnection(guildId);
            if (existingConnection) {
                console.log(`[AudioManager] Destroying existing connection for guild ${guildId}`);
                existingConnection.destroy();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const connection = joinVoiceChannel({
                channelId: channelId,
                guildId: guildId,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
            });

            const player = createAudioPlayer();
            connection.subscribe(player);
            this.connections.set(guildId, connection);
            this.players.set(guildId, player);

            await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch(err => {
                console.error(`[AudioManager] Failed to enter ready state for guild ${guildId}:`, err);
                throw err;
            });

            this.setupPlayerListeners(guildId, player);
            this.setupConnectionListeners(guildId, connection, channelId, guild);
            console.log(`[AudioManager] Successfully joined voice channel in guild ${guildId}`);
            return { connection, player };
        } catch (error) {
            console.error(`[AudioManager] Error joining voice channel in guild ${guildId}:`, error);
            throw error;
        }
    }

    setupConnectionListeners(guildId, connection, channelId, guild) {
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log(`[AudioManager] Voice connection disconnected in guild ${guildId}. Attempting to reconnect...`);
            try {
                await entersState(connection, VoiceConnectionStatus.Connecting, 10_000);
                console.log(`[AudioManager] Reconnected successfully in guild ${guildId}`);
            } catch (error) {
                console.error(`[AudioManager] Failed to reconnect in guild ${guildId}:`, error);
                connection.destroy();
                this.connections.delete(guildId);
                this.players.delete(guildId);
                this.currentStreams.delete(guildId);
                if (channelId) {
                    await this.retryJoinVoiceChannel(guildId, channelId, guild);
                    const currentStream = this.currentStreams.get(guildId);
                    if (currentStream && currentStream.type === 'radio') {
                        await this.playRadio(guildId, currentStream.url);
                    }
                }
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log(`[AudioManager] Voice connection destroyed in guild ${guildId}`);
            this.connections.delete(guildId);
            this.players.delete(guildId);
            this.currentStreams.delete(guildId);
        });
    }

    async playRadio(guildId, streamUrl) {
        try {
            const player = this.players.get(guildId);
            if (!player) throw new Error(`[AudioManager] No player found for guild ${guildId}`);

            const ffmpeg = spawn('ffmpeg', [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', streamUrl,
                '-analyzeduration', '0',
                '-loglevel', 'error',
                '-acodec', 'libopus',
                '-f', 'opus',
                '-ar', '48000',
                '-ac', '2',
                '-b:a', '128k',
                'pipe:1'
            ], { stdio: ['ignore', 'pipe', 'pipe'] });

            ffmpeg.stderr.on('data', (data) => {
                console.error(`[FFmpeg] Error in guild ${guildId}: ${data.toString()}`);
            });

            ffmpeg.on('close', (code) => {
                console.log(`[FFmpeg] Process closed in guild ${guildId} with code ${code}`);
                if (code !== 0) {
                    console.error(`[FFmpeg] Non-zero exit code in guild ${guildId}: ${code}`);
                    const currentStream = this.currentStreams.get(guildId);
                    if (currentStream && currentStream.type === 'radio') {
                        console.log(`[AudioManager] Retrying radio in guild ${guildId} after 5 seconds`);
                        setTimeout(() => {
                            this.playRadio(guildId, currentStream.url);
                        }, 5000);
                    }
                }
            });

            const resource = createAudioResource(ffmpeg.stdout, {
                inlineVolume: true
            });
            resource.volume.setVolume(this.volume);

            player.play(resource);
            this.currentStreams.set(guildId, { type: 'radio', url: streamUrl });

            console.log(`[AudioManager] Radio started in guild ${guildId} with URL: ${streamUrl}`);
            return true;
        } catch (error) {
            console.error(`[AudioManager] Error playing radio in guild ${guildId}:`, error);
            throw error;
        }
    }

    setupPlayerListeners(guildId, player) {
        player.on(AudioPlayerStatus.Idle, () => {
            const currentStream = this.currentStreams.get(guildId);
            console.log(`[AudioManager] Player idle in guild ${guildId}. Current stream:`, currentStream);
            if (currentStream && currentStream.type === 'radio') {
                console.log(`[AudioManager] Replaying radio in guild ${guildId}`);
                const connection = this.connections.get(guildId);
                if (connection && connection.state.status === VoiceConnectionStatus.Ready) {
                    this.playRadio(guildId, currentStream.url);
                } else {
                    console.log(`[AudioManager] Connection not ready in guild ${guildId}`);
                }
            } else if (currentStream && currentStream.type === 'quran') {
                if (player.state.status !== AudioPlayerStatus.Paused) {
                    this.currentStreams.delete(guildId);
                    console.log(`[AudioManager] Quran surah ${currentStream.surahName} ended in guild ${guildId}`);
                }
            }
        });

        player.on('error', (err) => {
            console.error(`[AudioManager] Player error in guild ${guildId}:`, err);
            const currentStream = this.currentStreams.get(guildId);
            if (currentStream && currentStream.type === 'radio') {
                console.log(`[AudioManager] Retrying radio in guild ${guildId} after 5 seconds`);
                setTimeout(() => {
                    this.playRadio(guildId, currentStream.url);
                }, 5000);
            }
        });
    }
}

const audioManager = new AudioManager();
module.exports = audioManager;