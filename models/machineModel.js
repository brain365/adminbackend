const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const machineSchema = new mongoose.Schema(
    {
        machineName: {
            type: String,
            required: true,
        },
        serialNumber: {
            type: String,
            required: true,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Machine", machineSchema);