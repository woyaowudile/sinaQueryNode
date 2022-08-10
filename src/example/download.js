/** @format */

module.exports = function (app, connection) {
    app.get("/api/download", async (req, res) => {
        let { dwm = "d", type = "000", name } = req.query;
        res.download(name || `download_${type}_${dwm}.xlsx`);
    });
};
