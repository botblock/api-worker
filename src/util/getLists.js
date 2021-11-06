// Load all lists with webpack magic
module.exports = () => (ctx => ctx.keys().map(ctx))(require.context('../../data/lists', true, /\.json$/));
