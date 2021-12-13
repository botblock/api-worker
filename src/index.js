const WorkersSentry = require('workers-sentry/worker');
const UrlPattern = require('url-pattern');
const routeData = require('./util/getRoutes')();

// Process all requests to the worker
const handleRequest = async ({ request, wait, sentry }) => {
    const url = new URL(request.url);

    // Attempt to find a matching route
    for (const route of routeData) {
        if (route.method !== request.method) continue;
        const match = new UrlPattern(route.route, { segmentValueCharset: 'a-zA-Z0-9-_~ %.' }).match(url.pathname);
        if (!match) continue;

        // Execute the route
        request.params = match;
        return route.handler({ request, wait, sentry });
    }

    // Handle docs redirects
    if (request.method === 'GET' && url.pathname === '/api/docs')
        return new Response(null, {
            status: 302,
            headers: { Location: '/docs' },
        });
    if (request.method === 'GET' && url.pathname === '/api/docs/libs')
        return new Response(null, {
            status: 302,
            headers: { Location: '/docs/libraries' },
        });

    // 404 response
    return new Response(null, { status: 404 });
};

// Register the worker listener
addEventListener('fetch', event => {
    // Start Sentry
    const sentry = new WorkersSentry(event, process.env.SENTRY_DSN);

    // Process the event
    return event.respondWith(handleRequest({
        request: event.request,
        wait: event.waitUntil.bind(event),
        sentry,
    }).catch(err => {
        // Log & re-throw any errors
        console.error(err);
        sentry.captureException(err);
        throw err;
    }));
});
