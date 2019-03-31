const crypto = require('crypto');
const jwt = require('jwt-simple');
const dbName = 'capacitor';
const client = require('../modules/database');
const secret = process.env.JWT_SECRET;

function generateToken(user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    let lifespan = 60;
    expires.setMinutes(expires.getMinutes() + lifespan);
    const payload = { token, expires, user: user._id, lifespan, type: 1 };
    return payload;
}

function generateDeviceToken(user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    let lifespan = 5256000;
    expires.setMinutes(expires.getMinutes() + lifespan);
    const payload = { token, expires, user: user._id, lifespan, type: 2 };
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
            const foundUser = await userCollection.findOne({ _id: foundToken.user });
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

async function parseToken(request) {
    let result = { isAuthenticated: false };
    try {
        const token = request.headers.authorization.split(' ')[1];
        const db = client.db(dbName);
        const tokenCollection = db.collection('tokens');
        const foundToken = await tokenCollection.findOne({ token: token });
        if (foundToken && foundToken.expires > new Date()) {
            // Make sure the user exists
            const userCollection = db.collection('users');
            const foundUser = await userCollection.findOne({ _id: foundToken.user });
            if (!foundUser) {
                throw 'Could not find user'
            }

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

module.exports = {
    generateToken,
    generateDeviceToken,
    parseJwt,
    parseToken
}