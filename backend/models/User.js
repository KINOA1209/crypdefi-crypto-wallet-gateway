const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  wallets: [
    {
      keyID: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      nonce: {
        type: Number,
        default: 0,
      },
    },
  ],
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = User = mongoose.model("user", UserSchema);
