const mongoose = require('mongoose');

const ObjectSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required:true,
        min: 3,
        max: 255
    },
    last_name: {
        type: String,
        required:true,
        min: 3,
        max: 255
    }
});

module.exports = mongoose.model('objects', ObjectSchema);