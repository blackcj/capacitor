const Router = require('nanobe').Router;
const router = new Router();
const argon2 = require('argon2');
const dbName = 'capacitor';
const client = require('../modules/database');
const USER_ROLE = 1;
const ADMIN_ROLE = 2;
const crypto = require('crypto');
const jwt = require('jwt-simple');
const secret = process.env.JWT_SECRET;

function generateToken(user) {
    const token = crypto.randomBytes(64).toString('hex');
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);
    const payload = { token, expires, user: user._id };
    return payload;
}

async function parseJwt(request) {
    let result = { isAuthenticated: false };
    try {
        const encoded = request.headers.authorization.split(' ')[1];
        const decoded = jwt.decode(encoded, secret);
        const db = client.db(dbName);
        const tokenCollection = db.collection('tokens');
        const foundToken = await tokenCollection.findOne({ token: decoded.token });
        if (foundToken && foundToken.expires > new Date()) {
            // Make sure the user exists
            const userCollection = db.collection('users');
            const foundUser = await userCollection.findOne({ _id: (foundToken.user) });
            if (!foundUser) {
               throw 'Could not find user' 
            }
            
            // Update token expiration
            const expires = new Date();
            expires.setMinutes(expires.getMinutes() + 30);
            await tokenCollection.updateOne({ token: decoded.token }, { $set: { expires } });
            delete foundUser.password;
            result = {
                isAuthenticated: true,
                user: foundUser
            };
        }
    } catch (err) {
        console.log('CATCH', err);
        result = { isAuthenticated: false };
    }
    return result;
}

router.addHandler('/login', 'POST', (request, response) => {
    (async () => {
        const username = request.body.username;
        const password = request.body.password;
        try {
            const db = client.db(dbName);
            const userCollection = db.collection('users');
            const tokenCollection = db.collection('tokens');
            const user = await userCollection.findOne({ username });
            if (user && await argon2.verify(user.password, password)) {
                const payload = generateToken(user);
                tokenCollection.insertOne(payload);
                const encoded = jwt.encode(payload, secret);
                response.send({ message: 'success', encoded, success: true }, 200);
            } else {
                response.send({ message: 'forbidden', success: false }, 200);
            }
        } catch (error) {
            console.log(error);
            response.send({ message: 'error', success: false }, 200);
        }
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'error', success: false }, 200);
    });
});

router.addHandler('/', 'GET', (request, response) => {
    (async () => {
        const user = await parseJwt(request);
        if(user.isAuthenticated) {
            response.send({ message: 'success', user: user.user, success: true }, 200);
        } else {
            response.send({ message: 'bad token', success: false }, 200);
        }
    })()
});

router.addHandler('/codes', 'POST', async (request, response) => {
    (async () => {
        const user = await parseJwt(request);
        if (user.isAuthenticated) {
            const foundUser = user.user;
            const codes = request.body.codes;
            try {
                const db = client.db(dbName);
                if (foundUser.role == ADMIN_ROLE) {
                    const codeCollection = db.collection('codes');
                    await codeCollection.insertMany(codes);
                    response.send({ message: 'success', success: true }, 200);
                } else {
                    response.send({ message: 'forbidden', success: false }, 200);
                }
            } catch (error) {
                console.log(error);
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

router.addHandler('/register', 'POST', async (request, response) => {
    const user = request.body;
    user.role = USER_ROLE;
    const db = client.db(dbName);

    try {
        const col = db.collection('users');
        // Look for an existing user with that name
        const foundUser = await col.findOne({ username: user.username });
        if ( !foundUser ) {
            // Hash and salt the password
            user.password = await argon2.hash(user.password);
            await col.insertOne(user);
            response.send({ message: 'success', success: true }, 200);
        } else {
            response.send({ message: 'user already exists', success: false }, 200);
        }
    } catch (error) {
        console.log(error);
        response.send({ message: 'error', success: false }, 200);
    }
});

module.exports = router;