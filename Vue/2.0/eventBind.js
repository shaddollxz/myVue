class Event {
    constructor() {
        this.collector = Object.create(null);
    }
    on(eName, cb) {
        this.collector[eName] ? this.collector[eName].push(cb) : (this.collector[eName] = [cb]);
    }
    off(eName, cb) {
        if (!(eName && cb)) {
            this.collector = Object.create(null);
        } else if (eName && !cb) {
            delete this.collector[eName];
        } else {
            this.collector[eName].splice(this.collector[eName].indexOf(cb), 0);
        }
        return this;
    }
    emit(eName, ...arg) {
        for (const cb of this.collector[eName]) {
            cb(...arg);
        }
    }
}

const eventBinder = new Event();

export { eventBinder };
export default eventBinder.emit.bind(eventBinder); //! emit会被注册到vm上，让它的this始终指向eventBinder
