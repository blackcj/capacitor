const Router = require('nanobe').Router;
const router = new Router();
const dbName = 'capacitor';
const client = require('../modules/database');
const ADMIN_ROLE = 2;
const userJwt = require('../modules/user.jwt');
const jwt = require('jwt-simple');
const secret = process.env.JWT_SECRET;

/**
 * @api {post} /api/devices/ Add Device Data
 * @apiDescription Add data for a device.
 * @apiName AddData
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
                if (foundUser.role == ADMIN_ROLE) {
                    const deviceCollection = db.collection('devices');
                    const data = JSON.parse(deviceData.data);
                    data.received_at = new Date();
                    data.event = deviceData.event;
                    data.published_at = new Date(deviceData.published_at);
                    await deviceCollection.findOneAndUpdate(
                        { coreid: deviceData.coreid, user_id: foundUser._id },
                        { $push: { data } },
                        { upsert: true, },
                    );
                    
                    response.send({ message: 'success', success: true }, 200);
                } else {
                    response.send({ message: 'forbidden', success: false }, 200);
                }
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
 * @api {get} /api/devices Get Device Data
 * @apiDescription Get a token with a long life to use for web hooks.
 * @apiName GetDeviceData
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
                const deviceCollection = db.collection('devices');
                
                const data = await deviceCollection.aggregate([
                    {
                        $match: {
                            $and: [
                                { coreid: coreid },
                                { user_id: foundUser._id },
                            ], 
                        }
                    },
                    { $unwind: "$data" }, 
                    // {
                    //     $addFields: { 
                    //         "data.coreid": "$coreid",
                    //     }
                    // },
                    {
                        $replaceRoot: {
                            newRoot: "$data",
                        },
                    },
                    { $sort: { published_at: -1 }},
                    { $limit: 20 }]).toArray();

                if (data.length > 0) {
                    response.send({ message: 'success', coreid, data, success: true }, 200);
                } else {
                    response.send({ message: 'No data found for supplied coreid.', success: false }, 200);
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
router.addHandler('/list', 'GET', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if (user.isAuthenticated) {
            try {
                const foundUser = user.user;
                const db = client.db(dbName);
                const deviceCollection = db.collection('devices');
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
                                data_size: { $size: "$data" }, 
                            }
                        }
                    ]).toArray();
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