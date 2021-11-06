const WorkersSentry = require('workers-sentry/worker');
const routeData = require('./util/getRoutes')();

// Process all requests to the worker
const handleRequest = async ({ request, wait, sentry }) => {
    const url = new URL(request.url);

    // Attempt to find a matching route
    const route = routeData.find(data => data.method === request.method && data.route === url.pathname);
    if (route) return route.handler({ request, wait, sentry });

    // Fallback to origin
    return fetch(request);
    // return new Response(null, { status: 404 });
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
