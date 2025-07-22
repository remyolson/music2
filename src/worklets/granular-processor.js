// Granular Synthesis AudioWorklet Processor
// Implements efficient granular synthesis for ambient pad sounds

class GranularProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Initialize granular parameters
    this.sampleRate = sampleRate;
    this.grainSize = options.processorOptions?.grainSize || 0.1;
    this.grainDensity = options.processorOptions?.grainDensity || 10;
    this.shimmer = options.processorOptions?.shimmer || 0.3;
    this.wet = options.processorOptions?.wet || 1.0;
    
    // Grain management
    this.grains = [];
    this.maxGrains = 32;
    this.grainBuffer = new Float32Array(Math.floor(this.grainSize * this.sampleRate * 2));
    this.bufferIndex = 0;
    this.nextGrainTime = 0;
    
    // Initialize grains
    for (let i = 0; i < this.maxGrains; i++) {
      this.grains.push({
        active: false,
        startTime: 0,
        position: 0,
        duration: 0,
        amplitude: 0,
        pitch: 1.0,
        pan: 0
      });
    }
  }
  
  getEnvelope(position, duration) {
    // Hann window envelope for smooth grains
    const phase = position / duration;
    return 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  }
  
  triggerGrain(currentTime) {
    // Find inactive grain
    const grain = this.grains.find(g => !g.active);
    if (!grain) return;
    
    // Randomize grain parameters
    grain.active = true;
    grain.startTime = currentTime;
    grain.position = 0;
    grain.duration = this.grainSize * this.sampleRate * (0.8 + Math.random() * 0.4);
    grain.amplitude = 0.3 + Math.random() * 0.4;
    grain.pitch = 1.0 + (Math.random() - 0.5) * this.shimmer;
    grain.pan = (Math.random() - 0.5) * 0.8;
    
    // Random buffer position for grain playback
    grain.bufferStart = Math.floor(Math.random() * (this.grainBuffer.length - grain.duration));
  }
  
  processGrain(grain, outputSample) {
    if (!grain.active) return outputSample;
    
    // Calculate envelope
    const envelope = this.getEnvelope(grain.position, grain.duration);
    
    // Read from buffer with pitch shifting
    const readPosition = grain.bufferStart + Math.floor(grain.position * grain.pitch);
    const bufferSample = this.grainBuffer[readPosition % this.grainBuffer.length];
    
    // Apply envelope and amplitude
    const grainSample = bufferSample * envelope * grain.amplitude;
    
    // Update grain position
    grain.position++;
    
    // Deactivate grain if complete
    if (grain.position >= grain.duration) {
      grain.active = false;
    }
    
    return outputSample + grainSample;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input[0]) {
      return true;
    }
    
    const inputChannel = input[0];
    const outputLeft = output[0];
    const outputRight = output[1] || output[0];
    
    const grainInterval = this.sampleRate / this.grainDensity;
    
    for (let i = 0; i < inputChannel.length; i++) {
      const inputSample = inputChannel[i];
      
      // Store input in circular buffer
      this.grainBuffer[this.bufferIndex] = inputSample;
      this.bufferIndex = (this.bufferIndex + 1) % this.grainBuffer.length;
      
      // Trigger new grains based on density
      this.nextGrainTime--;
      if (this.nextGrainTime <= 0) {
        this.triggerGrain(i);
        this.nextGrainTime = grainInterval * (0.8 + Math.random() * 0.4);
      }
      
      // Process all active grains
      let outputSample = 0;
      for (const grain of this.grains) {
        outputSample = this.processGrain(grain, outputSample);
      }
      
      // Mix wet and dry signals
      const wetSample = outputSample;
      const drySample = inputSample;
      const mixedSample = drySample * (1 - this.wet) + wetSample * this.wet;
      
      // Apply stereo panning for active grains
      let leftSum = mixedSample;
      let rightSum = mixedSample;
      
      for (const grain of this.grains) {
        if (grain.active) {
          const panLeft = Math.cos((grain.pan + 1) * Math.PI / 4);
          const panRight = Math.sin((grain.pan + 1) * Math.PI / 4);
          leftSum *= panLeft;
          rightSum *= panRight;
        }
      }
      
      outputLeft[i] = leftSum;
      outputRight[i] = rightSum;
    }
    
    return true;
  }
}

registerProcessor('granular-processor', GranularProcessor);