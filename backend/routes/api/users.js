const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator/check");
const auth = require("../../middleware/auth");

const { createNewKey, signTransaction, web3 } = require("../../kms/kms");

const User = require("../../models/User");

// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
  "/",
  [
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      user = new User({
        email,
        password,
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route    GET api/users/wallets
// @desc     Get wallets for a user
// @access   Private
router.get("/wallets", [auth], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user.id);

    res.json(user.wallets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    POST api/users/wallet
// @desc     Add a wallet for a user
// @access   Private
router.post("/wallet", [auth], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user.id);
    const { keyID, address } = await createNewKey();

    user.wallets.push({ keyID: keyID, address: address });

    await user.save();

    res.json(user.wallets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    PUT api/users/signtx
// @desc     Sign a transaction
// @access   Private
router.put("/signtx", [auth], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user.id);
    const wallet = user.wallets[req.body.walletIndex];
    const txData = {
      nonce: wallet.nonce,
      gasPrice: 50000000000,
      gasLimit: 300000,
      to: req.body.transactionTo,
      value: req.body.transactionValue,
      data: req.body.transactionData,
    };
    const addressBuffer = Buffer.from(wallet.address.replace("0x", ""), "hex");
    const signedTx = await signTransaction(
      { address: addressBuffer, KeyId: wallet.keyID },
      txData
    );

    await web3.eth
      .sendSignedTransaction(signedTx)
      .on("receipt", (txReceipt) => {
        wallet.nonce++;
        user.save();
      })
      .on("error", (error) => {
        console.error("error: " + error);
      });
    res.json(signedTx);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;
