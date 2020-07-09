const User = require('../models/User')
const express = require('express')
const Offer = require('../models/Offer')
const { check, validationResult } = require('express-validator');
const checkAuth = require('../middleware/auth')
const router = express.Router()


router.get('/list', checkAuth.isAuth, async (req, res) => {
    const offers = await Offer.find()
    res.send(offers)
})
router.post('/create', checkAuth.isAuth, [
    check('title').isLength({ min: 1 }),
    check('body').isLength({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ error: errors.array() })


    const user = await User.findOne({ _id: req.body._id })
    offer = new Offer({
        title: req.body.title,
        body: req.body.body,
        author: {
            _id: user._id,
            username: user.username
        }
    })
    user.offers.push(offer)
    await offer.save()
    await user.save()
    res.send(offer)
})
router.post('/delete', checkAuth.isAuth, async (req, res) => {

    await Offer.deleteOne({ _id: req.body.offerId })
    const user = await User.findOne({ _id: req.body.userId })
    for (let i = 0; i < user.offers.length; i++) {
        if (user.offers[i]._id == req.body.offerId) {
            user.offers.splice(i, 1)
        }
    }

    if (await user.save()) {
        res.send({
            message: 'Oferta eliminada correctamente.'
        })
    } else {
        res.send({
            error: 'Ha habido un error, intentalo de nuevo.'
        })
    }

})
module.exports = router