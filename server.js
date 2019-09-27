const express = require('express');
const bodyParser = require('body-parser');
const decorator = require('./database/decorator');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcryptjs');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
var path = require('path');
const exphbs = require('express-handlebars');
var methodOverride = require('method-override');

const PORT = 8080;
const saltRounds = 12;
const User = require('./database/models/User');
const Gallery = require('./database/models/Gallery');

require('dotenv').config();

const client = redis.createClient({ url: process.env.REDIS_URL });
const app = express();
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/css', express.static(path.join(__dirname, '/css')));
app.use(decorator);

app.engine('.hbs', exphbs({ extname: '.hbs' }));
app.set('view engine', '.hbs');

app.use(
    session({
        store: new RedisStore({ client }),
        secret: process.env.REDIS_SECRET,
        resave: false,
        saveUninitialized: false,
    }),
);
app.use(passport.initialize());
app.use(passport.session());

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        return res.redirect('/login')
    }
};

passport.use(
    new LocalStrategy(function (username, password, done) {
        return new User({ username: username })
            .fetch()
            .then((user) => {
                if (user === null) {
                    //bad username
                    return done(null, false, { message: 'bad username or password' });
                }
                else {
                    user = user.toJSON();

                    bcrypt.compare(password, user.password)
                        .then((res) => {
                            // Happy route: username exists, password matches
                            if (res) {
                                return done(null, user); //this is the user that goes to serialize
                            }
                            // Error Route: Username exists, password does not match
                            else {
                                return done(null, false, { message: 'bad username or password' });
                            }
                        });
                }
            })
            .catch((err) => {
                console.log('error: ', err);
                return done(null, false, { message: 'bad username or password' });
            });
    }));
passport.serializeUser(function (user, done) {
    console.log('serializing');
    return done(null, { id: user.id, username: user.username });
});

passport.deserializeUser(function (user, done) {
    console.log('deserializing');
    return done(null, user);
});

app.use(
    "/login",
    passport.authenticate("local", {
        successRedirect: "/gallery",
        failureRedirect: "/login.html"
    })
);

app.post('/register', (req, res) => {
    bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) { console.log(err); } // return 500

        bcrypt.hash(req.body.password, salt, (err, hash) => {
            if (err) { console.log(err); } // return 500

            return new User({
                username: req.body.username,
                password: hash
            })
                .save()
                .then((user) => {
                    console.log(user)
                    return res.redirect('/login');
                })
                .catch((err) => {
                    console.log(err);
                    return res.render('register', { err: 'User already exists.' });
                });
        });
    });
});

app.get('/register', (req, res) => {
    res.status(200).render('register');
});
app.get('/', (req, res) => {
    res.redirect('/gallery');
});
app.get('/gallery', (req, res) => {
    return Gallery.fetchAll({ withRelated: ['user'] })
        .then((results) => {
            let gallery = results.toJSON();
            if (req.user) {
                return res.status(200).render('gallery', { gallery: gallery, loggedIn: true, username: req.user.username })
            } else {
                return res.status(200).render('gallery', { gallery: gallery });
            }
        })
        .catch((err) => {
            console.log('Error: ', err)
            res.status(500).render('404')
        });
});
app.get('/gallery/:id', (req, res) => {
    let paramID = req.params.id;
    return Gallery.where({ id: paramID }).fetchAll({ withRelated: ['user'] })
        .then((results) => {
            let newResult = results.toJSON();
            let gallery = newResult[0];
            if (newResult.length === 0) {
                throw new Error('Page not found.')
            }
            if (req.user.id === gallery.user_id) {
                res.status(200).render('gallerysingle', { gallery: gallery, loggedIn: true })
            } else {
                res.status(200).render('gallerysingle', { gallery: gallery })
            }
        })
        .catch((err) => {
            console.log('Error: ', err);
            res.status(404).render('404')
        });
});
app.get('/gallery/:id/edit', isAuthenticated, (req, res) => {
    let paramID = req.params.id;
    let userID = req.user.id;
    return Gallery.where({ id: paramID, user_id: userID }).fetchAll({ withRelated: ['user'] })
        .then((results) => {
            let gallery = results.toJSON();
            if (gallery.length === 0) {
                return res.render('notauthenticated', { paramID: paramID });
            }
            res.status(200).render('editgallery', gallery[0])
        })
        .catch((err) => {
            console.log('Error: ', err);
            res.status(500);
        });
});
app.get('/new', isAuthenticated, (req, res) => {
    let thisUser = req.user.id;
    res.render('new', { userID: thisUser });
});
app.post('/new', isAuthenticated, (req, res) => {
    let newUrl = req.body.url;
    let newDescr = req.body.description;
    let thisUser = req.user.id
    if (newDescr && thisUser) {
        return new Gallery({ url: newUrl, description: newDescr, user_id: thisUser })
            .save(null, { method: 'insert' })
            .then((model) => {
                res.redirect('/gallery');
            });
    } else {
        return res.render('new', { err: 'Both fields required.' });
    }
});
app.put('/gallery/:id', (req, res) => {
    let paramID = req.params.id;
    let newDescr = req.body.description;
    let newUrl = req.body.url
    return new Gallery({ id: paramID })
        .save({ url: newUrl, description: newDescr }, { patch: true })
        .then((model) => {
            res.redirect(`/gallery/${paramID}`)
        })
        .catch((err) => {
            console.log('Error: ', err);
            res.status(500);
        });
});
app.delete('/gallery/:id', isAuthenticated, (req, res) => {
    let paramID = req.params.id;
    let userID = req.user.id;
    return Gallery.where({ id: paramID, user_id: userID }).fetchAll({ withRelated: ['user'] })
        .then((results) => {
            let gallery = results.toJSON();
            if (req.user.username === gallery.user.username) {
                return Gallery.where({ id: paramID }).destroy()
                    .then((results) => {
                        res.status(200).redirect('/gallery');
                    })
                    .catch((err) => {
                        console.log('Error: ', err);
                        res.status(500);
                    });
            };
        });
});
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/gallery');
});
app.listen(PORT, () => {
    console.log(`Server started on PORT:${PORT}$`);
});