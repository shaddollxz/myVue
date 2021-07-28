/*
 * @Author: shaddollxz
 * @Date: 2021-07-27 18:49:27
 * @LastEditTime: 2021-07-27 21:17:00
 * @Description: 用来收集变化
 */
import render from "./Render.js";
import nextTick from "./nextTick.js";
export default class Dep {
    constructor() {
        this.lock = true;
    }

    notify(vm) {
        //? onBeforeUpdate
        //! 把更新视图放到微任务队列，即使多个数据改变也只渲染一次
        if (this.lock) {
            this.lock = false;
            //! 应该在这里运用diff算法更新DOM树 这里只是重新渲染一次页面
            nextTick(render, vm);
            nextTick(() => (this.lock = true)); //? onupdated
        }
    }
}
