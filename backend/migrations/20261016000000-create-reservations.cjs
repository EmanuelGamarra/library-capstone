"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reservations", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
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
        type: Sequelize.ENUM(
          "PENDING",
          "READY",
          "FULFILLED",
          "CANCELLED",
          "EXPIRED",
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      readyAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      fulfilledAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX reservations_active_user_book_unique
      ON reservations ("userId", "bookId")
      WHERE status IN ('PENDING', 'READY');
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX reservations_fifo_idx
      ON reservations ("bookId", "createdAt", "id")
      WHERE status = 'PENDING';
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX reservations_ready_idx
      ON reservations ("bookId", "expiresAt")
      WHERE status = 'READY';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE reservations
      ADD CONSTRAINT reservations_ready_dates_check
      CHECK (
        status NOT IN ('READY', 'FULFILLED', 'EXPIRED')
        OR ("readyAt" IS NOT NULL AND "expiresAt" IS NOT NULL)
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reservations");

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_reservations_status";
    `);
  },
};
