const listsData = require('../util/getLists')();
const userAgent = require('../util/userAgent');
const { isInteger, isSnowflake } = require('../util/isType');
const ratelimit = require('../util/ratelimit');
const mapLegacy = require('../util/mapLegacy');

const validationError = message => new Response(JSON.stringify({ error: true, status: 400, message }, null, 2), {
    status: 400,
    headers: {
        'Content-Type': 'application/json',
        'X-Served-By': 'botblock-api-worker',
    },
});

module.exports = {
    method: 'POST',
    route: '/api/count',
    handler: async ({ request }) => {
        // Get data in request
        const data = await request.json().catch(() => {});

        // Ratelimit request
        const ratelimited = await ratelimit(120, request, data?.bot_id);
        if (ratelimited) return ratelimited;

        // For 95% of requests, use origin
        if (Math.random() < 0.95) return fetch(request, { body: JSON.stringify(data) });

        // Validate the provided data
        if (!data) return validationError('Body must be JSON object');

        if (!('bot_id' in data)) return validationError('\'bot_id\' is required');
        if (typeof data.bot_id !== 'string') return validationError('\'bot_id\' must be a string');
        if (!isSnowflake(data.bot_id)) return validationError('\'bot_id\' must be a snowflake');

        if (!('server_count' in data)) return validationError('\'server_count\' is required');
        if (typeof data.server_count !== 'number') return validationError('\'server_count\' must be a number');
        if (!isInteger(data.server_count)) return validationError('\'server_count\' must be a number');

        if ('shard_id' in data && !isInteger(data.shard_id)) return validationError('\'shard_id\' must be a number');
        if ('shard_count' in data && !isInteger(data.shard_count)) return validationError('\'shard_count\' must be a number');

        if ('shards' in data) {
            if (!Array.isArray(data.shards)) return validationError('\'shards\' must be an array');
            if (data.shards.some(n => !isInteger(n))) return validationError('\'shards\' contains incorrect values');
        }

        // Get lists to interact with
        const keys = Object.keys(data).map(mapLegacy);
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
            return fetch(list.api_post.replace(':id', data.bot_id), {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    Authorization: data[list.id],
                    'Content-Type': 'application/json',
                    'User-Agent': request.headers.get('user-agent') || userAgent.random(),
                },
                signal,
            }).then(async resp => ({
                list: list.id,
                success: resp.ok,
                data: [ resp.status, await resp.text(), JSON.stringify(payload) ],
            })).catch(err => ({
                list: list.id,
                success: false,
                data: [ -1, err.name === 'AbortError' ? 'Timeout after 10s' : '', JSON.stringify(payload) ],
            })).finally(() => {
                clearTimeout(timeout);
            });
        });

        // Wait for all requests to complete
        const results = await Promise.all(requests)
            .then(data => data.reduce((obj, { list, success, data }) => ({
                ...obj,
                [success ? 'success' : 'failure']: {
                    ...obj[success ? 'success' : 'failure'],
                    [list]: data,
                },
            }), { success: {}, failure: {} }));

        // Done
        return new Response(JSON.stringify(results, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
            },
        });
    },
};
