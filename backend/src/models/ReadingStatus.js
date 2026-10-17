import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Book from "./Book.js";

export const READING_STATUS = Object.freeze({
  READING: "READING",
  COMPLETED: "COMPLETED",
});

const ReadingStatus = sequelize.define(
  "ReadingStatus",
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
      type: DataTypes.STRING(16),
      allowNull: false,
      validate: {
        isIn: [Object.values(READING_STATUS)],
      },
    },
  },
  {
    tableName: "reading_statuses",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "bookId"],
        name: "reading_statuses_user_book_unique",
      },
    ],
  },
);

User.hasMany(ReadingStatus, { foreignKey: "userId" });
ReadingStatus.belongsTo(User, { foreignKey: "userId" });

Book.hasMany(ReadingStatus, { foreignKey: "bookId" });
ReadingStatus.belongsTo(Book, { foreignKey: "bookId" });

export default ReadingStatus;
