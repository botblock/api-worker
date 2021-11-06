// Load all routes with webpack magic
module.exports = () => (ctx => ctx.keys().map(ctx))(require.context('../routes', true, /\.js$/));
