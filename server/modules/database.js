const MongoClient = require('mongodb').MongoClient;

// Connection URL
const url = 'mongodb://localhost:27017';

// Create a new MongoClient
const client = new MongoClient(url, { useNewUrlParser: true });
client.once('open', () => {
    console.log('Mongo connected');
});
client.on('error', (err) => {
    console.log('Error connecting to Mongo.', err);
});
client.connect();

module.exports = client;