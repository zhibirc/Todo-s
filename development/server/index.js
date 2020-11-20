'use strict';

const path = require('path');
const http = require('http');
const URL = require('url').URL;
const browserSync = require('browser-sync').create();

const {v4: getSessionId} = require('uuid');

const SITE_ROOT = path.join(__dirname, '../..');
const HOST = '127.0.0.1';
const PORT = 4000;
const SESSION_TIME_SECONDS = 900;

const mockUsers    = require(path.join(SITE_ROOT, 'test/data/users.json'));
const mockProjects = require(path.join(SITE_ROOT, 'test/data/projects.json'));

// for manual handling of serving static resources (set appropriate MIME-type)
/*const fileExtensions = {
    html: 'text/html',
    css:  'text/css',
    js:   'text/javascript',
    png:  'image/png',
    jpg:  'image/jpg'
};*/

const sessions = {};

browserSync.emitter.on('init', () => console.log('BrowserSync is running!'));
['*.html', '*.css', '*.js'].forEach(mask => browserSync.watch(mask).on('change', browserSync.reload));
browserSync.init({
    server: `${SITE_ROOT}/development/client`,
    // show additional info
    logLevel: 'debug',
    // reduce start-up time
    online: false,
    // reuse an existing tab that was opened
    single: true,
    reloadDelay: 1000
});

const server = http.createServer((request, response) => {
    const {method, headers: requestHeaders} = request;
    const resourceUrl = new URL(`http${request.connection.encrypted ? 's' : ''}://${request.headers.host}${request.url}`);

    let requestData = [];

    request.on('error', error => {
        console.error(error);
    }).on('data', chunk => {
        requestData.push(chunk);
    }).on('end', () => {
        requestData = Buffer.concat(requestData).toString();

        console.log('--------- request ---------');
        console.log('Method: ', method);
        console.log('Path: ', resourceUrl);
        //console.log('Request headers: ', requestHeaders);
        //console.log('Incoming data: ', requestData);

        switch ( method ) {
            case 'GET':
                if ( resourceUrl.pathname.split('/').pop() === 'getUserData' ) {
                    const sessionId = resourceUrl.searchParams.get('sessionId');

                    if ( sessions[sessionId] ) {
                        response.writeHead(200, {
                            'Access-Control-Allow-Origin': requestHeaders.origin,
                            'Content-Type': 'application/json'
                        });
                        response.end(JSON.stringify(mockProjects));
                    }
                }/* else {
                    const url = resourceUrl === '/' ? 'index.html' : resourceUrl;

                    // TODO: handle existing of requested files
                    response.writeHead(200, {
                        'Content-Type': fileExtensions[path.extname(url).slice(1)]
                    });
                    response.end(fs.readFileSync(path.join(SITE_ROOT, url)));
                }*/

                break;
            case 'POST':
                if ( resourceUrl.pathname.split('/').pop() === 'sessions' ) {
                    try {
                        requestData = JSON.parse(requestData);
                    } catch ( exception ) {
                        response.statusCode = 400;
                        response.end();
                    }

                    const {login, password, sessionId} = requestData;

                    if ( sessionId ) {
                        // fixme
                        // still valid
                        if ( sessions[sessionId] ) {
                            response.writeHead(200, {
                                'Access-Control-Allow-Origin': requestHeaders.origin,
                                'Content-Type': 'application/json'
                            });
                            response.end(JSON.stringify({logged: true}));
                        }
                    } else {
                        // TODO: improve security and reliability
                        for ( const user of mockUsers ) {
                            if ( login === user.login && password === user.password ) {
                                const sessionId = getSessionId();

                                sessions[sessionId] = {login};

                                response.writeHead(200, {
                                    'Access-Control-Allow-Origin': requestHeaders.origin,
                                    'Content-Type': 'application/json'
                                });
                                response.end(JSON.stringify({sessionId}));
                            }
                        }

                        response.statusCode = 404;
                        response.end();
                    }
                } else if ( resourceUrl.pathname.split('/').pop() === 'addProject' ) {
                    response.writeHead(200, {
                        'Access-Control-Allow-Origin': requestHeaders.origin
                    });
                    response.end(JSON.stringify({}));
                }

                break;
            case 'OPTIONS':
                response.writeHead(200, {
                    'Access-Control-Allow-Origin':   requestHeaders.origin,
                    'Access-Control-Allow-Methods':  'GET, POST, DELETE',
                    'Access-Control-Max-Age':        SESSION_TIME_SECONDS,
                    'Access-Control-Allow-Headers':  'Content-Type'
                });
                response.end();

                break;
            case 'DELETE':
                break;
        }
    });
});

server.on('listening', () => {
    // TODO
});

//server.on('close', () => {});

server.on('error',  error => {
    console.error(error.toString());
});

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});
