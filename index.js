const mongoose = require('mongoose')
const cors = require('cors')
const config = require('./config')
const express = require('express')
const user = require('./routes/users')
const offer = require('./routes/offers')
const app = express()
app.use(express.json())
app.use(cors())
app.use('/user', user)
app.use('/offer', offer)


const port = process.env.PORT || 3003

app.listen(port, () => console.log('Listening to port: ' + port + '...'))
mongoose.connect(config.BBDD)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('ERROR: Cannot connect to MongoDB \n' + err))