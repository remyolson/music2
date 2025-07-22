// Reverb AudioWorklet Processor
// Implements an efficient reverb algorithm for offloading from main thread

class ReverbProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Initialize reverb parameters
    this.sampleRate = sampleRate;
    this.decay = options.processorOptions?.decay || 4.0;
    this.preDelay = options.processorOptions?.preDelay || 0.03;
    this.wet = options.processorOptions?.wet || 0.5;
    
    // Create delay lines for reverb
    this.delayLines = this.createDelayLines();
    this.allpassFilters = this.createAllpassFilters();
    this.combFilters = this.createCombFilters();
    
    // Pre-delay buffer
    this.preDelayBuffer = new Float32Array(Math.floor(this.preDelay * this.sampleRate));
    this.preDelayIndex = 0;
  }
  
  createDelayLines() {
    // Create multiple delay lines with different lengths (in samples)
    const delays = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116];
    return delays.map(length => ({
      buffer: new Float32Array(length),
      index: 0,
      length
    }));
  }
  
  createAllpassFilters() {
    // Allpass filter delays (in samples)
    const delays = [225, 556, 441, 341];
    return delays.map(length => ({
      buffer: new Float32Array(length),
      index: 0,
      length,
      gain: 0.5
    }));
  }
  
  createCombFilters() {
    // Comb filter parameters
    const params = [
      { delay: 1116, gain: 0.83 },
      { delay: 1188, gain: 0.81 },
      { delay: 1277, gain: 0.78 },
      { delay: 1356, gain: 0.76 }
    ];
    
    return params.map(({ delay, gain }) => ({
      buffer: new Float32Array(delay),
      index: 0,
      length: delay,
      gain: gain * Math.pow(0.001, delay / (this.decay * this.sampleRate))
    }));
  }
  
  processAllpass(input, filter) {
    const { buffer, index, length, gain } = filter;
    const delayed = buffer[index];
    const output = -input + delayed;
    buffer[index] = input + delayed * gain;
    filter.index = (index + 1) % length;
    return output;
  }
  
  processComb(input, filter) {
    const { buffer, index, length, gain } = filter;
    const delayed = buffer[index];
    const output = delayed;
    buffer[index] = input + delayed * gain;
    filter.index = (index + 1) % length;
    return output;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input[0]) {
      return true;
    }
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    
    for (let i = 0; i < inputChannel.length; i++) {
      let sample = inputChannel[i];
      
      // Apply pre-delay
      const preDelayed = this.preDelayBuffer[this.preDelayIndex];
      this.preDelayBuffer[this.preDelayIndex] = sample;
      this.preDelayIndex = (this.preDelayIndex + 1) % this.preDelayBuffer.length;
      
      // Process through comb filters in parallel
      let reverbSum = 0;
      for (const comb of this.combFilters) {
        reverbSum += this.processComb(preDelayed, comb);
      }
      reverbSum *= 0.25; // Average the comb outputs
      
      // Process through allpass filters in series
      let allpassOutput = reverbSum;
      for (const allpass of this.allpassFilters) {
        allpassOutput = this.processAllpass(allpassOutput, allpass);
      }
      
      // Mix wet and dry signals
      outputChannel[i] = sample * (1 - this.wet) + allpassOutput * this.wet;
    }
    
    // Handle stereo output by slightly detuning right channel
    if (output[1]) {
      const rightChannel = output[1];
      for (let i = 0; i < rightChannel.length; i++) {
        // Add slight delay to create stereo width
        const delayIndex = Math.max(0, i - 5);
        rightChannel[i] = outputChannel[delayIndex];
      }
    }
    
    return true;
  }
}

registerProcessor('reverb-processor', ReverbProcessor);