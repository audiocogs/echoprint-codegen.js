importScripts('../src/whitening.js',
        '../src/subbandanalysis.js',
        '../src/fingerprint.js',
        '../src/codegen.js',
        '../lib/base64.js',
        '../lib/rawdeflate.js'
);
 
addEventListener("message", function(e) {
    var pcm = e.data.pcm;
    var codegen = new Codegen(pcm, 20);
    postUpdate('fingerprint', codegen.getCodeString());
}, false);

function postUpdate(type, msg) {
    postMessage({'type': type, 'data': msg});
}

function reportProgress(msg) {
    postUpdate('progress', msg);
}

