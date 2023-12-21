const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const getCoordinates = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const fs = require("fs");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not find a place.", 500)
    );
  }

  if (!place) {
    return next(new HttpError("Could not find a place for provided id.", 404));
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    return next(new HttpError("Something went wrong.", 500));
  }

  if (!places.length) {
    return next(
      new HttpError("Could not find a place for provided user id.", 404)
    );
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const { title, description, address } = req.body;

  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(
      new HttpError(`${error.errors[0].msg} of ${error.errors[0].path}`, 422)
    );
  }

  let location;
  try {
    location = await getCoordinates(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location,
    image: req.file.path,
    creator: req.userData.userId,
  });

  let user;

  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    return next(new HttpError("Something went wrong."), 500);
  }

  if (!user) {
    return next(new HttpError("User not found.", 404));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new HttpError("Creating place failed, please try again.", 500));
  }

  res.json({ place: createdPlace.toObject({ getters: true }) });
  res.status(201);
};

const updatePlace = async (req, res, next) => {
  const pid = req.params.pid;
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(
      new HttpError(`${error.errors[0].msg} of ${error.errors[0].path}`, 422)
    );
  }

  const { title, description } = req.body;

  let place;
  try {
    place = await Place.findById(pid);
  } catch (error) {
    return next(new HttpError("Something went wrong.", 500));
  }

  if (!place) {
    return next(new HttpError("Could not find a place for provided id.", 404));
  }

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place.", 401));
  }

  try {
    place.title = title;
    place.description = description;
    await place.save();
  } catch (error) {
    return next(new HttpError("Place updation failed.", 500));
  }

  res.json({ place: place.toObject({ getters: true }) });
  res.status(200);
};

const deletePlace = async (req, res, next) => {
  const pid = req.params.pid;

  let place;
  try {
    place = await Place.findById(pid).populate("creator");
  } catch (error) {
    return next(
      new HttpError("Something went wrong, place deletion failed.", 500)
    );
  }

  if (!place) {
    return next(new HttpError("Could not find a place for provided id.", 404));
  }

  if (place.creator.id !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to delete this place."),
      401
    );
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Place deletion failed.", 500));
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.json({ message: "Deleted successfully" }).status(200);
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
