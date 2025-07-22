let currentState = {};
const subscribers = [];

// Live input state
let liveInputState = {
  active: false,
  latency: 0,
  recording: false,
  effectCount: 0
};
const liveInputSubscribers = [];

export function getState() {
  return currentState;
}

export function update(newState) {
  // Merge new state with current state instead of replacing
  currentState = { ...currentState, ...newState };
  subscribers.forEach(callback => callback(currentState));
}

export function subscribe(callback) {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
}

// Live input state management
export function getLiveInputState() {
  return liveInputState;
}

export function updateLiveInputState(updates) {
  liveInputState = { ...liveInputState, ...updates };
  liveInputSubscribers.forEach(callback => callback(liveInputState));
}

export function subscribeLiveInput(callback) {
  liveInputSubscribers.push(callback);
  return () => {
    const index = liveInputSubscribers.indexOf(callback);
    if (index > -1) {
      liveInputSubscribers.splice(index, 1);
    }
  };
}