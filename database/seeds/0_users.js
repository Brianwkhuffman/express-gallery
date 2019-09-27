const bcrypt = require('bcryptjs');

exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('users').del()
    .then(function () {
      // Inserts seed entries
      return knex('users').insert([
        { username: 'user1', password: bcrypt.hashSync("password1", 12) },
        { username: 'anotheruser', password: bcrypt.hashSync("password2", 12) },
        { username: 'userthird', password: bcrypt.hashSync("password3", 12) }
      ]);
    });
};
