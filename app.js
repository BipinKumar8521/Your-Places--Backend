require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const placeRoutes = require("./routes/place-routes");
const userRoutes = require("./routes/user-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/awake", (req, res, next) => {
  res.json({ message: "awake" });
});
app.use("/api/places", placeRoutes);
app.use("/api/users", userRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 505);
  res.json({ message: error.message || "Unknown error occured." });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(
    app.listen(process.env.PORT || 5000, () => {
      console.log("Listening... & connected to db");

      //   setInterval(() => {
      //     fetch("https://yourplaces-backend-66ez.onrender.com/api/awake").then(
      //       (res) => {
      //         console.log("awake");
      //       }
      //     );
      //   }, 1000 * 60 * 5);
    })
  )
  .catch((err) => {
    console.log(err);
  });
