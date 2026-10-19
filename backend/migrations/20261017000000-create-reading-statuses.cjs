"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reading_statuses", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      bookId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "books",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      status: {
        type: Sequelize.STRING(16),
        allowNull: false,
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

    await queryInterface.addIndex("reading_statuses", ["userId", "bookId"], {
      unique: true,
      name: "reading_statuses_user_book_unique",
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "reading_statuses"
      ADD CONSTRAINT "reading_statuses_status_check"
      CHECK ("status" IN ('READING', 'COMPLETED'));
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reading_statuses");
  },
};
