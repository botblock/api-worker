const listsData = require('../util/getLists')();
const userAgent = require('../util/userAgent');

module.exports = {
    method: 'POST',
    route: '/api/count',
    handler: async ({ request, wait, sentry }) => {
        const data = await request.json();

        // TODO: Validate data

        // Get lists to interact with
        const keys = Object.keys(data);
        const lists = listsData.filter(list => keys.includes(list.id) && !!list.api_post && !list.defunct);

        // Run all requests concurrently
        const requests = lists.map(list => {
            // Generate the payload
            const payload = {};
            if ('shards' in data && list.api_shards) payload[list.api_shards] = data.shards;
            if ('server_count' in data && list.api_field) payload[list.api_field] = data.server_count;
            if ('shard_id' in data && list.api_shard_id) payload[list.api_shard_id] = data.shard_id;
            if ('shard_count' in data && list.api_shard_count) payload[list.api_shard_count] = data.shard_count;

            // Create the 10s abort controller
            const controller = new AbortController();
            const { signal } = controller;
            const timeout = setTimeout(() => controller.abort(), 10000);

            // Make the request
            return fetch(list.api_post, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    Authorization: data[list.id],
                    'Content-Type': 'application/json',
                    'User-Agent': request.headers['user-agent'] || userAgent.random(),
                },
                signal,
            }).then(async resp => {
                return [ list.id, resp.status, await resp.text(), JSON.stringify(payload) ];
            }).catch(err => {
                return [ list.id, -1, err.name === 'AbortError' ? 'Timeout after 10s' : '', JSON.stringify(payload) ];
            }).finally(() => {
                clearTimeout(timeout);
            });
        });

        // Wait for all requests to complete
        const results = await Promise.all(requests)
            .then(data => data.reduce((obj, [ id, ...data ]) => ({ ...obj, [id]: data }), {}));

        // Done
        return new Response(JSON.stringify(results, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
            },
        })
    },
};
