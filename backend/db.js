const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("wt26", "root", "password", {
  host: "mysql-db",
  dialect: "mysql",
  logging: false,
  port:3306
});

module.exports = { sequelize };
