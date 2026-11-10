export const state = {
    settings: {},
    commands: {},
    queue: [],
    isConnected: false,
    sessionHistory: [],
    previousQueueState: [],
    previousPlayingId: null
};

export function updateState(key, value) {
    state[key] = value;
}
