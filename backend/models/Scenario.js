const { DataTypes } = require("sequelize");
const { sequelize } = require("../db");

const Scenario = sequelize.define("Scenario", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },

  // dodatno: snapshot scenarija odmah nakon kreiranja (za restore)
  initialSnapshot: { type: DataTypes.TEXT("long"), allowNull: false }
}, {
  tableName: "Scenarios",
  timestamps: false
});

module.exports = Scenario;
