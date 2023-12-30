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
        machines:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Machine"
        }],
        employees:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Emplyoee"
        }],
        numofmachines: {
            type:Number,
            default: 0 
          },
    },
    {
        timestamps: true,
    }
);



module.exports = mongoose.model("Location", locationSchema);