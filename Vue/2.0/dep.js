/*
 * @Author: shaddollxz
 * @Date: 2021-07-27 18:49:27
 * @LastEditTime: 2021-07-28 14:18:05
 * @Description: 用来收集变化
 */
import { nextTick } from "./util.js";

export default class Dep {
    constructor() {
        this.watchers = [];
        this.lock = true;
    }
    add(watcher) {
        this.watchers.push(watcher);
    }
    notify() {
        //? 放入微任务队列，只要触发一次notify就不再触发，在微任务里更新视图，这样所有数据都更新后再触发更新
        if (this.lock) {
            this.lock = false;
            nextTick(() => {
                this.watchers.forEach((watcher) => {
                    watcher.update(); //? 用watcher实例的update更新视图
                });
            });
            nextTick(() => {
                this.lock = true;
            });
        }
    }
}
