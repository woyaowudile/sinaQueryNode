/** @format */

module.exports = function (app, connection) {
    app.get("/api/download", async (req, res) => {
        let { dwm = "d", type = "000" } = req.query;
        res.download(`download_${type}_${dwm}.xlsx`);
    });
};
