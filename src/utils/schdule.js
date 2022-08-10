/** @format */

const API = require("../api");
const schdule = require("node-schedule");

const { getRequest } = require("../model/methods");

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
                // 每周的一二三四五 的 下午5：30
                await getRequest("http://localhost:3334/api/schdule?dwm=d");
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
                // 每周的一二三四五 的 上午5：30
                await getRequest("http://localhost:3334/api/schdule?type=send");
            }
        );
        schdule.scheduleJob("00 30 4 * * 6", async () => {
            // 每周六 的4.30 更新
            await getRequest("http://localhost:3334/api/schdule?dwm=w");
        });
        schdule.scheduleJob("00 30 1 1 * *", async () => {
            // 每月 1 号的 1.30 更新
            await getRequest("http://localhost:3334/api/schdule?dwm=m");
        });
        console.log(`-------- 已开启 定时任务 E_N_D --------`);
    },
};
