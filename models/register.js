// const mongoose = require("mongoose")
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    name: String,
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    }
})

export default mongoose.model("movieUser", userSchema)