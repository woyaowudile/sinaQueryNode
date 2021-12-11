const $methods = require('./methods')


let alls = {
    ...$methods,
    
    isKlyh({ results, datas, start, dwm }) {
        if (dwm !== 'd') return
        let [ d0, d1, d2 ] = datas.slice(start, start + 3 + 1)
        if ($methods.YingYang(d0) !== 1) return
        if ($methods.YingYang(d1) !== 1) return
        if ($methods.YingYang(d2) !== 2) return
        if ($methods.entity(d0) > ($methods.entity(d1) * 2)) return
        if (!(d0.c > d1.c)) return
        if (!((d2.o < d1.c) && (d2.c > d1.c))) return
        let coords = ['isKlyh', d0.d, d2.d]
        let index = results.findIndex(v => v.code === d0.code)
        if (!coords.length) return
        if (index > -1) {
            results[index].coords.push(coords)
        } else {
            results.push({
                // name: '亢龙有悔',
                // type: 'klyh',
                code: d0.code,
                buy: d2.d,
                datas,
                dwm,
                coords: [coords]
            })
        }
        // return [d0.d, d2.d]
        // let data = datas.slice(start - 30, start + 1)
    },

    isYjsd({ results, datas, start, dwm }) {
        if (dwm !== 'd') return
        let [ d0, d1, d2, d3 ] = datas.slice(start, start + 3 + 1)
        if ($methods.YingYang(d0) !== 2) return
        if ($methods.YingYang(d1) !== 1) return
        if ($methods.YingYang(d2) !== 1) return
        if ($methods.YingYang(d3) !== 2) return
        if (!((d1.c > d0.o) && (d2.c > d0.o) && (d3.o > d0.o))) return
        // 加分
        // if (!(d1.o > d0.c)) return
        if (!(d2.o > d1.o)) return
        if (!(d3.c > d2.o)) return
        
        let coords = ['isYjsd', d0.d, d3.d]
        let index = results.findIndex(v => v.code === d0.code)
        if (!coords.length) return
        if (index > -1) {
            results[index].coords.push(coords)
        } else {
            results.push({
                // name: '一箭双雕',
                // type: 'yjsd',
                code: d0.code,
                buy: d3.d,
                datas,
                dwm,
                coords: [coords]
            })
        }
    }
}

module.exports = alls
