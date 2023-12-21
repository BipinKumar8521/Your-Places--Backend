const express = require("express");
const { getUsers, signUp, logIn } = require("../controllers/users-controllers");
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", getUsers);
router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").notEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  signUp
);
router.post("/login", logIn);

module.exports = router;
