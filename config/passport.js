const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

function initialize(passport, User) {
  const authenticateUser = async (login, password, done) => {
    var user1 = await User.findOne({ login: login }).exec();
    var user2 = await User.findOne({ login: "n_" + login }).exec();
    var user = user1;
    if (user1 == null) {
      user = user2;
    }

    if (user == null) {
      return done(null, false, { message: 'No user with that login' });
    }
    try {
      if (bcrypt.compareSync(password, user.password)) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (e) {
      return done(e);
    }
  }


  passport.use(new LocalStrategy({ usernameField: 'login' }, authenticateUser));
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    var user = await User.findById(id).exec();
    return done(null, user);
  })
}

module.exports = initialize;
