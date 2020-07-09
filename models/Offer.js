const mongoose = require('mongoose')
const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: Object,
        required: true
    },
    body: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
})

const Offer = mongoose.model('offer', offerSchema)

module.exports = Offer