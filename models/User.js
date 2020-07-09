const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const config = require('../config')
const Offer = require('./Offer')
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    verified: {
        type: Boolean,
        default: false
    },
    offers: {
        type: Array
    },
    ratings: {
        type: Array
    },
    status: {
        type: String,
        default: "Disponible"
    },
    twitchProfile: {
        type: Object,
    },
    instagramProfile: {
        type: Object,
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        required: true
    }
})

userSchema.methods.generateJWT = function () {
    return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email,
        isAdmin: this.isAdmin,
        type: this.type
    }, config.jPASS)
}
const User = mongoose.model('user', userSchema)

module.exports = User