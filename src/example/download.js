/** @format */

module.exports = function (app, connection) {
    app.get("/api/download", async (req, res) => {
        let { dwm = "d" } = req.query;
        res.download(`download_${dwm}.xlsx`);
    });
};
