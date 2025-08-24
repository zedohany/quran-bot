const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const Reciter = require('../models/Reciter');
const ReciterSurahLink = require('../models/ReciterSurahLink');
const Surah = require('../models/Surah');
const audioManager = require('../audioManager');
const { getCountryName } = require('../countryMapper');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmission(interaction);
        }
    }
};

async function handleButtonInteraction(interaction) {
    const { customId } = interaction;

    switch (customId) {
        case 'quran_radio':
            await showQuranRadioOptions(interaction);
            break;
        case 'quran_surah':
            await showQuranImageModal(interaction);
            break;
        case 'help':
            await showHelp(interaction);
            break;
        case 'back_to_main':
            await showMainMenu(interaction);
            break;
        // Radio stations
        case 'radio_saudi':
            await playQuranRadio(interaction, 'saudi');
            break;
        case 'radio_egypt':
            await playQuranRadio(interaction, 'egypt');
            break;
        case 'radio_kuwait':
            await playQuranRadio(interaction, 'kuwait');
            break;
        case 'radio_uae':
            await playQuranRadio(interaction, 'uae');
            break;
        case 'stop_radio':
            await stopRadio(interaction);
            break;
        case 'show_quran_surah':
            await showQuranImage(interaction);
            break;
        case 'download_image':
            await downloadImage(interaction);
            break;
        case 'play_ayah_audio':
            await playAyahAudio(interaction);
            break;
        case 'pause_ayah':
        case 'stop_ayah':
            await controlAyahAudio(interaction, customId);
            break;
        default:
            // Handle audio playback buttons
            if (customId.startsWith('play_audio_')) {
                await playQuranAudio(interaction, customId);
                break;
            }
            // Handle audio control buttons
            if (customId.startsWith('pause_audio_') || customId.startsWith('stop_audio_') || 
                customId.startsWith('resume_audio_') || customId.startsWith('volume_up_') || 
                customId.startsWith('volume_down_') || customId.startsWith('info_audio_')) {
                await controlQuranAudio(interaction, customId);
                break;
            }
    }
}

async function showMainMenu(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('🕌 البوت الإسلامي - القائمة الرئيسية')
            .setDescription('مرحباً بك في البوت الإسلامي! اختر الخدمة المطلوبة:')
            .setColor('#00ff00')
            .addFields(
                { name: '📖 القرآن الكريم', value: 'تشغيل السور بصوت القراء المميزين', inline: true },
                { name: '📻 الإذاعة المباشرة', value: 'إذاعات القرآن الكريم من مختلف البلدان', inline: true },
                { name: '❓ المساعدة', value: 'دليل الاستخدام والمعلومات', inline: true }
            )
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quran_surah')
                    .setLabel('📖 القرآن الكريم')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quran_radio')
                    .setLabel('📻 الإذاعة المباشرة')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('help')
                    .setLabel('❓ المساعدة')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error showing main menu:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في عرض القائمة الرئيسية',
            ephemeral: true
        });
    }
}

