const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getUsers = async (req, res, next) => {
  let users;

  try {
    users = await User.find({}, "-password");
  } catch (error) {
    return next(new HttpError("Fetching users failed, please try again.", 500));
  }

  res.json({
    users: users.map((user) => user.toObject({ getters: true })),
  });
};

const signUp = async (req, res, next) => {
  const { name, email, password } = req.body;

  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(
      new HttpError(`${error.errors[0].msg} of ${error.errors[0].path}`, 422)
    );
  }

  let hasUser;

  try {
    hasUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Something went wrong, please try again.", 500));
  }

  if (hasUser) {
    return next(
      new HttpError("Email already exists, try with other email.", 422)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError("Could not create user, please try again."), 500);
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (error) {
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );
  } catch (err) {
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  res
    .json({ userId: createdUser.id, email: createdUser.email, token: token })
    .status(201);
};

const logIn = async (req, res, next) => {
  const { email, password } = req.body;

  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(
      new HttpError(`${error.errors[0].msg} of ${error.errors[0].path}`, 422)
    );
  }

  let identifiedUser;

  try {
    identifiedUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Something went wrong.", 500));
  }

  if (!identifiedUser) {
    return next(new HttpError("Wrong User Credentials.", 403));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, identifiedUser.password);
  } catch (err) {
    return next(new HttpError("Could not log you in, please try again."), 500);
  }

  if (!isValidPassword) {
    return next(new HttpError("Wrong User Credentials.", 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: identifiedUser.id, email: identifiedUser.email },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );
  } catch (err) {
    return next(new HttpError("Could not log you in, please try again."), 500);
  }

  res.json({
    userId: identifiedUser.id,
    email: identifiedUser.email,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signUp = signUp;
exports.logIn = logIn;
