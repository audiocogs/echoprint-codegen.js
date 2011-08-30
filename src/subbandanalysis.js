var SubbandAnalysis = {};

// 128pt, 1/8th band low-pass prototype subsampled from Table_analysis_window
var C = [0.000000477,  0.000000954,  0.000001431,  0.000002384,  0.000003815,  0.000006199,  0.000009060,  0.000013828,
         0.000019550,  0.000027657,  0.000037670,  0.000049591,  0.000062943,  0.000076771,  0.000090599,  0.000101566,
        -0.000108242, -0.000106812, -0.000095367, -0.000069618, -0.000027180,  0.000034332,  0.000116348,  0.000218868,
         0.000339031,  0.000472546,  0.000611782,  0.000747204,  0.000866413,  0.000954151,  0.000994205,  0.000971317,
        -0.000868797, -0.000674248, -0.000378609,  0.000021458,  0.000522137,  0.001111031,  0.001766682,  0.002457142,
         0.003141880,  0.003771782,  0.004290581,  0.004638195,  0.004752159,  0.004573822,  0.004049301,  0.003134727,
        -0.001800537, -0.000033379,  0.002161503,  0.004756451,  0.007703304,  0.010933399,  0.014358521,  0.017876148,
         0.021372318,  0.024725437,  0.027815342,  0.030526638,  0.032754898,  0.034412861,  0.035435200,  0.035780907,
        -0.035435200, -0.034412861, -0.032754898, -0.030526638, -0.027815342, -0.024725437, -0.021372318, -0.017876148,
        -0.014358521, -0.010933399, -0.007703304, -0.004756451, -0.002161503,  0.000033379,  0.001800537,  0.003134727,
        -0.004049301, -0.004573822, -0.004752159, -0.004638195, -0.004290581, -0.003771782, -0.003141880, -0.002457142,
        -0.001766682, -0.001111031, -0.000522137, -0.000021458,  0.000378609,  0.000674248,  0.000868797,  0.000971317,
        -0.000994205, -0.000954151, -0.000866413, -0.000747204, -0.000611782, -0.000472546, -0.000339031, -0.000218868,
        -0.000116348, -0.000034332,  0.000027180,  0.000069618,  0.000095367,  0.000106812,  0.000108242,  0.000101566,
        -0.000090599, -0.000076771, -0.000062943, -0.000049591, -0.000037670, -0.000027657, -0.000019550, -0.000013828,
        -0.000009060, -0.000006199, -0.000003815, -0.000002384, -0.000001431, -0.000000954, -0.000000477, 0];

SubbandAnalysis = function(samples) {
    this.samples = samples;
    this.subbands = 8;
    // floor because we want this be an integer
    this.numFrames = Math.floor((this.samples.length - C.length + 1)/this.subbands);

    // Calculate the analysis filter bank coefficients

    // Computing this everytime instead of building a lookup matrix
    // Apparently memory access is a bottleneck in JS
    this.Mr = function(i,k) {
        return Math.cos((2*i + 1)*(k-4)*(Math.PI/16.0));
    }
    this.Mi = function(i,k) {
        return Math.sin((2*i + 1)*(k-4)*(Math.PI/16.0));
    }
    this.Data = [];
    var i;
    for (i = 0; i < this.subbands; i++) {
        this.Data.push(new Float32Array(this.numFrames));
    }
};

// TODO: move typed array constructors out of here
SubbandAnalysis.prototype.compute = function() {
    var t,
        i,
        j,
        max = C.length,
        Z = new Float32Array(C.length),
        M_ROWS = 8,
        M_COLS = 16,
        Y = new Float32Array(M_COLS);
        // TODO: assert(numFrames > 0);
    var Dr = 0,
        Di = 0;
        

    for (t = 0; t < this.numFrames; ++t) {
        for (i = 0; i < max; ++i) {
            Z[i] = this.samples[t*this.subbands + i] * C[i];
        }
        for (i = 0; i < M_COLS; ++i) {
            Y[i] = Z[i];
        }
        for (i = 0; i < M_COLS; ++i) {
            for (j = 1; j < M_ROWS; ++j) {
                Y[i] += Z[i + M_COLS*j];
            }
        }
        for (i = 0; i < M_ROWS; ++i) {
            for (j = 0; j < M_COLS; ++j) {
                Dr += this.Mr(i,j) * Y[j];
                Di -= this.Mi(i,j) * Y[j];
            }
            this.Data[i][t] = Dr*Dr + Di*Di;
        }
    }
};

SubbandAnalysis.prototype.getNumFrames = function() {
    return this.numFrames;
};

SubbandAnalysis.prototype.getNumBands = function() {
    return this.subbands;
};

SubbandAnalysis.prototype.getMatrix = function() {
    return this.Data;
};

//exports.SubbandAnalysis = SubbandAnalysis;
