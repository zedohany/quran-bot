const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const Guild = require('../models/Guild');

const STREAM_URL = 'https://stream.radiojar.com/8s5u5tpdtwzuv';
let currentVolume = 1;

// Function to join voice channel and start streaming
function joinAndStream(guild, channelId) {
  const newConnection = joinVoiceChannel({
    channelId: channelId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true
  });

  const player = createAudioPlayer();
  const resource = createAudioResource(STREAM_URL, { inlineVolume: true });
  resource.volume.setVolume(currentVolume);
  player.play(resource);
  newConnection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    const newResource = createAudioResource(STREAM_URL, { inlineVolume: true });
    newResource.volume.setVolume(currentVolume);
    player.play(newResource);
  });

  player.on('error', (error) => {
    console.error('Stream error:', error);
  });

  return newConnection;
}

module.exports = async (oldState, newState) => {
  // Handle bot being kicked from voice channel
  if (oldState.member.user.bot && oldState.channelId && !newState.channelId) {
    const guildData = await Guild.findOne({ where: { guildId: oldState.guild.id } });
    if (!guildData) return;

    // Only rejoin if 24/7 mode is enabled
    if (guildData.voice24_7 == false) return;

    const channel = oldState.guild.channels.cache.get(guildData.voiceChannelId);
    if (!channel) return;

    const humanMembers = channel.members.filter(member => !member.user.bot);
    
    // If there are still human members in the channel, rejoin
    if (humanMembers.size > 0) {
      // console.log(`Bot was kicked from voice channel. Rejoining due to ${humanMembers.size} human members present and 24/7 mode enabled.`);
      
      // Wait a bit before rejoining to avoid rate limits
      setTimeout(() => {
        try {
          joinAndStream(oldState.guild, guildData.voiceChannelId);
        } catch (error) {
          console.error('Error rejoining voice channel:', error);
        }
      }, 1000);
    }
    return;
  }

  // Handle normal voice state updates (non-bot users)
  if (!newState.channelId && !oldState.channelId) return;
  if (newState.member.user.bot) return;

  const guildData = await Guild.findOne({ where: { guildId: newState.guild.id } });
  if (!guildData) return;

  const channel = newState.guild.channels.cache.get(guildData.voiceChannelId);
  if (!channel) return;

  const connection = getVoiceConnection(newState.guild.id);

  const humanMembers = channel.members.filter(member => !member.user.bot);
  if (humanMembers.size > 0 && !connection) {
    // Always join when someone enters, regardless of 24/7 mode
    joinAndStream(newState.guild, guildData.voiceChannelId);
  }

  if (guildData.voice24_7 == false) {
    if (humanMembers.size === 0 && connection) {
      connection.destroy();
    }
  }
};