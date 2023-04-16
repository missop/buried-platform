 // sdk
 const svgTags = ['svg', 'path', 'g', 'image', 'text', 'line', 'rect', 'polygon', 'circle', 'ellipse'];
  
 function getTagName(ele) {
   const tag = ele.tagName.toLowerCase();
   if (svgTags.indexOf(tag) !== -1) {
       // 如果是 svg 元素，替换为 name()='xxx' 的形式
       return `*[name()='${tag}']`;
   }
   return tag;
};

 function getXpath(ele) {
   let cur = ele;
   const path = [];
   while (cur.nodeType === Node.ELEMENT_NODE) {
     const currentTag = cur.nodeName.toLowerCase();
     const nth = findIndex(cur, currentTag);
     path.push(`${getTagName(cur)}[${nth}]`);
     cur = cur.parentNode;
   }
   return `/${path.reverse().join("/")}`;
 }

 // 其中 findIndex 代码如下：
 function findIndex(ele, currentTag) {
   let nth = 0;
   while (ele) {
     if (ele.nodeName.toLowerCase() === currentTag) nth += 1;
     ele = ele.previousElementSibling;
   }
   return nth;
 }

 // 获取元素的位置
 function findPos(ele) {
   const computedStyle = getComputedStyle(ele);
   const pos = ele.getBoundingClientRect();
   // left，right, top 均 不包含 margin
   // 减去 margin，可以获取元素加上 margin 后，距离左侧和上侧的真实距离
   const x = pos.left - parseFloat(computedStyle["margin-left"]);
   const y = pos.top - parseFloat(computedStyle["margin-top"]);
   const r = pos.right - parseFloat(computedStyle["margin-right"]);

   return {
     top: y,
     left: x,
     right: r,
   };
 }

 // 获取元素大小
 function getElementInfo(ele) {
   const result = {};
   const requiredValue = [
     "border-top-width",
     "border-right-width",
     "border-bottom-width",
     "border-left-width",
     "margin-top",
     "margin-right",
     "margin-bottom",
     "margin-left",
     "padding-top",
     "padding-right",
     "padding-bottom",
     "padding-left",
     "z-index",
   ];

   const computedStyle = getComputedStyle(ele);
   requiredValue.forEach((item) => {
     result[item] = parseFloat(computedStyle[item]) || 0;
   });

   // 用 offsetWidth 减去元素的 border 和 padding，来获取内容的宽高
   // 不用clientWidth 是因为内敛元素，该属性为0
   const width =
     ele.offsetWidth -
     result["border-left-width"] -
     result["border-right-width"] -
     result["padding-left"] -
     result["padding-right"];

   const height =
     ele.offsetHeight -
     result["border-top-width"] -
     result["border-bottom-width"] -
     result["padding-top"] -
     result["padding-bottom"];

   result.width = width;
   result.height = height;
   return result;
 }

 document.body.addEventListener(
   "mousemove",
   window._.debounce(function (e) {
     const xpath = getXpath(e.target);
     const info = getElementInfo(e.target);
     const pos = findPos(e.target);

     window.postMessage({
       xpath,
       info,
       pos,
     });
   }, 20),
   true
 );

 function send(data) {
   navigator.sendBeacon("/api", JSON.stringify(data));
 }

 function getEleByXpath(xpath) {
   const doc = document;
   const result = doc.evaluate(xpath, doc);
   const item = result.iterateNext();
   return item;
 }
 // 2.事件类型：元素曝光、元素点击
 // 后端返回了需要监听点击的xpath列表
 const xpaths = ["/html/body/main/div/div/div/div[2]/div[3]/div/div[2]/div"];
 xpaths.forEach((path) => {
   const node = getEleByXpath(path);
   if (node) {
     node.addEventListener(
       "click",
       function () {
         send({ path });
       },
       true
     );
   }
 });

 // 元素曝光 IntersecitonObserver 当涉及到DOM变更就有问题了
 const map = new Map()
 const observer = new IntersectionObserver((e) => {
   e.map((entry)=>{
     const xpath = getXpath(entry.target);
     send({
        type: "seen",
        xpath
      });
   })
 });
 xpaths.forEach((path) => {
   const node = getEleByXpath(path);
   // 如果当前path已经observe那么就无需再次observe
   if(map.get(path)){
     return
   }
   map.set(path,node)
   observer.observe(node);
 });

 const mutationOb = new MutationObserver(function () {
   xpaths.forEach(xp =>{
     const node = getEleByXpath(xp);
     const originNode  = map.get(xp);
     if(node !== map.get(xp)){
       if(node){
         observer.observe(node)
       }
       observer.unobserve(originNode);
       map.set(xp,node)
     }
   })
 })
 // 痛点一：所有元素都指定nth
 // getEleByXpath('/html/body/div[1]/ul/li[3]')
 // 当ul下的li[3]删除并新添加了一个ul>li3的元素，此时选择到了新添加的li上面，也就是ul[2]/li[3]

 // 痛点二：SVG元素无法识别
 