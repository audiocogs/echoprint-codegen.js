var Fingerprint = {};

var Util = {
    //thanks, jsmad
    memcpy: function (dst, dstOffset, src, srcOffset, length) {
        // this is a pretty weird memcpy actually - it constructs a new version of dst, because we have no other way to do it
        return dst.slice(0, dstOffset) + src.slice(srcOffset, srcOffset + length) + dst.slice(dstOffset + length);
    },
    bitwiseAnd: function (a, b) {
        var w = 2147483648; // 2^31

        var aHI = (a / w) << 0;
        var aLO = a % w;
        var bHI = (b / w) << 0;
        var bLO = b % w;

        return ((aHI & bHI) * w + (aLO & bLO));
    }
};

/**
 * JS Implementation of MurmurHash3 (as of April 6, 2011)
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash 
 */

Util.murmurhash3_32_gc = function(key, seed) {
	var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
	
	remainder = key.length & 3; // key.length % 4
	bytes = key.length - remainder;
	h1 = seed;
	c1 = 0xcc9e2d51;
	c2 = 0x1b873593;
	i = 0;
	
	while (i < bytes) {
	  	k1 = 
	  	  ((key.charCodeAt(i) & 0xff)) |
	  	  ((key.charCodeAt(++i) & 0xff) << 8) |
	  	  ((key.charCodeAt(++i) & 0xff) << 16) |
	  	  ((key.charCodeAt(++i) & 0xff) << 24);
		++i;
		
		k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

		h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
		h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
		h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
	}
	
	k1 = 0;
	
	switch (remainder) {
		case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k1 ^= (key.charCodeAt(i) & 0xff);
		
		k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
		k1 = (k1 << 16) | (k1 >>> 16);
		k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
		h1 ^= k1;
	}
	
	h1 ^= key.length;

	h1 ^= h1 >>> 16;
	h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
	h1 ^= h1 >>> 13;
	h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
	h1 ^= h1 >>> 16;

	return h1 >>> 0;
};


Fingerprint = function(subbandanalysis, offset) {
    this.subbandanalysis = subbandanalysis;
    this.offset = offset;
    this.codes = [];
};

var subbands = 8;

// reusable
var adaptiveOnset_H = new Float32Array(subbands),
    adaptiveOnset_taus = new Float32Array(subbands),
    adaptiveOnset_N = new Float32Array(subbands),
    adaptiveOnset_contact = new Int32Array(subbands),
    adaptiveOnset_lcontact = new Int32Array(subbands),
    adaptiveOnset_tsince = new Int32Array(subbands),
    adaptiveOnset_ham = new Float32Array(8),
    adaptiveOnset_Y0 = new Float32Array(subbands),
    adaptiveOnset_onset_counter_for_band = new Uint32Array(subbands);

 
/* uint Fingerprint::adaptiveOnsets(int ttarg, matrix_u&out, uint*&onset_counter_for_band)
 * return both out and onset-counter_for_band */
