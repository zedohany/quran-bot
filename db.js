const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('quran_bot', 'botuser', '12345678', {
    host: '38.242.197.143',
    dialect: 'mysql',
    logging: false,
});

async function connectDB() {
    try {
        await sequelize.authenticate();
        // console.log('Database connected successfully.');
        await sequelize.sync({ alter: true });
        console.log('All models synced successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

module.exports = { sequelize, connectDB };