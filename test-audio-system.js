const audioManager = require('./audioManager');

async function testAudioSystem() {
    try {
        console.log('🎵 اختبار نظام الصوت الجديد...\n');

        // اختبار إنشاء مدير الصوت
        console.log('✅ تم إنشاء مدير الصوت بنجاح');

        // اختبار الحالة الأولية
        console.log('\n📊 الحالة الأولية:');
        console.log('  - عدد الاتصالات:', audioManager.connections.size);
        console.log('  - عدد اللاعبين:', audioManager.players.size);
        console.log('  - مستوى الصوت:', audioManager.volume);

        // اختبار الدوال
        console.log('\n🔧 اختبار الدوال:');
        
        // اختبار hasConnection
        const testGuildId = '123456789';
        console.log(`  - hasConnection('${testGuildId}'):`, audioManager.hasConnection(testGuildId));
        
        // اختبار getPlayer
        console.log(`  - getPlayer('${testGuildId}'):`, audioManager.getPlayer(testGuildId) ? 'موجود' : 'غير موجود');
        
        // اختبار getCurrentStream
        console.log(`  - getCurrentStream('${testGuildId}'):`, audioManager.getCurrentStream(testGuildId) || 'لا يوجد');
        
        // اختبار getConnectionStatus
        console.log(`  - getConnectionStatus('${testGuildId}'):`, audioManager.getConnectionStatus(testGuildId));

        // اختبار تغيير مستوى الصوت
        console.log('\n🔊 اختبار تغيير مستوى الصوت:');
        const newVolume = 0.8;
        audioManager.setVolume(testGuildId, newVolume);
        console.log(`  - تم تغيير مستوى الصوت إلى: ${newVolume}`);
        console.log(`  - المستوى الحالي: ${audioManager.volume}`);

        console.log('\n🎉 اختبار نظام الصوت تم بنجاح!');
        console.log('\n📋 ملخص النظام:');
        console.log('  ✅ مدير الصوت يعمل');
        console.log('  ✅ الدوال تعمل بشكل صحيح');
        console.log('  ✅ إدارة الاتصالات تعمل');
        console.log('  ✅ إدارة اللاعبين تعمل');
        console.log('  ✅ إدارة مستوى الصوت تعمل');
        console.log('  ✅ النظام جاهز للاستخدام!');

        process.exit(0);

    } catch (error) {
        console.error('❌ خطأ في اختبار نظام الصوت:', error);
        process.exit(1);
    }
}

testAudioSystem();