Fingerprint.prototype.adaptiveOnsets = function(ttarg) {
    //  E is a sgram-like matrix of energies.
    var E = this.subbandanalysis.getMatrix(), /* row major */
        bands,
        frames,
        i,
        j,
        k,
        deadtime = 128,
        overfact = 1.1,  /* threshold rel. to actual peak */
        onset_counter = 0;

        // Take successive stretches of 8 subband samples and sum their energy under a hann window, then hop by 4 samples (50% window overlap).
    var hop = 4,
        nsm = 8,
        nc =  Math.floor(E[0].length/hop)-(Math.floor(nsm/hop)-1);
        a1 = 0.98,
        xn = 0;

    for(i = 0 ; i != nsm ; i++) {
        adaptiveOnset_ham[i] = .5 - .5*Math.cos( (2.*Math.PI/(nsm-1))*i);
    }

    var Eb = []; /* column major*/
    for(i = 0; i < nc; i++) {
        Eb.push(new Float32Array(8));
    }

    for(i=0;i<nc;i++) {
        for(j=0;j<subbands;j++) {
            for(k=0;k<nsm;k++)  Eb[i][j] = Eb[i][j] + ( E[j][(i*hop)+k] * adaptiveOnset_ham[k]);
            Eb[i][j] = Math.sqrt(Eb[i][j]);
        }
    }

    frames = Eb.length;
    bands = Eb[0].length;

    var out = []; /* column major */
    for (i = 0; i < subbands; i++) {
        out.push(new Uint32Array(frames));
    }

    /* what needed initialization at 0 got it from typed array instantiation */
    for (j = 0; j < bands; ++j) {
        adaptiveOnset_taus[j] = 1.0;
    }

    for (i = 0; i < frames; ++i) {
        for (j = 0; j < subbands; ++j) {

            xn = 0;
            /* calculate the filter -  FIR part */
            var nbn = 3
            if (i >= 2*nbn) {
                /* unrolled loop. The original is:
                   for (int k = 0; k < nbn; ++k) {
                       xn += bn[k]*(pE[j-SUBBANDS*k] - pE[j-SUBBANDS*(2*nbn-k)]);
                   }
                   where:
                   double bn[] = {0.1883, 0.4230, 0.3392}; the preemph filter
                   #define SUBBANDS 8
                   pE is a pointer to Eb (pE = &Eb.data()[0])
                   and at every run of the outmost loop (i.e. int i from 0 to frames), you have
                   pE += bands;
                   But bands is just the length the second dimension of the matrix (see definition above)

                   My interperpretation is that following relation holds
                   pE[j -+ m] = E[i -+ m/bands][j]
                */

                    xn += 0.1883*(Eb[i - subbands/bands * 0][j] - Eb[i - subbands/bands * (2*nbn-0)][j]);
                    xn += 0.4230*(Eb[i - subbands/bands * 1][j] - Eb[i - subbands/bands * (2*nbn-1)][j]);
                    xn += 0.3392*(Eb[i - subbands/bands * 2][j] - Eb[i - subbands/bands * (2*nbn-2)][j]);
            }
            /* IIR part */
            xn = xn + a1*adaptiveOnset_Y0[j];
            /* remember the last filtered level */
            adaptiveOnset_Y0[j] = xn;

            adaptiveOnset_contact[j] = (xn > adaptiveOnset_H[j])? 1 : 0;

            if (adaptiveOnset_contact[j] == 1 && adaptiveOnset_lcontact[j] == 0) {
                /* attach - record the threshold level unless we have one */
                if(adaptiveOnset_N[j] == 0) {
                    adaptiveOnset_N[j] = adaptiveOnset_H[j];
                }
            }
            if (adaptiveOnset_contact[j] == 1) {
                /* update with new threshold */
                adaptiveOnset_H[j] = xn * overfact;
            } else {
                /* apply decays */
                adaptiveOnset_H[j] = adaptiveOnset_H[j] * Math.exp(-1.0/adaptiveOnset_taus[j]);
            }

            if (adaptiveOnset_contact[j] == 0 && adaptiveOnset_lcontact[j] == 1) {
                /* detach */
                if (adaptiveOnset_onset_counter_for_band[j] > 0 && out[j][adaptiveOnset_onset_counter_for_band[j]-1] > i - deadtime) {
                    // overwrite last-written time
                    --adaptiveOnset_onset_counter_for_band[j];
                    --onset_counter;
                }
                out[j][adaptiveOnset_onset_counter_for_band[j]++] = i;
                ++onset_counter;
                adaptiveOnset_tsince[j] = 0;
            }
            ++adaptiveOnset_tsince[j];
            if (adaptiveOnset_tsince[j] > ttarg) {
                adaptiveOnset_taus[j] = adaptiveOnset_taus[j] - 1;
                if (adaptiveOnset_taus[j] < 1) adaptiveOnset_taus[j] = 1;
            } else {
                adaptiveOnset_taus[j] = adaptiveOnset_taus[j] + 1;
            }

            if ( (adaptiveOnset_contact[j] == 0) &&  (adaptiveOnset_tsince[j] > deadtime)) {
                /* forget the threshold where we recently hit */
                adaptiveOnset_N[j] = 0;
            }
            adaptiveOnset_lcontact[j] = adaptiveOnset_contact[j];
        }
    }

    return { onset_counter: onset_counter, onset_counter_for_band: adaptiveOnset_onset_counter_for_band, out: out }
};

/* TODO: move repeating constants from the * quantized_time_for_frame_* functions */
Fingerprint.prototype.quantized_time_for_frame_delta = function(frame_delta) {
    var QUANTIZE_DT_S = (256.0/11025.0),
        samplingRate = 11025,
        time_for_frame_delta = frame_delta / (samplingRate / 32.0);

    return (Math.floor((time_for_frame_delta * 1000.0) / QUANTIZE_DT_S) * QUANTIZE_DT_S) / Math.floor(QUANTIZE_DT_S*1000.0);
};

