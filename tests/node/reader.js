var fs = require('fs');

var pcm = require('../../lib/pcmdata.js');


var pcmfile = fs.readFileSync("question.wav", "binary");
var decode = pcm.PCMData.decode(pcmfile);
/*var decoded = pcm.PCMData.decodeFrame(pcmfile, 16);*/

console.log(decoded);
