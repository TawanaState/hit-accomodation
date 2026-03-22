const { MongoClient } = require('mongodb');

async function main() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/studentaffairs";
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main().catch(console.error);
