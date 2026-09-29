const {
  wells,
} = require("../data/demoData");

const getWells =
  async (req, res) => {
    res.json({
      success: true,
      count:
        wells.length,
      data:
        wells,
    });
  };

const getWellById =
  async (req, res) => {
    const well =
      wells.find(
        (item) =>
          item.wellId ===
          req.params.wellId
      );

    if (!well) {
      return res.status(404).json({
        success: false,
        message:
          "Well not found",
      });
    }

    res.json({
      success: true,
      data:
        well,
    });
  };

module.exports = {
  getWells,
  getWellById,
};