
const schdule = require('node-schedule')


module.exports = {
    nodeSchedule: function() {
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
        // schdule.scheduleJob('00 30 16 * * *', () => {
        //     connection.query(`DELETE FROM ig502_today WHERE type = 'day'`, async (err, result) => {
        //         if (err) {
        //         } else {
        //             email.sendMail(`今天（${new Date().toLocaleString()}）的任务开始了`)
        //             await initQuery('day')
        //             update('day')
        //         }
        //     })
        // })
        // schdule.scheduleJob('00 30 2 * * 5', () => {
        //     // 每周六 的4.30 更新
        //     connection.query(`DELETE FROM ig502_today WHERE type = 'week'`, async (err, result) => {
        //         if (err) {
        //         } else {
        //             email.sendMail(`这周（${new Date().toLocaleString()}）的任务开始了`)
        //             await initQuery('week')
        //             update('week')
        //         }
        //     })
        // })
        // schdule.scheduleJob('00 30 1 1 * *', () => {
        //     // 每月 1 号的 1.30 更新
        //     connection.query(`DELETE FROM ig502_today WHERE type = 'month'`, async (err, result) => {
        //         if (err) {
        //         } else {
        //             email.sendMail(`本月（${new Date().toLocaleString()}）的任务开始了`)
        //             await initQuery('month')
        //             update('month')
        //         }
        //     })
        // })
        console.log(`-------- 已开启 定时任务 E_N_D --------`);
    }
}