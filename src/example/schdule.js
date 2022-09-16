const API = require("../api");
const { sendMail } = require("../utils/sendEmail");
const { someDay, getRequest } = require("../model/methods");

module.exports = function (app, connection) {
    app.get("/api/schdule", async (req, res) => {
        let { query } = req;
        let { dwm = "d", type = "update", days, start, end } = query;
        let dwmName = {
            d: "日",
            w: "周",
            m: "月",
        };

        console.log(`-------------开始执行 定时任务${type}——${dwm}---------------`);
        // 定期更新
        if (type === "update") {
            const date = new Date();
            const res = await API.getHolidays(date);
            console.log("test周:", someDay(res.w, "-", date));
            console.log("test月:", someDay(res.m, "-", date));
            console.log("test日:", !res.isWorkDay ? "休息日" : "工作日");
            switch (dwm) {
                case "d":
                    if (!res.isWorkDay) {
                        console.log(`>> 今天好像不是工作日`);
                        sendMail(`${date.toLocaleString()}今天好像不是工作日！`);
                        return;
                    }
                    break;
            }

            console.log(`---- 定时器： 开启每${dwmName[dwm]}更新`);

            connection.query(`DELETE FROM xxxx_today WHERE dwm = '${dwm}'`, async (err, result) => {
                if (err) {
                    console.log(`------ 每${dwmName[dwm]}更新：失败`, err);
                    sendMail(`这${dwmName[dwm]}（${new Date().toLocaleString()}）的任务失败了`, "（开始）");
                } else {
                    sendMail(`这${dwmName[dwm]}（${new Date().toLocaleString()}）的任务开始了 by ${dwm}`, "（开始）");
                    let url = `http://localhost:3334/api/update?dwm=${dwm}`;
                    if (days) {
                        url += `&days=${someDay(days)}`;
                    }
                    if (start) {
                        url += `&start=${start}`;
                    }
                    if (end) {
                        url += `&end=${end}`;
                    }
                    await getRequest(url);
                }
            });
        }

        // 每日推送
        if (type === "send") {
            console.log("---- 定时器： 开启每日推送");
            let day = someDay(days);

            connection.query(`SELECT * FROM xxxx_checked WHERE buy_date = '${day}'`, async (err, result) => {
                if (err) {
                    console.log("------ 每日推送：失败", err);
                } else {
                    if (result.length) {
                        let datas = result.map((v) => ({
                            name: v.name,
                            code: v.code,
                            buy: v.buy,
                            buy_date: v.buy_date,
                            dwm: v.dwm,
                            level: v.level,
                        }));
                        let th = "";
                        Object.keys(datas[0]).forEach((v) => {
                            th += `<th>${v}</th>`;
                        });
                        let td = "",
                            tr = "";
                        datas.forEach((v) => {
                            Object.values(v).forEach((d) => {
                                td += `<td>${d}</td>`;
                            });
                            tr += `<tr>${td}</tr>`;
                            td = "";
                        });
                        let html = `<table border="1" cellpadding="10" cellspacing="10"><caption>${day}</caption><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
                        sendMail(html, "（参考）");
                    } else {
                        console.log("------ 今日没有推送数据哦");
                    }
                }
            });
        }

        console.log(`-------------执行完成 定时任务${type}——${dwm}---------------`);
        res.send(`定时任务ok - type：${type}：${dwm}`);
    });
};
