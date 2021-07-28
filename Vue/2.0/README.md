# 总体流程

仍然是根据自己理解来实现的绑定，相较于上一版的数据更新就全部刷新，这次改成了部分页面更改，总体流程大致如图：

![字本来就丑拿个笔芯写得更难看](https://raw.githubusercontent.com/shaddollxz/picBed/main/img/blogQQ%E5%9B%BE%E7%89%8720210728143535.jpg)

这里就从头介绍下怎样实现整个流程的

# createApp

这里是整个Vue的入口，通过传入`options`参数会将里面的`data,methods`等挂载到Vue实例上，再通过代理，让对``vm`的属性访问转换为对`vm.$data`中属性的访问：

```javascript
static createApp(options) {
        //? 将data代理到vm上
        const vm = new Proxy(new Vue(), {
            get(target, p) {
                if (Reflect.get(target, p)) {
                    return Reflect.get(target, p);
                } else {
                    return target.$data[p]._isref ? target.$data[p].value : target.$data[p];
                }
            },
            set(target, p, value) {
                if (target[p]) {
                    Reflect.set(target, p, value);
                } else if (target.$data[p]?._isref) {
                    Reflect.set(target.$data[p], "value", value);
                } else {
                    Reflect.set(target.$data, p, value);
                }
                return true;
            },
        });

        options.onBeforCreate?.call(vm);

        vm.$data = options.data.call(vm);
        new Observer(vm).observeData(); //! 将data的数据转为响应式

        for (const key in options.methouds) {
            vm.$methouds[key] = options.methouds[key].bind(vm);
        }

        options.onCreated?.call(vm);
        return vm;
    }
```

# 将data中的数据转换为响应式

这个步骤通过`Observer`实例中的`observeData`来进行，我这里通过`Proxy`来实现（Vue2.x中使用`Object.defineProperty`）。

```javascript
import Dep from "./dep.js";

const dep = new Dep();

export default class Observer {
    constructor(vm) {
        this.vm = vm;
    }
    observeData() {
        const data = this.vm.$data;
        for (const key in data) {
            data[key] = this.ref(data[key]);
        }
    }
    // *===============↓ 将数据转换为响应式数据的方法 ↓===============* //
    reactive(data) {
        //? 如果对象里还有对象，递归实现响应式
        for (const key in data) {
            if (typeof data[key] === "object") {
                data[key] = this.reactive(data[key]);
            }
        }
        return new Proxy(data, {
            get(target, p) {
                window.target && dep.add(window.target);
                window.target = null; //? 将watch实例保存后删除
                return Reflect.get(target, p);
            },
            //todo 修改对象属性后修改Vnode
            set(target, p, value) {
                target._isref
                    ? Reflect.set(target, "value", value)
                    : Reflect.set(target, p, value);

                dep.notify();

                return true;
            },
        });
    }
    ref(data) {
        //? 基本数据类型会被包装为对象再进行代理
        if (typeof data != "object") {
            data = {
                value: data,
                _isref: true,
                toSting() {
                    return this.value;
                },
            };
        }
        return this.reactive(data);
    }
}
```

这里在`get`上设置了`dep.add`，在第一次渲染页面的时候会读取到对应的`$data`中的属性，在这个时候将这个属性的位置和一个用来更新视图的回调函数打包进`Watcher`的实例再放入`dep`中储存起来，在以后数据更新时会触发`set`，通知`dep`调用储存的所有`watcher`实例上的`update`方法，`update`方法会比较储存的旧值来决定是否触发回调函数来更新视图。

Dep：

```javascript
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
                this.lock = true;
            });
        }
    }
}
```

Watcher：

```javascript
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
```

为了使用方便，这里把Watcher的实例化过程挂载到vm上，实例化Watcher并推入dep的过程全由`vm.$watche`完成：

```javascript
class Vue {
    constructor() {
       this.$watch = function (key, cb) {
            new Watcher(this, key, cb);
        }; 
    }
}

```

# 页面渲染

通过修改原来的第一版渲染函数，这里改为了挨个读取节点来转换，通过读取每个节点的字符串形式来把数据替换或把方法挂载：

```javascript
export default function render($el, vm) {
    const nodes = $el.children;
    Array.prototype.forEach.call(nodes, (el) => {
        if (el.children.length > 0) {
            render(el, vm); //? 递归渲染子节点
        } else {
            renderTemplate(vm, el);
        }
    });
}

function renderTemplate(vm, el) {
    renderData(vm, el);
    renderEvent(vm, el);
    renderVModel(vm, el);
}

//? 将{{}}里的数据渲染
function renderData(vm, el) {
    const nodeText = el.textContent;
    const regexp = /\{\{(\s*)(?<data>.+?)(\s*)\}\}/g;
    if (regexp.test(nodeText)) {
        return nodeText.replace(regexp, (...arg) => {
            const groups = JSON.parse(JSON.stringify(arg.pop()));
            //! 将这个数据相对于vm的位置储存进dep，每次dep收到更新时触发回调
            vm.$watch(groups.data, (newValue) => {
                el.textContent = newValue;
            });
            el.textContent = getByPath(vm, groups.data);
        });
    }
}

...
```

再说明一下，现在的渲染操作只在进行`mount`的时候会执行，当以后`$data`属性改变时会触发在这里设置的回调函数，通过它来修改页面。

# 一些其它细节的地方

在页面渲染时读取`$data`属性只能通过写在模板上的字符串，这里用了`reduce`方法来获取字符串对应的值：

```javascript
export function getByPath(obj, path) {
    const pathArr = path.split(".");
    return pathArr.reduce((result, curr) => {
        return result[curr];
    }, obj);
}
```

nextTick函数在这里只是用了开启微任务队列的方式实现：

```javascript
export function nextTick(cb, ...arg) {
    Promise.resolve().then(() => {
        cb(...arg);
    });
}
```

# 测试

最后简单写个计数器来看看实现的所有功能，可以看到和预期的一样



[代码仓库](https://github.com/shaddollxz/myVue)