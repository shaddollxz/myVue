export function nextTick(cb, ...arg) {
    Promise.resolve().then(() => {
        cb(...arg);
    });
}
export function getByPath(obj, path) {
    const pathArr = path.split(".");
    return pathArr.reduce((result, curr) => {
        return result[curr];
    }, obj);
}
export function getEl(el) {
    if (!(el instanceof Element)) {
        try {
            return document.querySelector(el);
        } catch {
            throw "没有选中挂载元素";
        }
    } else return el;
}
