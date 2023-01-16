/** @format */

const { getRequest } = require("../model/methods");

module.exports = function (app, connection) {
    app.get("/api/test", async (req, res) => {
        const date1 = new Date().toLocaleString();
        console.log("-------------开始执行 /api/test---------------");
        let url = "http://localhost:3334/api/update?type=test";
        await getRequest(url);

        const date2 = new Date().toLocaleString();
        console.log(`》》-- 执行完成 /api/test --, ${date1}, ${date2}《《`);
        res.send({ data: [], message: "成功", code: 0 });
    });
};
