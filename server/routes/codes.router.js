const Router = require('nanobe').Router;
const router = new Router();
const dbName = 'capacitor';
const client = require('../modules/database');
const ADMIN_ROLE = 2;
const userJwt = require('../modules/user.jwt');

router.addHandler('/', 'DELETE', (request, response) => {
    (async () => {
        const user = await userJwt.parseJwt(request);
        if (user.isAuthenticated) {
            const foundUser = user.user;
            try {
                const db = client.db(dbName);
                const code = request.query.code;
                if (foundUser.role == ADMIN_ROLE) {
                    const codeCollection = db.collection('codes');
                    await codeCollection.findOneAndDelete({ code });
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

router.addHandler('/', 'POST', (request, response) => {
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

module.exports = router;