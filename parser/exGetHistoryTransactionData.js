const bufferpack = require('bufferpack');
const BaseParser = require('./base');
const {
  bufferToBytes,
  bytesToBuffer,
  formatDatetime
} = require('../helper');

class ExGetHistoryTransactionData extends BaseParser {
  setParams(market, code, date, start, count) {
    const pkg = Buffer.from('010130000201160016000624', 'hex');
    let pkgArr = bufferToBytes(pkg);
    pkgArr = pkgArr.concat(bufferToBytes(bufferpack.pack('<IB9siH', [ date, market, code, start, count ])));
    this.sendPkg = bytesToBuffer(pkgArr);
    this.date = date;
    // console.log(this.sendPkg)
    // console.log([ date, market, code, start, count ]);
  }

  parseResponse(bodyBuf) {
    let pos = 0;
    const [ market, code, , num ] = bufferpack.unpack('<B9s4sH', bodyBuf.slice(pos, pos + 16));
    pos += 16;
    const result = [];

    for (let i = 0; i < num; i++) {
      let [ rawTime, price, volume, zengcang, direction ] = bufferpack.unpack('<HIIiH', bodyBuf.slice(pos, pos + 16));

      pos += 16;
      const year = Math.floor(this.date / 10000);
      const month = Math.floor(this.date % 10000 / 100);
      const day = this.date % 100;
      const hour = Math.floor(raw_time / 60);
      const minute = rawTime % 60;
      let second = direction % 10000;
      const nature = direction; // 为了老用户接口的兼容性，已经转换为使用 nature_value
      const value = Math.floor(direction / 10000);
      let natureName = '换手';
      // 对于大于59秒的值，属于无效数值
      if (second > 59) {
        second = 0;
      }

      const datetime = formatDatetime(year, month, day, hour, minute, second, 'yyyy-MM-dd hh:mm:ss');

      if (value === 0) {
        direction = 1;
        if (zengcang > 0) {
          if (volume > zengcang) {
            natureName = '多开';
          }
          else if (volume === zengcang) {
            natureName = '双开';
          }
        }
        else if (zengcang === 0) {
          natureName = '多换';
        }
        else {
          if (volume === -zengcang) {
            natureName = '双平';
          }
          else {
            natureName = '空平';
          }
        }
      }
      else if (value === 1) {
        direction = -1;
        if (zengcang > 0) {
          if (volume > zengcang) {
            natureName = '空开';
          }
          else if (volume === zengcang) {
            natureName = '双开';
          }
        }
        else if (zengcang === 0) {
          natureName = '空换';
        }
        else {
          if (volume === -zengcang) {
            natureName = '双平';
          }
          else {
            natureName = '多平';
          }
        }
      }
      else {
        direction = 0;
        if (zengcang > 0) {
          if (volume > zengcang) {
            natureName = '开仓';
          }
          else if (volume === zengcang) {
            natureName = '双开';
          }
        }
        else if (zengcang < 0) {
          if (volume > -zengcang) {
            natureName = '平仓';
          }
          else if (volume === -zengcang) {
            natureName = '双平';
          }
        }
        else {
          natureName = '换手';
        }
      }

      if (market === 31 || market === 48) {
        if (nature === 0) {
          direction = 1;
          natureName = 'B';
        }
        else if (nature === 256) {
          direction = -1;
          natureName = 'S';
        }
        else { // 512
          direction = 0;
          natureName = '';
        }
      }

      result.push({
        datetime,
        hour,
        minute,
        price: price / 1000,
        volume,
        zengcang,
        natureName,
        direction,
        nature
      });
    }

    return result;
  }

  setup() {}
}

module.exports = ExGetHistoryTransactionData;
