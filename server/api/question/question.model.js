'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Question', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    question: DataTypes.STRING,
    answer: DataTypes.STRING,
    wrong1: DataTypes.STRING,
    wrong2: DataTypes.STRING,
    wrong3: DataTypes.STRING,
    wrong4: DataTypes.STRING,
    wrong5: DataTypes.STRING,
    wrong6: DataTypes.STRING,
    info: DataTypes.STRING,
    active: DataTypes.BOOLEAN
  });
}
