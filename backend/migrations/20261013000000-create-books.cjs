"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("books", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      openLibraryId: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("books", {
      fields: ["stock"],
      type: "check",
      where: {
        stock: { [Sequelize.Op.gte]: 1 },
      },
      name: "books_stock_positive",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("books");
  },
};
