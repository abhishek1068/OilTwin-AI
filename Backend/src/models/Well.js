const mongoose = require("mongoose");

const wellSchema = new mongoose.Schema(
  {
    wellId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    field: {
      type: String,
      default: "Baghewala",
    },

    apiGravity: {
      type: Number,
      default: 18,
    },

    reservoirTemperature: {
      type: Number,
      default: 47,
    },

    reservoirPressure: {
      type: Number,
      default: 0,
    },

    currentOilProduction: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Maintenance"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Well", wellSchema);