const listsData = require('../../util/getLists')();
const { isSnowflake } = require('../../util/isType');
const ratelimit = require('../../util/ratelimit');
const userAgent = require('../../util/userAgent');

const getMostCommon = array => Array.isArray(array) && array.length
    ? [ ...array.reduce((map, val) => {
        map.set(val, (map.get(val) || 0) + 1);
        return map;
    }, new Map()).entries() ].sort((a, b) => a[1] < b[1] ? 1 : -1)[0][0]
    : null;

const jsonOrText = text => {
    try {
        return JSON.parse(text);
    } catch (_) {
        return text;
    }
};

module.exports = {
    method: 'GET',
    route: '/api/bots/:id',
    handler: async ({ request }) => {
        // Validate the id
        if (!isSnowflake(request.params.id)) return new Response(JSON.stringify({
            error: true,
            status: 400,
            message: '\'id\' must be a snowflake',
        }, null, 2), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
            },
        });

        // Ratelimit request
        const ratelimited = await ratelimit(30, request, request.params.id);
        if (ratelimited) return ratelimited;

        // Get lists to interact with
        const lists = listsData.filter(list => !!list.api_get && !list.defunct);

        // Run all requests concurrently
        const requests = lists.map(list => {
            // Create the 2s abort controller
            const controller = new AbortController();
            const { signal } = controller;
            const timeout = setTimeout(() => controller.abort(), 2000);

            // Make the request
            return fetch(list.api_get.replace(':id', request.params.id), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': request.headers.get('user-agent') || userAgent.random(),
                    'X-Forwarded-For': request.headers.get('cf-connecting-ip'),
                },
                signal,
            }).then(async resp => ({
                list: list.id,
                data: [ jsonOrText(await resp.text().catch(() => '')), resp.status ],
            })).catch(err => ({
                list: list.id,
                data: [ err.name === 'AbortError' ? 'Timeout after 2s' : '', -1 ],
            })).finally(() => {
                clearTimeout(timeout);
            });
        });

        // Wait for all requests to complete
        const results = await Promise.all(requests)
            .then(data => data.reduce((obj, { list, data }) => ({ ...obj, [list]: data }), {}));

        // Create empty data obj
        const data = {
            username: [],
            discriminator: [],
            owners: [],
            server_count: [],
            invite: [],
            prefix: [],
            website: [],
            github: [],
            support: [],
            library: [],
        };

        // Normalize response from each list
        for (const id of Object.keys(results)) {
            // Check the response from list was good
            const list = results[id];
            if (list[1] !== 200) continue;
            if (!list[0] || typeof list[0] !== 'object') continue;

            // Work through the fields in the response
            for (const [ key, value ] of Object.entries(list[0])) {
                // If bad value, skip
                if (!value) continue;

                // Bot name
                if (['name', 'username', 'bot_name'].includes(key)) data.username.push(value);
                if (['discrim', 'discriminator', 'disc'].includes(key)) data.discriminator.push(String(value));

                // Owners
                if (['owner', 'owners', 'authors', 'bot_owners', 'owner_id', 'coOwners', 'secondaryOwners'].includes(key)) {
                    // Ensure we're working with an array
                    const valueArray = Array.isArray(value) ? value : [ value ];
                    for (const owner of valueArray) {
                        if (typeof owner === 'string' || typeof owner === 'number') data.owners.push(owner);
                        if (typeof owner === 'object') {
                            if (owner['id']) data.owners.push(owner['id']);
                            if (owner['userId']) data.owners.push(owner['userId']);
                        }
                    }
                }

                // Server count
                if (['count', 'servers', 'server_count', 'servercount', 'serverCount', 'bot_server_count', 'guilds',
                    'guild_count', 'guildcount', 'guildCount'].includes(key)) {
                    const temp = Number.parseInt(value);
                    if (typeof temp === 'number') data.server_count.push(temp);
                }
                if (key === 'stats' && typeof value === 'object') {
                    if (value['guilds']) {
                        const temp = Number.parseInt(value['guilds']);
                        if (typeof temp === 'number') data.server_count.push(temp);
                    }
                }

                // Links
                if (key === 'links' && typeof value === 'object') {
                    if (value['invite']) data.invite.push(value['invite']);
                    if (value['support']) data.support.push(value['support']);
                }
                if (['invite', 'bot_invite', 'botInvite', 'bot_invite_link', 'oauth_url', 'inviteURL'].includes(key)) {
                    if (typeof key === 'string') data.invite.push(value);
                }
                if (['website', 'bot_website', 'websiteURL'].includes(key)) {
                    if (typeof key === 'string') data.website.push(value);
                }
                if (['github', 'bot_github_repo', 'openSource', 'git', 'source_code'].includes(key)) {
                    if (typeof key === 'string') data.github.push(value);
                }
                if (['support', 'supportInvite', 'support_server', 'discord', 'server_invite', 'bot_support_discord',
                    'server', 'supportServer'].includes(key)) {
                    if (typeof key === 'string') data.support.push(value);
                }

                // Prefix
                if (['prefix', 'bot_prefix'].includes(key)) {
                    if (typeof key === 'string') data.prefix.push(value);
                }

                // Library
                if (['library', 'libraryName', 'bot_library', 'lang'].includes(key)) {
                    if (typeof key === 'string') data.library.push(value);
                }
            }
        }

        // Condense the output
        const response = {
            id: request.params.id,
            username: getMostCommon(data.username) || 'Unknown',
            discriminator: getMostCommon(data.discriminator) || '0000',
            owners: data.owners.filter((v, i, a) => a.indexOf(v) === i && isSnowflake(v)) || [],
            server_count: Math.max(...data.server_count) || 0,
            invite: getMostCommon(data.invite) || '',
            prefix: getMostCommon(data.prefix) || '',
            website: getMostCommon(data.website) || '',
            github: getMostCommon(data.github) || '',
            support: getMostCommon(data.support) || '',
            library: getMostCommon(data.library) || '',
            list_data: results,
        };

        // TODO: Cache?

        // Done
        return new Response(JSON.stringify(response, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
            },
        });
    },
};
