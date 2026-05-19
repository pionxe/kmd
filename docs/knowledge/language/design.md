原则：可读性，正文和指令分离，针对创作和设计工作的最大易用性

我们可能会将创作者变成脚本编写员，但不希望让作者在编写脚本时感到痛苦。

去写kmd脚本。不是使用者的话，不可能察觉到痛点所在。

## 变量的实现

基于易用性，

## 封装需求

引入特效宏，能够直接作为一组特效链使用。
以防宏展开时并发链的不确定性，特效宏不允许并发。

```kmd
@ trafficLightMac = red.pause:char(1s).green

{红绿灯} @ f.trafficLightMac.pause:char(1s).yellow
```

## 响应式变量需求

引入“用户空间变量”，它被视为一个能够暂存特效、应用特效的对象。

首次定义时，可以直接在常规特效链前加入一个未使用关键字作为新建命名空间，然后应用它：

```kmd
Here's effobj. @ effobj.rainbow // 定义effobj，暂存rainbow特效，直接应用到整句。

This is also {effobj}. @ effobj.f // 在括号组尺度应用effobj。

We can change that to {shake}. @ effobj.f.shake // 所有effobj应用过的文字全部改变为shake特效。

And add a {wave}. @ effobj.f...wave // effobj暂存的对象保持不变，并添加一个wave特效。

Then shake heavier. 

@ effobj.$shake(strength=5) // 将成员中的shake作为变量来更改

Well, hold on hold on...

@ effobj.$shake(strength=5->0) // 默认缓动函数，或许也可以写成shake(5).ease(1s).shake(0)？

Let the wave stop.

@ effobj._wave // 删除

```


## 特效链内指令作用混杂问题

特效链包含常规文字特效、排版特效、舞台特效，甚至未来会有文字&排版特效（goto缓动动画），这种混杂是实际存在的需求……吗？

- yes: 只要脚本编写者期望做到字、组级别的控制（如 `f.ease(1s).red.goto(mark)` ，文字逐渐变红并且移动到mark处），这样的混杂就会存在。

- no: 但这里的goto还是“排版”指令吗？如果只是文字移动，它甚至还是一个behavior级别的文字特效，而不是排版特效。

- yes: 但为什么不能真的将指令用于排版呢？带动一串排版流移动甚至动态计算排版（就像调研过的pretext项目一样）不酷吗？

- no: 那应该交给舞台指令或者段级别文字特效吧？

- yes: 设想一个“一刀斩断文字流”的特效，在裂口处将上方的排版左移，下方的排版右移，并且后续的文字流在右移的文字中进行，这样的效果或许未来可以这么实现：

```kmd
text text text text text text @ upobj
text text text text text text
text text text text text text
text text text text text text @ downobj
text text text text text text
text text text text text text

cut them. 
@ upobj.powerIn(0.5s).left(0.5line).up(1char) + \
downobj.powerIn(0.5s).right(0.5line).down(1char)
```

它的直觉写法是包含我们刚刚说的“排版参与特效链”的。

- no: 好吧，那舞台特效呢？怎么证明舞台特效在文字内是必要的？

- yes: 设想一个“逐字冒出并且画面放大”的特效：

```kmd
你说什么？ @ .pause:char(1s).camZoom(+0.1)
```

舞台特效能够自然地融入特效链。这是合理的需求，转换成其他写法需要费很多力气。

- 因此，特效链内指令作用混杂是可接受的，但需要将它们做得更健康。

## 特殊排版需求

我的愿景是能够用kmd表达富有设计感的特殊排版。
目前的排版指令没有清晰定义应用方式

## 命名空间混乱问题

## 难以指定应用范围问题

## 时序链相关指令