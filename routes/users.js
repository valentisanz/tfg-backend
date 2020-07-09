const bcrypt = require('bcryptjs')
const express = require('express')
const User = require('../models/User')
const Offer = require('../models/Offer')
const { check, validationResult } = require('express-validator');
const checkAuth = require('../middleware/auth')
const router = express.Router()
const axios = require('axios')
const qs = require('querystring')

const NodeCache = require("node-cache");
const myCache = new NodeCache();

router.post('/list', checkAuth.isAuth, async (req, res) => {
    let users
    if (req.body.type) {
        users = await User.find({ type: req.body.type, isAdmin: false })
    }
    if (!req.body.type) {
        users = await User.find()
    }
    res.send(users)
})
router.get('/profile/:username', checkAuth.isAuth, async (req, res) => {
    let user = await User.findOne({ username: req.params.username })
    res.send(user)
})
router.post('/register', [
    check('firstName').isLength({ min: 3 }),
    check('lastName').isLength({ min: 3 }),
    check('username').isLength({ min: 3 }),
    check('email').isEmail(),
    check('password').isLength({ min: 6 }),
    check('type').isLength({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ error: 'Revisa los campos.' })
    if (req.body.password != req.body.passwordConfirm) return res.json({ error: 'Las contraseñas no coinciden.' })

    let user = await User.findOne({ email: req.body.email })
    if (user) return res.json({ error: 'Email ya registrado.' })
    user = await User.findOne({ username: req.body.username })
    if (user) return res.json({ error: 'Nombre de usuario ya registrado.' })

    const salt = await bcrypt.genSalt(14)
    const hashedPassword = await bcrypt.hash(req.body.password, salt)

    user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        type: req.body.type,
    })

    await user.save()
    const jwtToken = user.generateJWT()
    res.status(201).header('Authorization', jwtToken).send({
        message: 'Registrado correctamente.',
        token: jwtToken
    })
})
router.post('/login', [
    check('email').isEmail(),
    check('password').isLength({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ error: 'Rellena los campos.' })

    let user = await User.findOne({ email: req.body.email })
    if (!user) return res.json({ error: 'Email o contraseña incorrecto.' })
    bcrypt.compare(req.body.password, user.password, (err, response) => {
        if (response) {
            const jwtToken = user.generateJWT()
            return res.header('Authorization', jwtToken).send({
                message: 'Sesión iniciada correctamente.',
                token: jwtToken
            })
        }
        if (err) return res.status(400).send({ error: 'ERROR: Algo ha salido mal, vuelve a intentarlo mas tarde.' })
        res.send({ error: 'Email o contraseña incorrecto.' })
    })
})
router.post('/status', checkAuth.isAuth, async (req, res) => {
    const user = await User.findOne({ _id: req.body._id })
    user.status == 'Disponible' ? user.status = 'Ocupado' : user.status = 'Disponible'
    await user.save()
})
router.post('/rate', checkAuth.isAuth, async (req, res) => {
    let count = -1
    const user = await User.findOne({ _id: req.body._id })
    user.ratings.forEach(rating => {
        count = count + 1
        if (rating.username == req.body.username || rating.id == req.body.id) {
            user.ratings.splice(count, 1)
        }
    })
    user.ratings.push({
        id: req.body.id,
        user: req.body.username,
        rating: req.body.rating
    })
    await user.save()
    res.send(user)
})

