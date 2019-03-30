const Router = require('nanobe').Router;
const router = new Router();
const argon2 = require('argon2');
const dbName = 'capacitor';
const client = require('../modules/database');
const USER_ROLE = 1;
const ADMIN_ROLE = 2;
const userJwt = require('../modules/user.jwt');

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

router.addHandler('/', 'GET', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if(user.isAuthenticated) {
            response.send({ message: 'success', user: user.user, success: true }, 200);
        } else {
            response.send({ message: 'bad token', success: false }, 200);
        }
    })()
});

router.addHandler('/codes', 'POST', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
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

router.addHandler('/register', 'POST', (request, response) => {
    (async () => {
        const user = request.body;
        // Add default role to the user
        user.role = USER_ROLE;
        try {
            const db = client.db(dbName);
            const col = db.collection('users');
            // Look for an existing user with that username
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
    })().catch((error) => {
        console.log('CATCH', error);
        response.send({ message: 'error', success: false }, 200);
    });
});

module.exports = router;