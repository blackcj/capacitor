
const PORT = process.env.PORT || 3000;
const Nanobe = require('nanobe');
const app = new Nanobe();

app.setStaticFolder('public');

app.listen(PORT, () => {
    console.log('listening on port', PORT);
});

module.exports = app.server;