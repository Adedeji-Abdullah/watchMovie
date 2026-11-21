import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import movieUser from "./models/register.js";
import { redirect } from "next/dist/server/api-utils/index.js";

dotenv.config();

const app = express();

const port = Number(process.env.PORT) || 8000;

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const atIndex = normalizedEmail.indexOf("@");
  const lastDotIndex = normalizedEmail.lastIndexOf(".");
  const hasWhitespace = [...normalizedEmail].some(
    (character) => character.trim() === "",
  );

  if (
    !normalizedName ||
    atIndex <= 0 ||
    atIndex !== normalizedEmail.lastIndexOf("@") ||
    lastDotIndex <= atIndex + 1 ||
    lastDotIndex === normalizedEmail.length - 1 ||
    hasWhitespace ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return res
      .status(400)
      .json({
        message:
          "Enter your name, a valid email address, and a password of at least 8 characters.",
      });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await movieUser.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
    });
    return res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    console.error("Error registering user:", error);
    return res
      .status(500)
      .json({
        message: "Unable to create your account right now. Please try again.",
      });
  }
});

app.post("/login", async (req, res) => {
  const payload = req.body;
  try {
    const existingUser = await movieUser.findOne({ email: payload.email });
    console.log(existingUser, await movieUser.find());
    if (existingUser) {
      const token = jwt.sign(process.env.ACCESS_TOKEN, payload)
      console.log(token)
      res.status(200).json("successfully logged in");
      redirect("/");
    } else {
      res
        .status(403)
        .json("You are not a registered user, you need tologin first");
    }

  } catch (error) {
    res.json(error);
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exitCode = 1;
  }
}

startServer();
