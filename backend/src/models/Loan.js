import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Book from "./Book.js";

const Loan = sequelize.define(
  "Loan",
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
    borrowedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    dueAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "loans",
    timestamps: true,
  },
);

User.hasMany(Loan, { foreignKey: "userId" });
Loan.belongsTo(User, { foreignKey: "userId" });

Book.hasMany(Loan, { foreignKey: "bookId" });
Loan.belongsTo(Book, { foreignKey: "bookId" });

export default Loan;
