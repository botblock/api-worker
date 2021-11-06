// Load all features with webpack magic
module.exports = () => (ctx => ctx.keys().map(ctx))(require.context('../../data/features', true, /\.json$/));
