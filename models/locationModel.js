const mongoose = require("mongoose"); // Erase if already required

const locationSchema = new mongoose.Schema(
    {
        locationname: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        percentage:{
            type:String,
            required: true
        },
    },
    {
        timestamps: true,
    }
);


module.exports = mongoose.model("Location", locationSchema);