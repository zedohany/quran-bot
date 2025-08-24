const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../db');

class User extends Model { }
User.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        discordId: { type: DataTypes.STRING, allowNull: false, unique: true },
        username: { type: DataTypes.STRING, allowNull: false },
        lastReadSurah: { type: DataTypes.INTEGER, allowNull: true },
        lastReadAyah: { type: DataTypes.INTEGER, allowNull: true },
    },
    { sequelize, modelName: 'User', timestamps: true }
);

module.exports = User;