async function showQuranImageModal(interaction) {
    try {
        const [surahs, reciters] = await Promise.all([
            Surah.findAll({ order: [['number', 'ASC']] }),
            Reciter.findAll({ order: [['name', 'ASC']] })
        ]);

        const embed = new EmbedBuilder()
            .setTitle('📖 اختيار السورة')
            .setDescription('اختر السورة من القوائم أدناه:')
            .setColor('#00ff00')
            .setFooter({ text: `البوت الإسلامي - ${reciters.length} قارئ متاح` });

        const surahsPerMenu = 25;
        const surahSelects = [];

        for (let i = 0; i < surahs.length; i += surahsPerMenu) {
            const surahBatch = surahs.slice(i, i + surahsPerMenu);
            const surahSelect = new StringSelectMenuBuilder()
                .setCustomId(`surah_select_${Math.floor(i / surahsPerMenu) + 1}`)
                .setPlaceholder(`اختر السورة (${i + 1}-${Math.min(i + surahsPerMenu, surahs.length)})`)
                .addOptions(
                    surahBatch.map(surah =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${surah.number}. ${surah.name}`)
                            .setValue(surah.number.toString())
                            .setDescription(`${surah.numberOfAyahs} آية - ${surah.revelationType}`)
                    )
                );
            surahSelects.push(surahSelect);
        }

        // Display only the first 3 select menus (75 surahs)
        const rows = [];

        for (let i = 0; i < Math.min(3, surahSelects.length); i++) {
            rows.push(new ActionRowBuilder().addComponents(surahSelects[i]));
        }

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
            );

        rows.push(buttonRow);

        await interaction.update({
            embeds: [embed],
            components: rows
        });
    } catch (error) {
        console.error('Error loading surahs from database:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في تحميل السور',
            ephemeral: true
        });
    }
}

async function handleSelectMenuInteraction(interaction) {
    const { customId } = interaction;

    if (customId.startsWith('surah_select_')) {
        await showReciterSelection(interaction);
    } else if (customId.startsWith('reciter_select_')) {
        await showQuranAudioOptions(interaction);
    }
}

async function showReciterSelection(interaction) {
    try {
        const surahNumber = interaction.values[0];
        const surah = await Surah.findOne({ where: { number: surahNumber } });
        const reciters = await Reciter.findAll({ order: [['name', 'ASC']] });

        if (!surah) {
            await interaction.reply({
                content: '❌ لم يتم العثور على السورة',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📖 ${surah.name}`)
            .setDescription(`اختر القارئ لتشغيل ${surah.name}`)
            .addFields(
                { name: '📊 عدد الآيات', value: surah.numberOfAyahs.toString(), inline: true },
                { name: '🌍 نوع النزول', value: surah.revelationType, inline: true }
            )
            .setColor('#00ff00')
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        const reciterSelect = new StringSelectMenuBuilder()
            .setCustomId(`reciter_select_${surahNumber}`)
            .setPlaceholder('اختر القارئ المفضل')
            .addOptions(
                reciters.map(reciter =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(reciter.name)
                        .setValue(reciter.id.toString())
                        .setDescription(`${getCountryName(reciter.country)}`)
                )
            );

        const row = new ActionRowBuilder().addComponents(reciterSelect);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error showing reciter selection:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في عرض القراء',
            ephemeral: true
        });
    }
}

