const User = require('./models/User');
const Gallery = require('./models/Gallery');


module.exports = function (req, res, next) {
    req.database = {
        User,
        Gallery
    };
    next();
};