const { connectDB } = require('./db');
const Reciter = require('./models/Reciter');
const Surah = require('./models/Surah');
const ReciterSurahLink = require('./models/ReciterSurahLink');

async function testDatabase() {
    try {
        console.log('🔌 جاري الاتصال بقاعدة البيانات...');
        await connectDB();
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!');

        // اختبار جلب القراء
        console.log('\n📖 جلب القراء من قاعدة البيانات...');
        const reciters = await Reciter.findAll();
        console.log(`✅ تم العثور على ${reciters.length} قارئ:`);
        reciters.forEach(reciter => {
            console.log(`  - ${reciter.name} (${reciter.country || 'غير محدد'})`);
        });

        // اختبار جلب السور
        console.log('\n📚 جلب السور من قاعدة البيانات...');
        const surahs = await Surah.findAll({ limit: 10 });
        console.log(`✅ تم العثور على ${surahs.length} سورة (أول 10):`);
        surahs.forEach(surah => {
            console.log(`  - ${surah.number}. ${surah.name} (${surah.numberOfAyahs} آية)`);
        });

        // اختبار جلب الروابط
        console.log('\n🔗 جلب الروابط من قاعدة البيانات...');
        const links = await ReciterSurahLink.findAll({ limit: 5 });
        console.log(`✅ تم العثور على ${links.length} رابط (أول 5):`);
        links.forEach(link => {
            console.log(`  - رابط: ${link.audio_url}`);
        });

        console.log('\n🎉 جميع الاختبارات تمت بنجاح!');
        process.exit(0);

    } catch (error) {
        console.error('❌ خطأ في اختبار قاعدة البيانات:', error);
        process.exit(1);
    }
}

testDatabase();
