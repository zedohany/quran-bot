const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../db');
const Guild = require('./Guild');
const User = require('./User');

class Bookmark extends Model {}
Bookmark.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    surah: { type: DataTypes.INTEGER, allowNull: false },
    ayah: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'Bookmark', timestamps: true }
);

Guild.hasMany(Bookmark, { foreignKey: 'guildId' });
Bookmark.belongsTo(Guild, { foreignKey: 'guildId' });

User.hasMany(Bookmark, { foreignKey: 'userId' });
Bookmark.belongsTo(User, { foreignKey: 'userId' });

module.exports = Bookmark;