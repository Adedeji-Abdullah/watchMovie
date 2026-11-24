// const mongoose = require("mongoose")
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    name: String,
    password: {
        type: String,
        required: true,
        select: false
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    refreshTokenHash: {
        type: String,
        select: false
    },
})

export default mongoose.model("movieUser", userSchema)