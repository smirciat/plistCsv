'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Airport', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    threeLetter: DataTypes.STRING,
    fourLetter: DataTypes.STRING,
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    active: DataTypes.BOOLEAN
  });
}
