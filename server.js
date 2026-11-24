import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import cookieParser from 'cookie-parser'

import movieUser from "./models/register.js";

dotenv.config();

const app = express();

const port = Number(process.env.PORT) || 8000;
const accessTokenSecret =
  process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const tokenIssuer = "movie-api";
const tokenAudience = "movie-app";
const refreshTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookieParser())

function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;

    if (cookie.slice(0, separatorIndex).trim() === name) {
      return cookie.slice(separatorIndex + 1).trim();
    }
  }

  return null;
}

function createAccessToken(user) {
  return jwt.sign(
    { email: user.email, tokenType: "access" },
    accessTokenSecret,
    {
      subject: String(user._id),
      expiresIn: "15m",
      issuer: tokenIssuer,
      audience: tokenAudience,
      algorithm: "HS256",
    },
  );
}

function createRefreshToken(user) {
  return jwt.sign({ tokenType: "refresh" }, refreshTokenSecret, {
    subject: String(user._id),
    jwtid: randomUUID(),
    expiresIn: "7d",
    issuer: tokenIssuer,
    audience: tokenAudience,
    algorithm: "HS256",
  });
}

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    ...cookieOptions,
    maxAge: refreshTokenLifetimeMs,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", cookieOptions);
}

function requireAccessToken(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  try {
    const payload = jwt.verify(token, accessTokenSecret, {
      issuer: tokenIssuer,
      audience: tokenAudience,
      algorithms: ["HS256"],
    });

    if (
      typeof payload === "string" ||
      payload.tokenType !== "access" ||
      typeof payload.sub !== "string"
    ) {
      return res.status(401).json({ message: "Invalid access token." });
    }

    req.authUserId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
}

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
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await movieUser
      .findOne({ email: normalizedEmail })
      .select("+password");
    const passwordMatches =
      existingUser && (await bcrypt.compare(password, existingUser.password));

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const accessToken = createAccessToken(existingUser);
    const refreshToken = createRefreshToken(existingUser);
    existingUser.refreshTokenHash = hashRefreshToken(refreshToken);
    await existingUser.save();
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: String(existingUser._id),
        name: existingUser.name,
        email: existingUser.email,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Unable to log in right now." });
  }
});

app.post("/refresh", async (req, res) => {
  const refreshToken = readCookie(req, "refreshToken");

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token is required." });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, refreshTokenSecret, {
      issuer: tokenIssuer,
      audience: tokenAudience,
      algorithms: ["HS256"],
    });
  } catch {
    clearRefreshCookie(res);
    return res.status(401).json({ message: "Invalid or expired refresh token." });
  }

  if (
    typeof payload === "string" ||
    payload.tokenType !== "refresh" ||
    typeof payload.sub !== "string"
  ) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: "Invalid refresh token." });
  }

  try {
    const user = await movieUser.findById(payload.sub).select("_id email");
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Account no longer exists." });
    }

    const nextRefreshToken = createRefreshToken(user);
    const accessToken = createAccessToken(user);
    const currentHash = hashRefreshToken(refreshToken);
    const nextHash = hashRefreshToken(nextRefreshToken);
    const update = await movieUser.updateOne(
      { _id: payload.sub, refreshTokenHash: currentHash },
      { $set: { refreshTokenHash: nextHash } },
    );

    if (update.modifiedCount !== 1) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Refresh token has been revoked." });
    }

    setRefreshCookie(res, nextRefreshToken);
    return res.status(200).json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: 900,
    });
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    return res.status(500).json({ message: "Unable to refresh your session." });
  }
});

app.post("/logout", async (req, res) => {
  console.log("trueii")
  const refreshToken = JSON.stringify(req.cookies.refreshToken)
  console.log(hashRefreshToken(refreshToken))
  // clearRefreshCookie(res);

  try {
    if (refreshToken) {
      await movieUser.updateOne(
        { refreshTokenHash: hashRefreshToken(refreshToken) },
        { $unset: { refreshTokenHash: '' } },
      );
    }

    
    res.clearCookie("refreshToken", cookieOptions)
    return res.status(200).json({ message: "Logged out successfully." });
    
  } catch (error) {
    console.error("Error logging out:", error);
    return res.status(500).json({ message: "Unable to log out right now." });
  }
});

app.get("/", requireAccessToken, async (req, res) => {
  try {
    const user = await movieUser
      .findById(req.authUserId)
      .select("_id name email");

    if (!user) {
      return res.status(401).json({ message: "Account no longer exists." });
    }

    return res.status(200).json({
      user: { id: String(user._id), name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Error loading protected page:", error);
    return res.status(500).json({ message: "Unable to load the protected page." });
  }
});

app.get("/me", requireAccessToken, async (req, res) => {
  try {
    const user = await movieUser
      .findById(req.authUserId)
      .select("_id name email");

    if (!user) {
      return res.status(401).json({ message: "Account no longer exists." });
    }

    return res.status(200).json({
      user: { id: String(user._id), name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Error loading authenticated user:", error);
    return res.status(500).json({ message: "Unable to load your account." });
  }
});

app.get('/logout2', (req, res) => {
  res.clearCookie('refreshToken', cookieOptions)
  console.log("logout successful")
})

async function startServer() {
  if (
    !accessTokenSecret ||
    accessTokenSecret.length < 32 ||
    !refreshTokenSecret ||
    refreshTokenSecret.length < 32
  ) {
    console.error(
      "Set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET to random secrets of at least 32 characters.",
    );
    process.exitCode = 1;
    return;
  }

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
