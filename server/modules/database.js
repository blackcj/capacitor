const MongoClient = require('mongodb').MongoClient;

// Connection URL
const url = 'mongodb://localhost:27017';

// Create a new MongoClient
const client = new MongoClient(url, { useNewUrlParser: true });
client.once('open', _ => {
    console.log('Mongo connected');
});
client.on('error', err => {
    console.log('Error connecting to Mongo.', err);
});
client.connect().catch( err => {
    console.log('Error connecting to Mongo.', err);
});

module.exports = client;