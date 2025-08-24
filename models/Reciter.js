const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../db');

class Reciter extends Model {}

Reciter.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    avatar: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING },
}, {
    sequelize,
    modelName: 'Reciter',
    tableName: 'reciters'
});

module.exports = Reciter;