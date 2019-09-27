
exports.up = function (knex, Promise) {
    return knex.schema.createTable('gallery', (table) => {
        table.increments();
        table.integer('user_id').references('id').inTable('users').notNullable();
        table.string('url').notNullable();
        table.text('description');
        table.timestamps(true, true);
    });
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('gallery');
};
