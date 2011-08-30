var Codegen = {};

//Codegen::Codegen(const float* pcm, unsigned int numSamples, int start_offset) {
Codegen = function(pcm, start_offset) {
    //TODO: check this
    /*if (Params::AudioStreamInput::MaxSamples < (uint)numSamples)
        throw std::runtime_error("File was too big\n");*/

    var whitening,
        audiobuffer,
        subbandanalysis,
        fingerprint,
        codes;

    whitening = new Whitening(pcm);
    whitening.compute();

    /* 
    AudioBufferInput *pAudio = new AudioBufferInput();
    pAudio->SetBuffer(pWhitening->getWhitenedSamples(), pWhitening->getNumSamples());
    */
    audiobuffer = whitening.getWhitenedSamples();

    subbandanalysis = new SubbandAnalysis(audiobuffer);
    subbandanalysis.compute();

    fingerprint = new Fingerprint(subbandanalysis, start_offset);
    fingerprint.compute();

    codes = fingerprint.getCodes()
    this.codestring = this.createCodeString(codes);
    this.numcodes = codes.length;
};

Codegen.prototype.createCodeString = function(codes) {
    var codestream = "",
        i,
        len = codes.length;

    if (codes.length < 3) {
        return "";
    }

    //TODO: pad with zeroes
    for(i = 0; i < len; i++) {
        codestream += (codes[i].frame).toString(16); //hex
    }
    for(i = 0; i < len; i++) {
        codestream += (codes[i].code).toString(16); //hex
    }

    return this.compress(codestream);
}

Codegen.prototype.compress = function(str) {
    return Base64.encode(FlateStream(str).getBytes());
}

/*
string Codegen::createCodeString(vector<FPCode> vCodes) {
    if (vCodes.size() < 3) {
        return "";
    }
    std::ostringstream codestream;
    codestream << std::setfill('0') << std::hex;
    for (uint i = 0; i < vCodes.size(); i++)
        codestream << std::setw(5) << vCodes[i].frame;

    for (uint i = 0; i < vCodes.size(); i++) {
        int hash = vCodes[i].code;
        codestream << std::setw(5) << hash;
    }
    return compress(codestream.str());
}
*/

Codegen.prototype.getCodeString = function() {
    return this.codestring;
}

Codegen.prototype.getNumCodes = function() {
    return this.numcodes;
}
