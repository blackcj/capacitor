const Router = require('nanobe').Router;
const { ObjectId } = require('mongodb');
const router = new Router();
const argon2 = require('argon2');
const dbName = 'capacitor';
const client = require('../modules/database');
const USER_ROLE = 1;
const ADMIN_ROLE = 2;
const userJwt = require('../modules/user.jwt');
const jwt = require('jwt-simple');
const secret = process.env.JWT_SECRET;

/**
 * @apiDefine UserNotFoundError
 *
 * @apiError (Error) UserNotFound The id of the User was not found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "User not found.",
 *       "success": false,
 *     }
 */

/**
 * @api {post} /api/users/login User Login
 * @apiDescription Login user and receive a JWT on successful login. Params should be passed in the requrest body.
 * @apiName Login
 * @apiGroup Users
 *
 * @apiParam {String} username User e-mail address.
 * @apiParam {String} password User password.
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
router.addHandler('/login', 'POST', (request, response) => {
    (async () => {
        const username = request.body.username;
        const password = request.body.password;
        if(!username || !password) {
            response.send({ message: 'You must supply a username and password.', success: false }, 200);
            return;
        }
        try {
            const db = client.db(dbName);
            const userCollection = db.collection('users');
            const tokenCollection = db.collection('tokens');
            const user = await userCollection.findOne({ username });
            if (user && await argon2.verify(user.password, password)) {
                const payload = userJwt.generateToken(user);
                const encoded = jwt.encode(payload, secret);
                await tokenCollection.insertOne(payload);
                response.send({ message: 'success', encoded, success: true }, 200);
            } else {
                response.send({ message: 'forbidden', success: false }, 200);
            }
        } catch (e) {
            console.log(e);
            throw e;
        }
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'error', success: false }, 200);
    });
});

/**
 * @api {get} /api/users Get User details
 * @apiDescription Gets the details for the user associated with the JWT.
 * @apiName GetUser
 * @apiGroup Users
 * 
 * @apiHeader {String} Authorization Users encoded JWT token.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Content-Type": "application/json",
 *       "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 *
 * @apiSuccess (200) {String}   message         Success message.
 * @apiSuccess (200) {Boolean}  success         Success boolean.
 * @apiSuccess (200) {Object}   user            User object.
 * @apiSuccess (200) {String}   user.username   User e-mail.
 * @apiSuccess (200) {String}   user.role       User role.
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true,
 *       "user": {
 *         "_id": "5c9fc1979b6e69d3177c00a9",
 *         "username": "chris",
 *         "role": 1
 *       }
 *     }
 * 
 * @apiUse UserNotFoundError
 */
router.addHandler('/', 'GET', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if(user.isAuthenticated) {
            response.send({ message: 'success', user: user.user, success: true }, 200);
        } else {
            response.send({ message: 'Unable to get user, please try logging in again.', success: false }, 200);
        }
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'error', success: false }, 200);
    });
});

/**
 * @api {delete} /api/users Delete a User
 * @apiDescription Deletes the user with a matching id. Params should be passed as query parameters in the URL.
 * @apiName DeleteUser
 * @apiGroup Users
 * 
 * @apiParam {String} id Users unique ID.
 *
 * @apiHeader {String} Authorization Users encoded JWT token.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Content-Type": "application/json",
 *       "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
 *     }
 *
 * @apiSuccess (200) {String}   message         Success message.
 * @apiSuccess (200) {Boolean}  success         Success boolean.
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true
 *     }
 * 
 * @apiUse UserNotFoundError
 */
