import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Book from "./Book.js";

export const RESERVATION_STATUS = Object.freeze({
  PENDING: "PENDING",
  READY: "READY",
  FULFILLED: "FULFILLED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
});

const Reservation = sequelize.define(
  "Reservation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    bookId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Book,
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RESERVATION_STATUS)),
      allowNull: false,
      defaultValue: RESERVATION_STATUS.PENDING,
    },
    readyAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fulfilledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "reservations",
    timestamps: true,
  },
);

User.hasMany(Reservation, { foreignKey: "userId" });
Reservation.belongsTo(User, { foreignKey: "userId" });

Book.hasMany(Reservation, { foreignKey: "bookId" });
Reservation.belongsTo(Book, { foreignKey: "bookId" });

export default Reservation;
