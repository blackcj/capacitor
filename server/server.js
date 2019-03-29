const PORT = process.env.PORT || 3000;
const Nanobe = require('nanobe');
const app = new Nanobe();
const usersRouter = require('./routes/users.router');

app.setStaticFolder('public');

app.use('/api/users', usersRouter);

app.listen(PORT, () => {
    console.log('listening on port', PORT);
});

module.exports = app.server;