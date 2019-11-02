
export class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    addListener(evt, callback) {
        if (!(evt in this.listeners)) {
            this.listeners[evt] = [];
        }
        this.listeners[evt].push(callback);
    }

    emit(evt, ...args) {
        if (!(evt in this.listeners)) {
            return;
        }
        this.listeners[evt].slice().forEach(f => f(evt, this, ...args));
    }
}
