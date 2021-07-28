/*
 * @Author: shaddollxz
 * @Date: 2021-07-27 23:57:05
 * @LastEditTime: 2021-07-28 14:19:48
 * @Description: file content
 */
import { getByPath } from "./util.js";

export default class Watcher {
    constructor(vm, key, cb) {
        this.vm = vm;
        this.key = key; //? 代表该数据在$data哪里的字符串
        this.cb = cb; //? 更新页面的回调函数
        window.target = this;
        //! 获得旧数据，同时触发vm[key]的get把上面一行设置watcher实例push进dep 见observer.js
        this.oldValue = getByPath(vm, key);
    }

    //? dep调用notify来调用所有的update更新视图
    update() {
        let newValue = getByPath(this.vm, this.key);
        if (newValue === this.oldValue) return;
        this.oldValue = newValue;
        this.cb(newValue);
    }
}
