import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Book from "./Book.js";

const WishlistItem = sequelize.define(
  "WishlistItem",
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
  },
  {
    tableName: "wishlist_items",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "bookId"],
        name: "wishlist_items_user_book_unique",
      },
    ],
  },
);

User.hasMany(WishlistItem, { foreignKey: "userId" });
WishlistItem.belongsTo(User, { foreignKey: "userId" });

Book.hasMany(WishlistItem, { foreignKey: "bookId" });
WishlistItem.belongsTo(Book, { foreignKey: "bookId" });

export default WishlistItem;
