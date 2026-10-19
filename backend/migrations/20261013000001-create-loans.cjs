"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("loans", {
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
      borrowedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      dueAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      returnedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
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

    await queryInterface.addIndex("loans", ["bookId"], {
      name: "loans_book_id_idx",
    });

    await queryInterface.addIndex("loans", ["userId"], {
      name: "loans_user_id_idx",
    });

    await queryInterface.addIndex("loans", ["userId", "bookId"], {
      unique: true,
      where: {
        returnedAt: null,
      },
      name: "loans_one_active_per_user_book",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("loans");
  },
};
