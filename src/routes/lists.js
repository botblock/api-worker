const listsData = require('../util/getLists')();
const getList = require('../util/getList');

module.exports = {
    method: 'GET',
    route: '/api/lists',
    handler: async ({ request }) => {
        // Check if we need to filter
        const filter = new URL(request.url).searchParams.get('filter') === 'true';

        // Get lists with features
        const lists = listsData
            .map(list => getList(list.id))
            .filter(list => {
                if (!filter) return true;

                // Defunct lists and lists with no `api_` data are filtered out
                if (list.defunct) return false;
                return Object.entries(list).filter(([ key, val ]) => key.startsWith('api_') && val !== null).length > 0;
            })
            .sort((a, b) => {
                if (a.discord_only !== b.discord_only) return a.discord_only ? -1 : 1;
                return a.id.localeCompare(b.id) > 0 ? 1 : -1;
            })
            .reduce((obj, list) => ({
                ...obj,
                [list.id]: filter
                    // Keys not starting with `api_` are filtered out
                    ? Object.entries(list).reduce((obj, [ key, val ]) => key.startsWith('api_')
                        ? { ...obj, [key]: val }
                        : obj,
                    {})
                    : list,
            }), {});

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
