
exports.seed = function (knex, Promise) {
  // Deletes ALL existing entries
  return knex('gallery').del()
    .then(function () {
      // Inserts seed entries
      return knex('gallery').insert([
        { user_id: 1, url: 'https://i.ytimg.com/vi/HnCakwxqHhU/maxresdefault.jpg', description: 'tiger and t-rex' },
        { user_id: 1, url: 'https://pbs.twimg.com/media/EC16iffXsAABKfT.jpg', description: 'beauty incarnate' },
        { user_id: 2, url: 'https://preview.redd.it/60vljf8xbyu21.gif?format=png8&s=7734639ad9b845602b11b070941bd290627507a1', description: 'good boy' },
        { user_id: 3, url: 'https://66.media.tumblr.com/7610441bc8b2a32c44baa67b4b64a5db/tumblr_inline_pslc3vygSU1sc3mrj_540.png', description: 'mmmmmm tasty' }
      ]);
    });
};
