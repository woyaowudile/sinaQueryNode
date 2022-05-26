/** @format */

const API = require("../api");
const schdule = require("node-schedule");

const { sendMail } = require("./sendEmail");
const { someDay, getRequest } = require("../model/methods");

module.exports = {
    nodeSchedule: async (connection) => {
        console.log(`>>> 开启定时任务`);
        // let rule = new schdule.RecurrenceRule();
        /**
         * rule: Object{
         *      date:null
         *      dayOfWeek:null
         *      hour:null
         *      minute:null
         *      month:null
         *      recurs:true
         *      second:0
         *      year:null
         * }
         */
        // 例： rule.hour = [1, 3, 4, 20]. 表示 每天 1点、3点、4点、晚上8点 运行
        // '* * * * * *' '秒分时日月周'
        // 例： 每日的12.30 -> '00 30 12 * * *'
        schdule.scheduleJob(
            {
                dayOfWeek: [1, 2, 3, 4, 5],
                hour: [17],
                minute: [30],
                second: [0],
            },
            async () => {
                console.log("------ 定时器： 开启每日更新");
                const date = new Date();
                const res = await API.getHolidays(date);
                if (res) {
                    sendMail(`${date.toLocaleString()}今天好像不是工作日！`);
                    return;
                }
                // 每周的一二三四五 的 下午5：30
                connection.query(`DELETE FROM xxxx_today WHERE dwm = 'd'`, async (err, result) => {
                    if (err) {
                        console.log("------ 每日更新：失败");
                    } else {
                        sendMail(`今天（${new Date().toLocaleString()}）的任务开始了 by new`, "（开始）");
                        await getRequest("http://localhost:3334/api/update?dwm=d");
                    }
                });
            }
        );
        schdule.scheduleJob(
            {
                dayOfWeek: [1, 2, 3, 4, 5, 6, 7],
                hour: [5],
                minute: [30],
                second: [0],
            },
            async () => {
                console.log("------ 定时器： 开启每日推送");
                let day = someDay();
                // 每周的一二三四五 的 上午5：30
                connection.query(`SELECT * FROM xxxx_checked WHERE buy_date = '${day}'`, async (err, result) => {
                    if (err) {
                        console.log("------ 每日推送：失败");
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
                        }
                    }
                });
            }
        );
        schdule.scheduleJob("00 30 4 * * 6", () => {
            console.log("------ 定时器： 开启每周推送");
            // 每周六 的4.30 更新
            connection.query(`DELETE FROM xxxx_today WHERE dwm = 'w'`, async (err, result) => {
                if (err) {
                    console.log("------ 每周推送：失败");
                } else {
                    sendMail(`这周（${new Date().toLocaleString()}）的任务开始了`, "（开始）");
                    await getRequest("http://localhost:3334/api/update?dwm=w");
                }
            });
        });
        schdule.scheduleJob("00 30 1 1 * *", () => {
            console.log("------ 定时器： 开启每月推送");
            // 每月 1 号的 1.30 更新
            connection.query(`DELETE FROM xxxx_today WHERE dwm = 'm'`, async (err, result) => {
                if (err) {
                    console.log("------ 每月推送：失败");
                } else {
                    sendMail(`本月（${new Date().toLocaleString()}）的任务开始了`, "（开始）");
                    await getRequest("http://localhost:3334/api/update?dwm=m");
                }
            });
        });
        console.log(`-------- 已开启 定时任务 E_N_D --------`);
    },
};