async function showQuranAudioOptions(interaction) {
    try {
        const reciterId = interaction.values[0];
        const parts = interaction.message.components[0].components[0].customId.split('_');
        const surahNumber = parts[2];

        const [reciter, surah, link] = await Promise.all([
            Reciter.findByPk(reciterId),
            Surah.findOne({ where: { number: surahNumber } }),
            ReciterSurahLink.findOne({
                where: {
                    reciter_id: reciterId,
                    surah_id: surahNumber
                }
            })
        ]);

        if (!reciter || !surah || !link) {
            await interaction.reply({
                content: '❌ لم يتم العثور على المعلومات المطلوبة',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎵 تشغيل القرآن الكريم')
            .setDescription(`جاري تشغيل **${surah.name}** بصوت **${reciter.name}**`)
            .addFields(
                { name: '📖 السورة', value: surah.name, inline: true },
                { name: '🎤 القارئ', value: reciter.name, inline: true },
                { name: '🌍 البلد', value: getCountryName(reciter.country), inline: true },
            )
            .setColor('#00ff00')
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        // Audio control buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pause_audio_${reciterId}_${surahNumber}`)
                    .setLabel('⏸️ إيقاف مؤقت')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`stop_audio_${reciterId}_${surahNumber}`)
                    .setLabel('⏹️ إيقاف')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`resume_audio_${reciterId}_${surahNumber}`)
                    .setLabel('▶️ استئناف')
                    .setStyle(ButtonStyle.Success)
            );

        // Volume control buttons
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`volume_up_${reciterId}_${surahNumber}`)
                    .setLabel('🔊 رفع الصوت')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`volume_down_${reciterId}_${surahNumber}`)
                    .setLabel('🔉 خفض الصوت')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`info_audio_${reciterId}_${surahNumber}`)
                    .setLabel('ℹ️ معلومات البث')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Additional buttons
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row1, row2, row3]
        });

        try {
            const guild = interaction.guild;

            if (!audioManager.hasConnection(guild.id)) {
                const member = interaction.member;
                if (member.voice.channel) {
                    await audioManager.joinVoiceChannel(guild.id, member.voice.channel.id, guild);
                } else {
                    await interaction.followUp({
                        content: '❌ يجب أن تكون في قناة صوتية لتشغيل الصوت',
                        ephemeral: true
                    });
                    return;
                }
            }

            // Play Quran audio
            await audioManager.playQuran(guild.id, link.audio_url, surah.name, reciter.name);

            await interaction.followUp({
                content: `🎵 تم تشغيل ${surah.name} بصوت ${reciter.name} بنجاح!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('❌ Error playing audio:', error);
            await interaction.followUp({
                content: '❌ حدث خطأ في تشغيل الصوت',
                ephemeral: true
            });
        }

    } catch (error) {
        console.error('Error showing Quran audio options:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في عرض خيارات الصوت',
            ephemeral: true
        });
    }
}

async function controlQuranAudio(interaction, customId) {
    try {
        const parts = customId.split('_');
        const action = parts[1]; // pause, stop, resume, up, down, audio
        const reciterId = parts[2];
        const surahNumber = parts[3];
        const guildId = interaction.guild.id;

        const [reciter, surah] = await Promise.all([
            Reciter.findByPk(reciterId),
            Surah.findOne({ where: { number: surahNumber } })
        ]);

        if (!reciter || !surah) {
            await interaction.reply({
                content: '❌ لم يتم العثور على المعلومات المطلوبة',
                ephemeral: true
            });
            return;
        }

        let actionText = '';
        let actionColor = '#00ff00';
        let updateButtons = true; // Flag to determine if buttons should be updated

        const playerStatus = audioManager.getPlayerStatus(guildId);
        const currentStream = audioManager.getCurrentStream(guildId);

        // Check if audio is playing and matches the requested surah/reciter
        if (!playerStatus || !currentStream || currentStream.type !== 'quran' || 
            currentStream.surahName !== surah.name || currentStream.reciterName !== reciter.name) {
            await interaction.reply({
                content: '❌ لا يوجد صوت قيد التشغيل لهذه السورة أو القارئ',
                ephemeral: true
            });
            return;
        }

        try {
            if (action === 'pause') {
                if (playerStatus !== 'playing') {
                    actionText = 'الصوت ليس قيد التشغيل ليتم إيقافه مؤقتاً';
                    actionColor = '#ff9900';
                    updateButtons = false;
                } else if (audioManager.pauseAudio(guildId)) {
                    actionText = 'إيقاف مؤقت';
                    actionColor = '#ffff00';
                } else {
                    actionText = 'فشل في إيقاف الصوت مؤقتاً';
                    actionColor = '#ff9900';
                    updateButtons = false;
                }
            } else if (action === 'stop') {
                if (playerStatus !== 'playing' && playerStatus !== 'paused') {
                    actionText = 'الصوت ليس قيد التشغيل أو متوقف مؤقتاً ليتم إيقافه';
                    actionColor = '#ff9900';
                    updateButtons = false;
                } else if (audioManager.stopAudio(guildId)) {
                    actionText = 'إيقاف';
                    actionColor = '#ff0000';
                } else {
                    actionText = 'فشل في إيقاف الصوت';
                    actionColor = '#ff9900';
                    updateButtons = false;
                }
            } else if (action === 'resume') {
                if (playerStatus !== 'paused') {
                    actionText = 'الصوت ليس متوقف مؤقتاً ليتم استئنافه';
                    actionColor = '#ff9900';
                    updateButtons = false;
                } else if (audioManager.resumeAudio(guildId)) {
                    actionText = 'استئناف';
                    actionColor = '#00ff00';
                } else {
                    actionText = 'فشل في استئناف الصوت';
                    actionColor = '#ff9900';
                    updateButtons = false;
                }
            } else if (action === 'up') {
                const currentVolume = audioManager.getCurrentVolume(guildId);
                const newVolume = Math.min(2.0, currentVolume + 0.1); // Allow up to 200%
                if (audioManager.setVolume(guildId, newVolume)) {
                    actionText = `رفع الصوت إلى ${Math.round(newVolume * 100)}%`;
                    actionColor = '#0099ff';
                } else {
                    actionText = 'لا يمكن تغيير مستوى الصوت';
                    actionColor = '#ff9900';
                    updateButtons = false;
                }
            } else if (action === 'down') {
                const currentVolume = audioManager.getCurrentVolume(guildId);
                const newVolume = Math.max(0, currentVolume - 0.1);
                if (audioManager.setVolume(guildId, newVolume)) {
                    actionText = `خفض الصوت إلى ${Math.round(newVolume * 100)}%`;
                    actionColor = '#ff9900';
                } else {
                    actionText = 'لا يمكن تغيير مستوى الصوت';
                    actionColor = '#ff9900';
                    updateButtons = false;
                }
            } else if (action === 'audio') {
                actionText = 'عرض معلومات البث';
                actionColor = '#0099ff';
            }

        } catch (error) {
            console.error('❌ Error controlling audio:', error);
            actionText = 'حدث خطأ في التحكم في الصوت';
            actionColor = '#ff0000';
            updateButtons = false;
        }

        const currentVolume = audioManager.getCurrentVolume(guildId);
        const connectionStatus = audioManager.getConnectionStatus(guildId);
        
        let embedTitle = '🎵 تم التحكم في الصوت';
        let embedDescription = `تم ${actionText} تشغيل **${surah.name}** بصوت **${reciter.name}**`;
        let embedFields = [
            { name: '🌍 البلد', value: getCountryName(reciter.country), inline: true },
            { name: '🔊 مستوى الصوت', value: `${Math.round(currentVolume * 100)}%`, inline: true }
        ];

        // Additional info for 'audio' action
        if (action === 'audio') {
            embedTitle = 'ℹ️ معلومات البث الحالي';
            embedDescription = `معلومات بث **${surah.name}** بصوت **${reciter.name}**`;
            
            const detailedInfo = audioManager.getDetailedStreamInfo(guildId);
            
            if (detailedInfo.isPlaying) {
                embedFields.push(
                    { name: '📡 حالة البث', value: `${detailedInfo.statusEmoji} ${detailedInfo.status}`, inline: true },
                    { name: '🔗 حالة الاتصال', value: detailedInfo.hasConnection ? '🟢 متصل' : '🔴 غير متصل', inline: true },
                    { name: '📻 نوع البث', value: detailedInfo.type === 'quran' ? '🎵 قرآن كريم' : '📻 راديو', inline: true }
                );
            } else {
                embedFields.push(
                    { name: '📡 حالة البث', value: '❌ لا يوجد بث', inline: true },
                    { name: '🔗 حالة الاتصال', value: connectionStatus.hasConnection ? '🟢 متصل' : '🔴 غير متصل', inline: true }
                );
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setDescription(embedDescription)
            .addFields(embedFields)
            .setColor(actionColor)
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        // Only update buttons if the action was successful or explicitly requested
        if (updateButtons) {
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`pause_audio_${reciterId}_${surahNumber}`)
                        .setLabel('⏸️ إيقاف مؤقت')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`stop_audio_${reciterId}_${surahNumber}`)
                        .setLabel('⏹️ إيقاف')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`resume_audio_${reciterId}_${surahNumber}`)
                        .setLabel('▶️ استئناف')
                        .setStyle(ButtonStyle.Success)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`volume_up_${reciterId}_${surahNumber}`)
                        .setLabel('🔊 رفع الصوت')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`volume_down_${reciterId}_${surahNumber}`)
                        .setLabel('🔉 خفض الصوت')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`info_audio_${reciterId}_${surahNumber}`)
                        .setLabel('ℹ️ معلومات البث')
                        .setStyle(ButtonStyle.Secondary)
                );

            const row3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_main')
                        .setLabel('🔙 العودة للقائمة الرئيسية')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.update({
                embeds: [embed],
                components: [row1, row2, row3]
            });
        } else {
            await interaction.reply({
                content: `⚠️ ${actionText}`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error controlling Quran audio:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في التحكم في الصوت',
            ephemeral: true
        });
    }
}

async function showQuranRadioOptions(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('📻 إذاعة القرآن الكريم')
            .setDescription('اختر الإذاعة المفضلة:')
            .setColor('#00ff00')
            .addFields(
                { name: '🇪🇬 مصر', value: 'إذاعة القرآن الكريم - مصر', inline: true },
            )
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('radio_egypt')
                    .setLabel('🇪🇬 مصر')
                    .setStyle(ButtonStyle.Primary),
            );

        const backRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row, backRow]
        });
    } catch (error) {
        console.error('Error showing radio options:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في عرض خيارات الإذاعة',
            ephemeral: true
        });
    }
}

async function playQuranRadio(interaction, station) {
    try {
        const guild = interaction.guild;

        const stations = {
            'saudi': {
                name: 'إذاعة القرآن الكريم - السعودية',
                flag: '🇸🇦',
                url: 'https://stream.radiojar.com/8s5u5tpdtwzuv'
            },
            'egypt': {
                name: 'إذاعة القرآن الكريم - مصر',
                flag: '🇪🇬',
                url: 'https://stream.radiojar.com/8s5u5tpdtwzuv'
            },
            'kuwait': {
                name: 'إذاعة القرآن الكريم - الكويت',
                flag: '🇰🇼',
                url: 'https://stream.radiojar.com/8s5u5tpdtwzuv'
            },
            'uae': {
                name: 'إذاعة القرآن الكريم - الإمارات',
                flag: '🇦🇪',
                url: 'https://stream.radiojar.com/8s5u5tpdtwzuv'
            }
        };

        const stationInfo = stations[station];

        if (!audioManager.hasConnection(guild.id)) {
            const member = interaction.member;
            if (member.voice.channel) {
                await audioManager.joinVoiceChannel(guild.id, member.voice.channel.id, guild);
            } else {
                await interaction.reply({
                    content: '❌ يجب أن تكون في قناة صوتية لتشغيل الإذاعة',
                    ephemeral: true
                });
                return;
            }
        }

        await audioManager.playRadio(guild.id, stationInfo.url);

        const embed = new EmbedBuilder()
            .setTitle(`📻 ${stationInfo.name}`)
            .setDescription(`جاري تشغيل ${stationInfo.flag}... 🔊`)
            .setColor('#00ff00')
            .addFields(
                { name: '📡 الحالة', value: '🟢 مشغل', inline: true },
                { name: '🔊 الجودة', value: 'عالية', inline: true },
                { name: '🌍 البلد', value: stationInfo.flag, inline: true }
            )
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('stop_radio')
                    .setLabel('⏹️ إيقاف')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });

    } catch (error) {
        console.error('❌ Error playing radio:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في تشغيل الإذاعة',
            ephemeral: true
        });
    }
}

async function stopRadio(interaction) {
    try {
        const guild = interaction.guild;

        audioManager.stopAudio(guild.id);

        const embed = new EmbedBuilder()
            .setTitle('📻 تم إيقاف الإذاعة')
            .setDescription('تم إيقاف إذاعة القرآن الكريم بنجاح! ⏹️')
            .setColor('#ff0000')
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });

    } catch (error) {
        console.error('❌ Error stopping radio:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في إيقاف الإذاعة',
            ephemeral: true
        });
    }
}

async function showHelp(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('❓ المساعدة - البوت الإسلامي')
            .setDescription('دليل استخدام البوت الإسلامي:')
            .addFields(
                { name: '📖 القرآن الكريم', value: '1. اختر "📖 القرآن الكريم"\n2. اختر السورة من القائمة\n3. اختر القارئ المفضل\n4. اضغط "▶️ تشغيل الصوت"', inline: false },
                { name: '🎛️ التحكم في الصوت', value: '⏸️ إيقاف مؤقت | ▶️ استئناف | ⏹️ إيقاف\n🔊 رفع الصوت | 🔉 خفض الصوت | ℹ️ معلومات البث', inline: false },
                { name: '📻 الإذاعة المباشرة', value: '1. اختر "📻 الإذاعة المباشرة"\n2. اختر البلد المفضل\n3. استمع للإذاعة مباشرة', inline: false },
                { name: '🔙 العودة', value: 'استخدم "🔙 العودة للقائمة الرئيسية" للرجوع', inline: false }
            )
            .setColor('#0099ff')
            .setFooter({ text: 'البوت الإسلامي - خدمة القرآن الكريم' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error showing help:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في عرض المساعدة',
            ephemeral: true
        });
    }
}

async function showQuranImage(interaction) {
    await interaction.reply({
        content: '❌ هذه الميزة غير متوفرة حالياً',
        ephemeral: true
    });
}

async function downloadImage(interaction) {
    await interaction.reply({
        content: '❌ هذه الميزة غير متوفرة حالياً',
        ephemeral: true
    });
}

async function playAyahAudio(interaction) {
    await interaction.reply({
        content: '❌ هذه الميزة غير متوفرة حالياً',
        ephemeral: true
    });
}

async function controlAyahAudio(interaction, customId) {
    await interaction.reply({
        content: '❌ هذه الميزة غير متوفرة حالياً',
        ephemeral: true
    });
}

async function handleModalSubmission(interaction) {
    await interaction.reply({
        content: '❌ هذه الميزة غير متوفرة حالياً',
        ephemeral: true
    });
}

async function playQuranAudio(interaction, customId) {
    await interaction.reply({
        content: '❌ هذه الميزة غير متوفرة حالياً',
        ephemeral: true
    });
}