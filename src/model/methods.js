
let methods = {

    YingYang(data) {
        if (!data) return;
        // ying1， yang2，shizixing3
        let { o, c } = data;
        if (c < o) {
            return 1;
        } else if (c > o) {
            return 2;
        } else {
            return 3;
        }
    },

    entity(data) {
        let { o, c } = data
        let max = Math.max(o, c)
        let min = Math.min(o, c)
        return ((max - min) / max)
    },

    buyDate(date, number) {
        let dd = new Date(date)
        dd.setDate(dd.getDate() + number)
        let day = dd.getDay()
        // 周末跳过
        switch(day) {
            case 6:
                dd = new Date(date)
                dd.setDate(dd.getDate() + number + 2)
                break;
            case 0:
                dd = new Date(date)
                dd.setDate(dd.getDate() + number + 1)
                break;
        }
        let y = dd.getFullYear() + '';   
        let m = dd.getMonth()+1 + ''
        let d = dd.getDate() + ''
        
        return (y.padStart(4, 0))+"-"+(m).padStart(2, 0)+"-"+(d.padStart(2, 0));   
    },

    qs(datas, []) {
        // let 
    },

    
    someDay(days, symbol = '-') {
        if (!days) return
        let today = new Date()
        let interval = 24 * 60 * 60 * 1000 * days
        let after = new Date(today - interval)
        let year = after.getFullYear()
        let month = after.getMonth() + 1 + ''
        let date = after.getDate() + ''
        return `${year}${symbol}${month.padStart(2, 0)}${symbol}${date.padStart(2, 0)}`
    }
}



module.exports = methods