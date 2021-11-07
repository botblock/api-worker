const getList = require('../../util/getList');

module.exports = {
    method: 'GET',
    route: '/api/lists/:id',
    handler: ({ request }) => {
        // Attempt to get the list
        const list = getList(request.params.id);
        if (list) return new Response(JSON.stringify(list, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
            },
        });

        // Not found
        return new Response(JSON.stringify({ error: true, status: 404, message: 'List not found' }, null, 2), {
            status: 404,
                headers: {
                'Content-Type': 'application/json',
                    'X-Served-By': 'botblock-api-worker',
            },
        });
    },
};
