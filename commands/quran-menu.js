const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quran-menu')
        .setDescription('القائمة الرئيسية للقرآن الكريم'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🕌 Quran Bot Menu')
            .setDescription('مرحباً بك في البوت الإسلامي! اختر ما تريد من القائمة أدناه:')
            .setColor('#00ff00')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/6565/6565365.png')
            .addFields(
                { name: '📻 إذاعة القرآن الكريم', value: 'استمع إلى إذاعة القرآن الكريم مباشرة', inline: true },
                { name: '📖 سور القرآن الكريم', value: 'اختر السورة والقارئ لعرض سورة من القرآن', inline: true }
            )
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quran_radio')
                    .setLabel('إذاعة القرآن')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📻'),
                new ButtonBuilder()
                    .setCustomId('quran_surah')
                    .setLabel('القرآن الكريم')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📖')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help')
                    .setLabel('المساعدة')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            ephemeral: false
        });
    }
};