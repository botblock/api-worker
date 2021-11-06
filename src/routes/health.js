module.exports = {
    method: 'GET',
    route: '/api/health',
    handler: () => new Response('OK', {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Expires: '0',
            'Surrogate-Control': 'no-store',
        },
    }),
};
