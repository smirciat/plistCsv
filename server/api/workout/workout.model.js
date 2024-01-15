'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Workout', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    raw: DataTypes.TEXT,
    date: DataTypes.STRING,
    maxSpeed: DataTypes.STRING,
    miles: DataTypes.STRING,
    time: DataTypes.STRING,
    avgHR: DataTypes.STRING,
    maxHR: DataTypes.STRING,
    avgSpeed: DataTypes.STRING,
    active: DataTypes.BOOLEAN
  });
}
