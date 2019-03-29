const Router = require('nanobe').Router;
const router = new Router();
const argon2 = require('argon2');
const dbName = 'capacitor';

router.addHandler('/login', 'POST', async (request, response) => {
    const username = request.body.username;
    const password = request.body.password;
    try {
        const db = client.db(dbName);
        const col = db.collection('users');
        const user = await col.findOne({ username });
        if ( user && await argon2.verify(user.password, password) ) {
            response.send({ message: 'success', user, success: true }, 200);
        } else {
            response.send({ message: 'forbidden', success: false }, 200);
        }
    
    } catch (error) {
        console.log(error);
        response.send({ message: 'error', success: false }, 200);
    }
});

router.addHandler('/register', 'POST', async (request, response) => {
    const user = request.body;
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