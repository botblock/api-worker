const legacy = require('../../data/legacy.json');

module.exports = {
    method: 'GET',
    route: '/api/legacy-ids',
    handler: () => {
        // Get legacy IDs and sort
        const map = Object.entries(legacy)
            .sort((a, b) => a[0].localeCompare(b[0]) ? -1 : 1)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        return new Response(JSON.stringify(map, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
            },
        });
    },
};
