export default function nextTick(cb, ...arg) {
    Promise.resolve().then(() => {
        cb(...arg);
    });
}
