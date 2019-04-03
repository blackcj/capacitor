const Router = require('nanobe').Router;
const router = new Router();
const dbName = 'capacitor';
const client = require('../modules/database');
const userJwt = require('../modules/user.jwt');

/**
 * @api {post} /api/entries/ Add Entry
 * @apiDescription Add data entry for a device.
 * @apiName AddEntry
 * @apiGroup Entries
 *
 * @apiHeader {String} Authorization Users encoded JWT token.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Content-Type": "application/json",
 *       "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 *
 * @apiParam (200) {String}   coreid            Information about the device.
 * @apiParam (200) {String}   data              JSON string with data to be stored in the database.
 * @apiParam (200) {String}   published_at      Name of property that data is stored in (e.g. result).
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true
 *     }
 */
router.addHandler('/', 'POST', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if (user.isAuthenticated) {
            const foundUser = user.user;
            const deviceData = request.body;
            // TODO: Check size of payload. Payload size should be a reasonable size. 
            try {
                const db = client.db(dbName);
                const entryCollection = db.collection('entries');
                const entry = deviceData;
                // convert JSON string to JS object
                entry.data = JSON.parse(deviceData.data);
                entry.user_id = foundUser._id;
                entry.received_at = new Date();
                entry.published_at = new Date(deviceData.published_at);
                await entryCollection.insertOne(entry);
                response.send({ message: 'success', success: true }, 200);
            } catch (e) {
                console.log(e);
                throw e;
            }
        } else {
            response.send({ message: 'bad token', success: false }, 200);
        }
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'error', success: false }, 200);
    });
});

/**
 * @api {get} /api/entries Get Device Data
 * @apiDescription Get a token with a long life to use for web hooks.
 * @apiName GetEntries
 * @apiGroup Entries
 *
 * @apiHeader {String} Authorization Users encoded JWT token.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Content-Type": "application/json",
 *       "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 * 
 * @apiParam (200) {String}   coreid            Information about the device.
 *
 * @apiSuccess (200) {String}   message     Success message.
 * @apiSuccess (200) {Boolean}  success     Success boolean.
 * @apiSuccess (200) {Object}   data        Data for the specified device.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true,
 *       "encoded": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 */
router.addHandler('/', 'GET', (request, response) => {
    (async () => {
        if (!request.query.coreid) {
            response.send({ message: 'Missing coreid.', success: false }, 200);
            return;
        }
        const user = await userJwt.parseJwt(request);
        if (user.isAuthenticated) {
            try {
                const foundUser = user.user;
                const coreid = request.query.coreid;
                const db = client.db(dbName);
                const entryCollection = db.collection('entries');

                const entries = await entryCollection.aggregate([
                    {
                        $match: {
                            $and: [
                                { coreid: coreid },
                                { user_id: foundUser._id },
                            ],
                        }
                    },
                    { $sort: { published_at: -1 } },
                    { $limit: 20 }]).toArray();

                if (entries.length > 0) {
                    response.send({ message: 'success', entries, success: true }, 200);
                } else {
                    response.send({ message: 'No entries found for supplied coreid.', success: false }, 200);
                }
            } catch (e) {
                console.log(e);
                throw e;
            }
        } else {
            response.send({ message: 'forbidden', success: false }, 200);
        }
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'error', success: false }, 200);
    });
});

module.exports = router;