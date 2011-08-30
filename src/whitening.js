var Whitening = {};

//TODO: do allocations outside of functions
Whitening = function(samples) {
    this.p = 40;
    this.samples = samples;
    // precision ?
    this.Xo = new Float32Array(this.p+1);
    this.R = new Float32Array(this.p+1);
    this.R[0] = 0.001;
    this.ai = new Float32Array(this.p+1);
    this.whitened = new Float32Array(this.samples.length);
};

Whitening.prototype.compute = function() {
    var blocklen = 10000,
        newblocklen,
        i,
        max = this.samples.length;

    for (i = 0; i < max; i=i+blocklen) {
        if (i+blocklen >= max) {
            newblocklen = max - i - 1;
        } else {
            newblocklen = blocklen;
        }
        this.computeBlock(i, newblocklen);
    }

};

Whitening.prototype.computeBlock = function(start, blocksize) {
    var i,
        j,
        E,
        ki,
        T = 8, 
        alpha = 1.0 / T,
        max = this.p,
        acc,
        sumalphaR,
        aj,
        aimj;


    // calculate autocorrelation of current block

    for (i = 0; i <= max; i++) {
        acc = 0;
        for (j = 0; j < blocksize; j++) {
            if (j >= i) {
                acc += this.samples[j + start] * this.samples[j - i + start];
            }
        }
        // smothed update
        this.R[i] += alpha * (acc - this.R[i]);
    }

    // calculate new filter coefficients
    // Durbin's recursion, per p. 411 of Rabiner & Schafer 1978

    E = this.R[0];

    for (i = 1; i <= max; i++) {
        sumalphaR = 0;
        for (j = 1; j < i; j++) {
            sumalphaR += this.ai[j] * this.R[i-j];
        }
        ki = (this.R[i] - sumalphaR)/E;
        this.ai[i] = ki;
        for (j = 1; j <= i/2; j++) {
            aj = this.ai[j];
            aimj = this.ai[i-j];
            this.ai[j] = aj - ki*aimj;
            this.ai[i-j] = aimj - ki*aj;
        }
        E = (1-ki*ki)*E;
    }
    // calculate new output
    for (i = 0; i < blocksize; i++) {
        acc = this.samples[i+start];
        for (j = 1; j <= max; ++j) {
            if (i-j < 0) {
                acc -= this.ai[j] * this.Xo[max + i-j];
            } else {
                acc -= this.ai[j]*this.samples[i-j+start];
            }
        }
        this.whitened[i+start] = acc;
    }
    // save last few frames of input
    for (i = 0; i <= max; ++i) {
        this.Xo[i] = this.samples[blocksize-1-max+i+start];
    }
};


Whitening.prototype.getWhitenedSamples = function() {
    return this.whitened;
}

Whitening.prototype.getNumSamples = function() {
    return this.samples.length;
};

//exports.Whitening = Whitening;
