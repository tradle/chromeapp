var http = require('http');
var querystring = require('querystring');
var concat = require('concat-stream');

function lookup(domain, family, cb) {
  if (typeof family === 'function') {
    cb = family;
    family = undefined;
  }

  http.get('http://www.fileformat.info/tool/rest/dns.json?' + querystring.stringify({
    q: domain
  }), function (res) {
    res.pipe(concat(function (buf) {
      var body = JSON.parse(buf.toString());
      var result = body.result;
      var answer = body.answer;
      if (result.code !== 200) return cb(new Error(result.message));

      cb(null, answer.values[0].address, 4);
    }))
  });
}

module.exports = {
  lookup: lookup
}