router.addHandler('/', 'DELETE', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if (user.isAuthenticated) {
            const foundUser = user.user;
            try {
                const userToDelete = request.query.id;
                const db = client.db(dbName);
                // Admins can delete any user, regular users can only delete themselves.
                if (foundUser.role == ADMIN_ROLE || String(foundUser._id) === userToDelete) {
                    const userCollection = db.collection('users');
                    await userCollection.findOneAndDelete({ _id: ObjectId(userToDelete) });
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
 * @api {post} /api/users/register Create new User
 * @apiDescription Create a new user.
 * @apiName Register
 * @apiGroup Users
 *
 * @apiParam {String} username User e-mail address.
 * @apiParam {String} password User password.
 * @apiParam {String} code Invitation code.
 *
 * @apiSuccess (200) {String}   message     Success message.
 * @apiSuccess (200) {Boolean}  success     Success boolean.
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true
 *     }
 */
router.addHandler('/register', 'POST', (request, response) => {
    (async () => {
        const user = request.body;
        // Fail fast if required parameters aren't supplied.
        if( !user.code || !user.username || !user.password) {
            response.send({ message: 'Unable to register user.', success: false }, 200);
            return;
        } else if( user.password.length < 8 ) {
            response.send({ message: 'Your password isn\'t long enough. It must be at least 8 characters.', success: false }, 200);
            return;
        } else if ( !validateEmail(user.username) ) {
            response.send({ message: 'Invalid e-mail, please try again.', success: false }, 200);
            return;
        }

        try {
            const db = client.db(dbName);
            const userCollection = db.collection('users');

            // Look for an existing user with that username
            const foundUser = await userCollection.findOne({ username: user.username });
            if ( !foundUser ) {
                const codeCollection = db.collection('codes');
                const foundCode = await codeCollection.findOne({ code: user.code });
                if ( foundCode && foundCode.slots > 0) {
                    // Each code has a limited number of uses, subtract one use from the code
                    const slots = foundCode.slots - 1;
                    await codeCollection.updateOne({ code: user.code }, { $set: { slots: slots } });
                    // Hash and salt the password
                    user.password = await argon2.hash(user.password);
                    user.warning_level = 0;
                    user.sign_up_date = new Date();
                    // Add default role to the user
                    user.role = USER_ROLE;
                    // Create the new user
                    await userCollection.insertOne(user);
                    response.send({ message: 'Success! Your account has been created.', success: true }, 200);
                } else {
                    response.send({ message: 'The code you entered has expired.', success: false }, 200);
                }
            } else {
                response.send({ message: 'A user already exists with that e-mail.', success: false }, 200);
            }
        } catch (error) {
            console.log(error);
            response.send({ message: 'Unable to register user.', success: false }, 200);
        }
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'Unable to register user.', success: false }, 200);
    });
});

/**
 * @api {post} /api/users/setup Setup first User
 * @apiDescription Create the first user. This user will have admin permission.
 * @apiName Setup
 * @apiGroup Users
 *
 * @apiParam {String} username User e-mail address.
 * @apiParam {String} password User password.
 * @apiParam {String} code Admin code environment variable.
 *
 * @apiSuccess (200) {String}   message     Success message.
 * @apiSuccess (200) {Boolean}  success     Success boolean.
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "message": "success",
 *       "success": true
 *     }
 */
router.addHandler('/setup', 'POST', (request, response) => {
    (async () => {
        const user = request.body;

        // Fail fast if required parameters aren't supplied.
        if (!user.code || !user.username || !user.password) {
            response.send({ message: 'Unable to register user.', success: false }, 200);
            return;
        } else if (user.password.length < 8) {
            response.send({ message: 'Your password isn\'t long enough. It must be at least 8 characters.', success: false }, 200);
            return;
        } else if (!validateEmail(user.username)) {
            response.send({ message: 'Invalid e-mail, please try again.', success: false }, 200);
            return;
        }
        
        try {
            const db = client.db(dbName);
            const userCollection = db.collection('users');

            // Look for an existing user
            const userSearch = await userCollection.find({}).toArray();
            if (userSearch.length === 0) {
                if (process.env.ADMIN_CODE && user.code == process.env.ADMIN_CODE) {
                    // Add default role to the user
                    user.role = ADMIN_ROLE;
                    user.warning_level = 0;
                    user.sign_up_date = new Date();
                    // Hash and salt the password
                    user.password = await argon2.hash(user.password);
                    // Create the new user
                    await userCollection.insertOne(user);
                    response.send({ message: 'Success! Your account has been created.', success: true }, 200);
                } else {
                    response.send({ message: 'Invalid code. Make sure you set a code in your .env.', success: false }, 200);
                }
            } else {
                response.send({ message: 'A user already exists. This route is intended to be used only for an empty database.', success: false }, 200);
            }
        } catch (error) {
            console.log(error);
            response.send({ message: 'Unable to register user.', success: false }, 200);
        }
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'Unable to register user.', success: false }, 200);
    });
});

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

module.exports = router;