router.post('/edit', checkAuth.isAuth, async (req, res) => {
    let user = await User.findOne({ email: req.body.email })
    if (user) return res.json({ error: 'Email ya registrado.' })
    user = await User.findOne({ username: req.body.username })
    if (user) return res.json({ error: 'Nombre de usuario ya registrado.' })
    if (!req.body.userId) return res.json({ error: 'Ha habido un error intentalo de nuevo mas tarde.' })

    let actualUser = await User.findOne({ _id: req.body.userId })
    if (req.body.firstName) actualUser.firstName = req.body.firstName
    if (req.body.lastName) actualUser.lastName = req.body.lastName
    if (req.body.username) actualUser.username = req.body.username
    if (req.body.email) actualUser.email = req.body.email
    if (req.body.password) {
        const salt = await bcrypt.genSalt(14)
        const hashedPassword = await bcrypt.hash(req.body.password, salt)
        actualUser.password = hashedPassword
    }

    const userEdited = await actualUser.save()
    if (userEdited) {
        const jwtToken = actualUser.generateJWT()
        return res.send({
            message: 'Usuario guardado correctamente.',
            token: jwtToken
        })
    } else {
        return res.send({
            error: 'Ha habido un error, intentalo mas tarde.'
        })
    }

})
router.post('/saveUserId', checkAuth.isAuth, async (req, res) => {
    myCache.set('userId', req.body.userId)
    res.status(200)
})
router.get('/twitch', async (req, res) => {
    let accessCode = req.url.split('=')[1].split('&')[0]
    let firstUrl = `https://id.twitch.tv/oauth2/token?client_id=tgzmaq1ziowa7p60ui8nzoue1u96wj&client_secret=s1qryd8zpdk81w6sr88jc5aq4snqcf&code=${accessCode}&grant_type=authorization_code&redirect_uri=https://influenced.herokuapp.com/home`
    try {
        const response = await axios.post(firstUrl)
        const userData = await axios({
            method: 'GET',
            url: 'https://id.twitch.tv/oauth2/validate',
            headers: {
                'Authorization': 'OAuth ' + response.data.access_token
            }
        })
        const userData1 = await axios({
            method: 'GET',
            url: `https://api.twitch.tv/helix/users?login=${userData.data.login}`,
            headers: {
                'Client-ID': 'tgzmaq1ziowa7p60ui8nzoue1u96wj'
            }
        })

        const userData2 = await axios({//take followers
            method: 'GET',
            url: `https://api.twitch.tv/helix/users/follows?to_id=${userData1.data.data[0].id}`,
            headers: {
                'Client-ID': 'tgzmaq1ziowa7p60ui8nzoue1u96wj'
            }
        })
        userData1.data.data[0].followers = userData2.data.total
        const user = await User.findById({ _id: myCache.get('userId') })
        const today = new Date()
        user.twitchProfile = {
            displayName: userData1.data.data[0].display_name,
            description: userData1.data.data[0].description,
            totalViews: userData1.data.data[0].view_count,
            followers: userData1.data.data[0].followers,
            profileImg: userData1.data.data[0].profile_image_url,
            lastUpdate: today
        }
        await user.save()
        res.redirect('http://localhost:3000/profile/' + user.username)
    } catch (e) {
        console.log(e)
    }
})
router.post('/lastStreams', checkAuth.isAuth, async (req, res) => {

    try {
        const userData = await axios({
            method: 'GET',
            url: `https://api.twitch.tv/helix/users?login=${req.body.twitchUsername}`,
            headers: {
                'Client-ID': 'tgzmaq1ziowa7p60ui8nzoue1u96wj'
            }
        })
        const lastStreamings = await axios({
            method: 'GET',
            url: `https://api.twitch.tv/helix/videos?user_id=${userData.data.data[0].id}`,
            headers: {
                'Client-ID': 'tgzmaq1ziowa7p60ui8nzoue1u96wj'
            }
        })
        const today = new Date
        let videosData = {
            data: [],
            views: {}
        }
        let totalViews = 0
        lastStreamings.data.data.forEach(videoData => {
            let difference = today.getTime() - Date.parse(videoData.created_at)
            let differenceInDays = difference / (1000 * 3600 * 24)
            if (differenceInDays < 30) {
                totalViews = totalViews + videoData.view_count
                videosData.data.push({
                    title: videoData.title,
                    views: videoData.view_count,
                    duration: videoData.duration,
                    date: videoData.created_at
                })
            }
        })
        videosData.views = {
            averageVideoViews: totalViews / videosData.data.length,
            averageDailyViews: totalViews / 30,
            totalViews
        }
        res.send(videosData)
    } catch (err) {
        res.send({ error: 'Ha habido un error, intentalo de nuevo.' })
    }
})
router.post('/deleteTwitch', checkAuth.isAuth, async (req, res) => {
    myCache.del('userId')

    const user = await User.findById({ _id: req.body.userId })
    user.twitchProfile = {}
    await user.save()
    res.send({
        message: 'Perfil eliminado correctamente.',
    })
})
router.post('/deleteInstagram', checkAuth.isAuth, async (req, res) => {
    myCache.del('userId')
    const user = await User.findById({ _id: req.body.userId })
    user.instagramProfile = {}
    await user.save()
    res.send({
        message: 'Perfil eliminado correctamente.',
    })
})
router.post('/delete', checkAuth.isAdmin, async (req, res) => {
    try {
        const user = await User.findById({ _id: req.body.userId })
        let offersIdList = []
        user.offers.forEach(offer => {
            offersIdList.push(offer._id)
        })

        offersIdList.forEach(async (id) => {
            await Offer.deleteOne({ _id: id })
        })

        await User.deleteOne({ _id: req.body.userId })
        res.send({
            message: 'Usuario eliminado correctamente.',
        })
    } catch (e) {
        res.send({
            message: 'Ha habido un error, intentalo de nuevo.',
            err: e
        })
    }
})
router.post('/toggleAdmin', checkAuth.isAdmin, async (req, res) => {
    const user = await User.findById({ _id: req.body.userId })
    user.isAdmin = !user.isAdmin
    if (await user.save()) {
        res.send({
            message: 'OK'
        })
    } else {
        res.send({
            error: 'Ha habido un error.'
        })
    }
})
router.get('/instagram', async (req, res) => {
    const accessToken = req.url.split('code=')[1]
    try {
        const requestBody = {
            client_id: "867061923776185",
            client_secret: "eceb738af4bac61d6bc96e8ca4862f9d",
            code: accessToken,
            grant_type: "authorization_code",
            redirect_uri: "https://influenced.herokuapp.com/user/instagram"
        }
        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
        const response = await axios.post('https://api.instagram.com/oauth/access_token', qs.stringify(requestBody), config)
        const instagramData = await axios.get(`https://graph.instagram.com/${response.data.user_id}?fields=account_type,media_count,username&access_token=${response.data.access_token}`)

        const user = await User.findById({ _id: myCache.get('userId') })
        const today = new Date()
        user.instagramProfile = {
            account_type: instagramData.data.account_type,
            media_count: instagramData.data.media_count,
            username: instagramData.data.username,
            lastUpdate: today
        }
        await user.save()
        res.redirect('http://localhost:3000/profile/' + user.username)
    } catch (err) {
        console.log(err)
    }
})

module.exports = router
