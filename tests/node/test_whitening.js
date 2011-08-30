var fs = require('fs');
var w = require('../../src/whitening.js');
var p = require('../../lib/pcmdata.js');

var pcmfile = fs.readFileSync("cryforashadow.pcm", "binary");

var sampleRate = 11025;
var buffer = new Float32Array(Math.round(sampleRate * 20 / 8));
var pcm = p.PCMData.decodeFrame(pcmfile, 16, buffer);

var filter = new w.Whitening(pcm);
filter.compute();
var whitened = filter.getWhitenedSamples();

for (var i = 0; i < pcm.length; i++) {
    console.log(whitened[i]);
}
