const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Choose a voice channel for the bot to join 24/7')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Only admins can use this
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Voice Channel')
                .setRequired(true)
                .addChannelTypes(2, 13) // 2: Voice Channel, 13: Stage Channel
        ),


    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        if (channel.type !== 2 && channel.type !== 13) {
            return interaction.reply({ content: '❌ Please select a valid Voice or Stage channel.', flags: MessageFlags.Ephemeral });
        }

        try {
            await Guild.upsert({
                guildId: interaction.guildId,
                voiceChannelId: channel.id,
                lang: 'ar',
                name: interaction.guild.name,
                icon: interaction.guild.iconURL(),
                ownerId: interaction.guild.ownerId,
                botinserver: true
            });

            await interaction.reply({ content: `✅ Bot will join the channel: ${channel.name}`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Failed to save voice channel to DB:', error);
            await interaction.reply({ content: '❌ Failed to save the channel in database.', flags: MessageFlags.Ephemeral });
        }
    }
}
