/* global RATELIMIT */

const { isSnowflake } = require('./isType');

module.exports = async (limit, request, botId = '') => {
    // Construct the key
    const route = new URL(request.url).pathname;
    const ip = request.headers.get('cf-connecting-ip');
    const extra = botId && isSnowflake(botId) ? botId : '';
    const key = `${request.method}-${route}-${ip}${extra ? `-${extra}` : ''}`;

    // Check if the key exists
    const existing = await RATELIMIT.get(key);
    if (existing && Number(existing) > Date.now()) {
        // Ratelimited
        const data = {
            error: true,
            status: 429,
            retry_after: Math.floor((Number(existing) - Date.now()) / 1000),
            ratelimit_reset: Math.floor(Number(existing) / 1000),
            ratelimit_method: request.method,
            ratelimit_route: route,
            ratelimit_ip: ip,
            ratelimit_bot_id: extra,
        };
        return new Response(JSON.stringify(data, null, 2), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'botblock-api-worker',
                'Retry-After': data.retry_after,
                'X-Rate-Limit-Reset': data.ratelimit_reset,
                'X-Rate-Limit-Method': data.ratelimit_method,
                'X-Rate-Limit-Route': data.ratelimit_route,
                'X-Rate-Limit-IP': data.ratelimit_ip,
                'X-Rate-Limit-Bot-ID': data.ratelimit_bot_id,
            },
        });
    }

    // Write to KV
    await RATELIMIT.put(key, Date.now() + (limit * 1000), { expirationTtl: Math.max(limit, 60) });
    return false;
};
