const Router = require('nanobe').Router;
const router = new Router();
const dbName = 'capacitor';
const client = require('../modules/database');
const userJwt = require('../modules/user.jwt');
const jwt = require('jwt-simple');
const secret = process.env.JWT_SECRET;

/**
 * @api {post} /api/devices/ Add Device
 * @apiDescription Add device.
 * @apiName AddDevice
 * @apiGroup Devices
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
            // TODO: Check size of payload. Payload size should be a reasonable size. 
            try {
                const db = client.db(dbName);
                const deviceCollection = db.collection('devices');
                const device = request.body;
                device.user_id = foundUser._id;
                device.added_on = new Date();
                await deviceCollection.insertOne(device);
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
 * @api {get} /api/devices/list Get All Devices
 * @apiDescription Get a list of devices for the user.
 * @apiName GetDevices
 * @apiGroup Devices
 *
 * @apiHeader {String} Authorization Users encoded JWT token.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Content-Type": "application/json",
 *       "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 *
 * @apiSuccess (200) {String}   message     Success message.
 * @apiSuccess (200) {Boolean}  success     Success boolean.
 * @apiSuccess (200) {Object[]} devices     Array of devices.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true,
 *       "encoded": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 */
router.addHandler('/list', 'GET', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if (user.isAuthenticated) {
            try {
                const foundUser = user.user;
                const db = client.db(dbName);
                const deviceCollection = db.collection('devices');
                const entriesCollection = db.collection('entries');
                const deviceList = await deviceCollection.aggregate(
                    [
                        {
                            "$match": {
                                user_id: foundUser._id,
                            }
                        },
                        {
                            "$project": { 
                                coreid: 1, 
                            }
                        }
                    ]).toArray();
                for(let device of deviceList) {
                    device.entry_count = await entriesCollection.countDocuments({coreid: device.coreid});
                }
                response.send({ message: 'success', devices: deviceList, success: true }, 200);

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

/**
 * @api {get} /api/devices/token Get Device Token
 * @apiDescription Get a token with a long life to use for web hooks.
 * @apiName GetDeviceToken
 * @apiGroup Devices
 *
 * @apiHeader {String} Authorization Users encoded JWT token.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Content-Type": "application/json",
 *       "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 *
 * @apiSuccess (200) {String}   message     Success message.
 * @apiSuccess (200) {Boolean}  success     Success boolean.
 * @apiSuccess (200) {String}   encoded     Encoded JWT token used for authorizing future requests.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true,
 *       "encoded": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 */
router.addHandler('/token', 'GET', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if (user.isAuthenticated) {
            try {
                // TODO: Only allow one 'forever' token per user. Adding a new one should expire the old.
                const db = client.db(dbName);
                const tokenCollection = db.collection('tokens');
                const payload = userJwt.generateDeviceToken(user.user);
                const encoded = jwt.encode(payload, secret);
                await tokenCollection.insertOne(payload);
                response.send({ message: 'success', encoded, success: true }, 200);
            
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