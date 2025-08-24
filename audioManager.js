const {
    joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus,
    VoiceConnectionStatus, entersState, getVoiceConnection
} = require('@discordjs/voice');
const { spawn } = require('child_process');

class AudioManager {
    constructor() {
        this.connections = new Map(); // guildId -> connection
        this.players = new Map(); // guildId -> player
        this.currentStreams = new Map(); // guildId -> current stream info
        this.volume = 1; // Default volume (100%)
    }

    async joinVoiceChannel(guildId, channelId, guild) {
        try {
            console.log(`[AudioManager] Attempting to join voice channel ${channelId} in guild ${guildId}`);
            const existingConnection = getVoiceConnection(guildId);
            if (existingConnection) {
                console.log(`[AudioManager] Destroying existing connection for guild ${guildId}`);
                existingConnection.destroy();
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

            await entersState(connection, VoiceConnectionStatus.Ready, 10_000).catch(err => {
                console.error(`[AudioManager] Failed to enter ready state for guild ${guildId}:`, err);
                throw err;
            });

            this.setupPlayerListeners(guildId, player);
            console.log(`[AudioManager] Successfully joined voice channel in guild ${guildId}`);
            return { connection, player };
        } catch (error) {
            console.error(`[AudioManager] Error joining voice channel in guild ${guildId}:`, error);
            throw error;
        }
    }

    setupPlayerListeners(guildId, player) {
        player.on(AudioPlayerStatus.Idle, () => {
            const currentStream = this.currentStreams.get(guildId);
            // console.log(`[AudioManager] Player idle in guild ${guildId}. Current stream:`, currentStream);
            if (currentStream && currentStream.type === 'radio') {
                console.log(`[AudioManager] Replaying radio in guild ${guildId}`);
                this.playRadio(guildId, currentStream.url);
            } else if (currentStream && currentStream.type === 'quran') {
                // Only clear stream if not paused
                if (player.state.status !== AudioPlayerStatus.Paused) {
                    this.currentStreams.delete(guildId);
                    console.log(`[AudioManager] Quran surah ${currentStream.surahName} ended in guild ${guildId}`);
                }
            }
        });

        player.on(AudioPlayerStatus.Playing, () => {
            console.log(`[AudioManager] Audio playback started in guild ${guildId}`);
        });

        player.on(AudioPlayerStatus.Paused, () => {
            console.log(`[AudioManager] Audio paused in guild ${guildId}`);
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

    async playRadio(guildId, streamUrl) {
        try {
            const player = this.players.get(guildId);
            if (!player) throw new Error(`[AudioManager] No player found for guild ${guildId}`);

            // Enhanced FFmpeg command with Opus encoding
            const ffmpeg = spawn('ffmpeg', [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', streamUrl,
                '-analyzeduration', '0',
                '-loglevel', 'error', // Log errors only
                '-acodec', 'libopus',
                '-f', 'opus',
                '-ar', '48000',
                '-ac', '2',
                '-b:a', '128k', // Set bitrate
                'pipe:1'
            ], { stdio: ['ignore', 'pipe', 'pipe'] });

            // Log FFmpeg errors
            ffmpeg.stderr.on('data', (data) => {
                console.error(`[FFmpeg] Error in guild ${guildId}: ${data.toString()}`);
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


    async playQuran(guildId, audioUrl, surahName, reciterName) {
        try {
            const player = this.players.get(guildId);
            if (!player) throw new Error(`[AudioManager] No player found for guild ${guildId}`);

            player.stop();

            const ffmpeg = spawn('ffmpeg', [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', audioUrl,
                '-analyzeduration', '0',
                '-loglevel', 'error', // Log errors only
                '-acodec', 'libopus',
                '-f', 'opus',
                '-ar', '48000',
                '-ac', '2',
                '-b:a', '128k', // Set bitrate
                'pipe:1'
            ], { stdio: ['ignore', 'pipe', 'pipe'] });

            const resource = createAudioResource(ffmpeg.stdout, {
                inlineVolume: true
            });
            resource.volume.setVolume(this.volume);

            player.play(resource);
            this.currentStreams.set(guildId, {
                type: 'quran',
                url: audioUrl,
                surahName,
                reciterName
            });

            console.log(`[AudioManager] Playing ${surahName} by ${reciterName} in guild ${guildId}`);
            return true;
        } catch (error) {
            console.error(`[AudioManager] Error playing Quran in guild ${guildId}:`, error);
            throw error;
        }
    }

    pauseAudio(guildId) {
        try {
            const player = this.players.get(guildId);
            if (!player) {
                console.log(`[AudioManager] No player found in guild ${guildId}`);
                return false;
            }

            console.log(`[AudioManager] Attempting to pause audio in guild ${guildId}. Current state: ${player.state.status}`);
            if (player.state.status === AudioPlayerStatus.Playing) {
                player.pause();
                console.log(`[AudioManager] Audio paused in guild ${guildId}`);
                return true;
            } else {
                console.log(`[AudioManager] Cannot pause audio - player state is ${player.state.status} in guild ${guildId}`);
                return false;
            }
        } catch (error) {
            console.error(`[AudioManager] Error pausing audio in guild ${guildId}:`, error);
            return false;
        }
    }

    resumeAudio(guildId) {
        try {
            const player = this.players.get(guildId);
            if (!player) {
                console.log(`[AudioManager] No player found in guild ${guildId}`);
                return false;
            }

            console.log(`[AudioManager] Attempting to resume audio in guild ${guildId}. Current state: ${player.state.status}`);
            if (player.state.status === AudioPlayerStatus.Paused) {
                player.unpause();
                console.log(`[AudioManager] Audio resumed in guild ${guildId}`);
                return true;
            } else {
                console.log(`[AudioManager] Cannot resume audio - player state is ${player.state.status} in guild ${guildId}`);
                return false;
            }
        } catch (error) {
            console.error(`[AudioManager] Error resuming audio in guild ${guildId}:`, error);
            return false;
        }
    }

    stopAudio(guildId) {
        try {
            const player = this.players.get(guildId);
            if (!player) {
                console.log(`[AudioManager] No player found in guild ${guildId}`);
                return false;
            }

            console.log(`[AudioManager] Attempting to stop audio in guild ${guildId}. Current state: ${player.state.status}`);
            if (player.state.status === AudioPlayerStatus.Playing || player.state.status === AudioPlayerStatus.Paused) {
                player.stop();
                this.currentStreams.delete(guildId);
                console.log(`[AudioManager] Audio stopped in guild ${guildId}`);
                return true;
            } else {
                console.log(`[AudioManager] Cannot stop audio - player state is ${player.state.status} in guild ${guildId}`);
                return false;
            }
        } catch (error) {
            console.error(`[AudioManager] Error stopping audio in guild ${guildId}:`, error);
            return false;
        }
    }

    setVolume(guildId, volume) {
        try {
            this.volume = Math.max(0, Math.min(2.0, volume));
            const player = this.players.get(guildId);
            if (player && player.state.status !== AudioPlayerStatus.Idle && player.state.resource) {
                const resource = player.state.resource;
                if (resource.volume) {
                    resource.volume.setVolume(this.volume);
                    // console.log(`[AudioManager] Volume set to ${Math.round(this.volume * 100)}% in guild ${guildId}`);
                } else {
                    // console.log(`[AudioManager] No volume control available for current resource in guild ${guildId}`);
                }
            } else {
                // console.log(`[AudioManager] No active player or resource in guild ${guildId} to apply volume`);
            }

            // console.log(`[AudioManager] Volume changed to ${Math.round(this.volume * 100)}% in guild ${guildId}`);
            return true;
        } catch (error) {
            console.error(`[AudioManager] Error setting volume in guild ${guildId}:`, error);
            return false;
        }
    }

    getCurrentStream(guildId) {
        return this.currentStreams.get(guildId);
    }

    getCurrentVolume(guildId) {
        return this.volume;
    }

    hasConnection(guildId) {
        return this.connections.has(guildId);
    }

    getPlayer(guildId) {
        return this.players.get(guildId);
    }

    leaveVoiceChannel(guildId) {
        try {
            const connection = this.connections.get(guildId);
            if (connection) {
                connection.destroy();
                this.connections.delete(guildId);
                this.players.delete(guildId);
                this.currentStreams.delete(guildId);
                console.log(`[AudioManager] Left voice channel in guild ${guildId}`);
                return true;
            }
            console.log(`[AudioManager] No connection found to leave in guild ${guildId}`);
            return false;
        } catch (error) {
            console.error(`[AudioManager] Error leaving voice channel in guild ${guildId}:`, error);
            return false;
        }
    }

    getConnectionStatus(guildId) {
        const connection = this.connections.get(guildId);
        const player = this.players.get(guildId);
        const currentStream = this.currentStreams.get(guildId);

        return {
            hasConnection: !!connection,
            hasPlayer: !!player,
            currentStream: currentStream,
            volume: this.volume,
            playerStatus: player ? player.state.status : null
        };
    }

    getPlayerStatus(guildId) {
        const player = this.players.get(guildId);
        return player ? player.state.status : null;
    }

    getDetailedStreamInfo(guildId) {
        const currentStream = this.currentStreams.get(guildId);
        const player = this.players.get(guildId);
        const connection = this.connections.get(guildId);

        if (!currentStream) {
            return {
                isPlaying: false,
                message: 'No stream currently playing'
            };
        }

        const playerStatus = player ? player.state.status : null;
        let statusText = 'غير معروف';
        let statusEmoji = '❓';

        if (playerStatus === 'playing') {
            statusText = 'مشغل';
            statusEmoji = '▶️';
        } else if (playerStatus === 'paused') {
            statusText = 'متوقف مؤقتاً';
            statusEmoji = '⏸️';
        } else if (playerStatus === 'idle') {
            statusText = 'متوقف';
            statusEmoji = '⏹️';
        }

        return {
            isPlaying: true,
            type: currentStream.type,
            status: statusText,
            statusEmoji: statusEmoji,
            volume: this.volume,
            hasConnection: !!connection,
            streamInfo: currentStream
        };
    }
}

const audioManager = new AudioManager();
module.exports = audioManager;