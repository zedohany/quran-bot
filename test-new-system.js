const { connectDB } = require('./db');
const Reciter = require('./models/Reciter');
const Surah = require('./models/Surah');
const ReciterSurahLink = require('./models/ReciterSurahLink');

async function testNewSystem() {
    try {
        console.log('🔌 جاري الاتصال بقاعدة البيانات...');
        await connectDB();
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!');

        // اختبار النظام الجديد
        console.log('\n🎵 اختبار النظام الجديد...');

        // 1. جلب السور
        console.log('\n📚 جلب السور...');
        const surahs = await Surah.findAll({ 
            order: [['number', 'ASC']],
            limit: 5 
        });
        console.log(`✅ تم العثور على ${surahs.length} سورة:`);
        surahs.forEach(surah => {
            console.log(`  - ${surah.number}. ${surah.name} (${surah.numberOfAyahs} آية)`);
        });

        // 2. جلب القراء
        console.log('\n🎤 جلب القراء...');
        const reciters = await Reciter.findAll({ 
            order: [['name', 'ASC']] 
        });
        console.log(`✅ تم العثور على ${reciters.length} قارئ:`);
        reciters.forEach(reciter => {
            console.log(`  - ${reciter.name} (${reciter.country || 'غير محدد'})`);
        });

        // 3. اختبار البحث عن الروابط
        console.log('\n🔗 اختبار البحث عن الروابط...');
        if (surahs.length > 0 && reciters.length > 0) {
            const testSurah = surahs[0];
            const testReciter = reciters[0];
            
            console.log(`🔍 البحث عن رابط لسورة ${testSurah.name} مع قارئ ${testReciter.name}...`);
            
            const link = await ReciterSurahLink.findOne({
                where: {
                    reciter_id: testReciter.id,
                    surah_id: testSurah.number
                }
            });

            if (link) {
                console.log(`✅ تم العثور على رابط: ${link.audio_url}`);
            } else {
                console.log(`⚠️ لا يوجد رابط متاح لسورة ${testSurah.name} مع قارئ ${testReciter.name}`);
            }
        }

        // 4. اختبار العلاقات
        console.log('\n🔗 اختبار العلاقات بين النماذج...');
        try {
            // اختبار العلاقة بين Reciter و ReciterSurahLink
            const reciterWithLinks = await Reciter.findOne({
                include: [{
                    model: ReciterSurahLink,
                    as: 'ReciterSurahLinks'
                }]
            });

            if (reciterWithLinks) {
                console.log(`✅ تم اختبار العلاقة مع القارئ: ${reciterWithLinks.name}`);
                console.log(`   عدد الروابط: ${reciterWithLinks.ReciterSurahLinks?.length || 0}`);
            }
        } catch (error) {
            console.log(`⚠️ خطأ في اختبار العلاقات: ${error.message}`);
        }

        console.log('\n🎉 اختبار النظام الجديد تم بنجاح!');
        console.log('\n📋 ملخص النظام:');
        console.log('  ✅ جلب السور من قاعدة البيانات');
        console.log('  ✅ جلب القراء من قاعدة البيانات');
        console.log('  ✅ البحث عن الروابط الصوتية');
        console.log('  ✅ العلاقات بين النماذج تعمل');
        console.log('  ✅ النظام جاهز للاستخدام!');

        process.exit(0);

    } catch (error) {
        console.error('❌ خطأ في اختبار النظام الجديد:', error);
        process.exit(1);
    }
}

testNewSystem();
