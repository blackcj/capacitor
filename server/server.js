require('dotenv').config();
const PORT = process.env.PORT || 3000;
const Nanobe = require('nanobe');
const app = new Nanobe();
const usersRouter = require('./routes/users.router');
const codesRouter = require('./routes/codes.router');
const devicesRouter = require('./routes/devices.router');
const entriesRouter = require('./routes/entries.router');

app.setStaticFolder('public');

app.use('/api/users', usersRouter);
app.use('/api/codes', codesRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/entries', entriesRouter);

app.listen(PORT, () => {
    console.log('listening on port', PORT);
});

module.exports = app.server;