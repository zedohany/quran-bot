const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../db');

class Surah extends Model { }
Surah.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        number: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        name: { type: DataTypes.STRING, allowNull: false },
        englishName: { type: DataTypes.STRING, allowNull: true },
        englishNameTranslation: { type: DataTypes.STRING, allowNull: true },
        numberOfAyahs: { type: DataTypes.INTEGER, allowNull: false },
        revelationType: { type: DataTypes.STRING, allowNull: false }
    }, 
    { sequelize, modelName: 'Surah', timestamps: false}
)

module.exports = Surah;