Fingerprint.prototype.quantized_time_for_frame_absolute = function(frame) {
    var QUANTIZE_A_S = (256.0/11025.0),
        samplingRate = 11025,
        time_for_frame = this.offset + frame / (samplingRate / 32.0);

    return (Math.round((time_for_frame * 1000.0) /  QUANTIZE_A_S) * QUANTIZE_A_S) / Math.floor(QUANTIZE_A_S*1000.0);
};

//reusable
var compute_hash_material = new Uint8Array(5);

Fingerprint.prototype.compute = function() {
    var actual_codes = 0,
        hash_material = compute_hash_material,
        hashed_code,
        HASH_SEED = 0x9ea5fa36,
        HASH_BITMASK = 0x000fffff,
        adaptive_onsets = this.adaptiveOnsets(345),
        onset_count = adaptive_onsets.onset_counter,
        onset_counter_for_band = adaptive_onsets.onset_counter_for_band,
        out = adaptive_onsets.out,
        band,
        onset,
        time_for_onset_ms_quantized;

   var p = [];
   p[0] = new Uint32Array(6);
   p[1] = new Uint32Array(6);

   var nhashes,
       time_delta0,
       time_delta1;

   var i,
       k;


    for(band=0;band<subbands;band++) {
        console.log("Ohai. I'm trying to compute a fingerprint.");
        if (onset_counter_for_band[band]>2) {
            for(onset=0;onset<onset_counter_for_band[band]-2;onset++) {
                // What time was this onset at?
                time_for_onset_ms_quantized = this.quantized_time_for_frame_absolute(out[band][onset]);

                for (i = 0; i < p[0].length; i++) {
                    p[0][i] = 0;
                    p[1][i] = 0;
                }
                nhashes = 6;

                if (onset === onset_counter_for_band[band]-4)  { nhashes = 3; }
                if (onset === onset_counter_for_band[band]-3)  { nhashes = 1; }
                p[0][0] = (out[band][onset+1] - out[band][onset]);
                p[1][0] = (out[band][onset+2] - out[band][onset+1]);
                if(nhashes > 1) {
                    p[0][1] = (out[band][onset+1] - out[band][onset]);
                    p[1][1] = (out[band][onset+3] - out[band][onset+1]);
                    p[0][2] = (out[band][onset+2] - out[band][onset]);
                    p[1][2] = (out[band][onset+3] - out[band][onset+2]);
                    if(nhashes > 3) {
                        p[0][3] = (out[band][onset+1] - out[band][onset]);
                        p[1][3] = (out[band][onset+4] - out[band][onset+1]);
                        p[0][4] = (out[band][onset+2] - out[band][onset]);
                        p[1][4] = (out[band][onset+4] - out[band][onset+2]);
                        p[0][5] = (out[band][onset+3] - out[band][onset]);
                        p[1][5] = (out[band][onset+4] - out[band][onset+3]);
                    }
                }

                // For each pair emit a code
                for(k=0;k<6;k++) {
                    // Quantize the time deltas to 23ms
                    time_delta0 = this.quantized_time_for_frame_delta(p[0][k]);
                    time_delta1 = this.quantized_time_for_frame_delta(p[1][k]);
                    // Create a key from the time deltas and the band index
                    /* Util.memcpy(dst, dstOffset, src, srcOffset, length)
                     * returns a new copy of dst with modified bytes */
                    hash_material = Util.memcpy(hash_material, 0, time_delta0, 0, 2);
                    hash_material = Util.memcpy(hash_material, 2, time_delta1, 0, 2);
                    hash_material = Util.memcpy(hash_material, 4, band, 0, 1);
                    hashed_code = Util.bitwiseAnd(Util.murmurhash3_32_gc(hash_material, HASH_SEED), HASH_BITMASK);

                    // Set the code alongside the time of onset
                    this.codes.push(fpcode(time_for_onset_ms_quantized, hashed_code));
                    //fprintf(stderr, "whee %d,%d: [%d, %d] (%d, %d), %d = %u at %d\n", actual_codes, k, time_delta0, time_delta1, p[0][k], p[1][k], band, hashed_code, time_for_onset_ms_quantized);
                }
            }
        }
    }

    function fpcode(f, c) {
        return { frame: f, code: c }
    }
};

Fingerprint.prototype.getCodes = function () {
    return this.codes;
};

//exorts.Fingerpint = Fingerpint;
