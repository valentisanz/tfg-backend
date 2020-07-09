const jwt = require('jsonwebtoken')
const config = require('../config')
function isAuth(req, res, next) {
    try {
        if (req.headers.authorization) {
            const decoded = jwt.verify(req.headers.authorization, config.jPASS)
            if (decoded) {
                next()
            }
        } else {
            return res.status(401).json({ message: 'Inicia sesión para acceder a esta pagina.' })
        }
    } catch (error) {
        return res.status(401).json({ message: 'Token incorrecto.' })
    }
}
function isAdmin(req, res, next) {
    try {
        if (req.headers.authorization) {
            const decoded = jwt.verify(req.headers.authorization, config.jPASS)
            if (decoded.isAdmin) {
                next()
            } else {
                return res.json({ message: 'Acceso denegado.' })
            }
        } else {
            return res.status(401).json({ message: 'Inicia sesión para acceder a esta pagina.' })
        }
    } catch (error) {
        return res.status(401).json({ message: 'Token incorrecto.' })
    }
}
module.exports = { isAuth, isAdmin }