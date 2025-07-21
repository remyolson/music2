let currentState = null;
const subscribers = [];

export function getState() {
  return currentState;
}

export function update(newState) {
  currentState = newState;
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