const mongoose = require('mongoose');

let connecting = false;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1 || connecting) return;
    connecting = true;
    mongoose.set('bufferCommands', false);
    const uri = process.env.MONGO_URI;
    const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
    };
    try {
        await mongoose.connect(uri, options);
        console.log('MongoDB connected successfully');
        connecting = false;
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        connecting = false;
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        } else {
            setTimeout(connectDB, 5000);
        }
    }
};

mongoose.connection.on('disconnected', () => {
    if (process.env.NODE_ENV !== 'production') {
        setTimeout(connectDB, 5000);
    }
});

module.exports = connectDB;
module.exports.isDbConnected = () => mongoose.connection.readyState === 1;
