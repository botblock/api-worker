const listsData = require('../util/getLists')();
const getList = require('../util/getList');

module.exports = {
    method: 'GET',
    route: '/api/lists',
    handler: async ({ request }) => {
        // Get lists with features
        const lists = listsData.map(list => getList(list.id)).sort((a, b) => {
            if (a.discord_only !== b.discord_only) return a.discord_only ? -1 : 1;
            return a.id.localeCompare(b.id) ? 1 : -1;
        }).reduce((obj, list) => ({ ...obj, [list.id]: list }), {});

        // Done
        return new Response(JSON.stringify(lists, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
            },
        });
    },
};
