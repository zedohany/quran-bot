const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../db');

class Guild extends Model { }
Guild.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
        name: { type: DataTypes.STRING, allowNull: false },
        icon: { type: DataTypes.STRING, allowNull: true },
        ownerId: { type: DataTypes.STRING, allowNull: false },
        joinDate: { type: DataTypes.DATE, allowNull: true },
        botinserver: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
        voiceChannelId: { type: DataTypes.STRING, allowNull: true },
        voice24_7: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
        lang: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ar' },
    },
    { sequelize, modelName: 'Guild', timestamps: true }
);

module.exports = Guild;