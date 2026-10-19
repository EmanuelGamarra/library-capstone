import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Book = sequelize.define(
  "Book",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    openLibraryId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
      validate: {
        is: /^OL[0-9]+W$/,
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
      },
    },
  },
  {
    tableName: "books",
    timestamps: true,
  },
);

export default Book;
