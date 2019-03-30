const crypto = require('crypto');
const jwt = require('jwt-simple');
const dbName = 'capacitor';
const client = require('../modules/database');
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

module.exports = {
    generateToken,
    parseJwt
}