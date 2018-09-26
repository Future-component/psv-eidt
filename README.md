# PSV-EIDT

## 解决一个问题
* 获取全景中的定点位置

## 安装
> npm install psv-eidt --save

## 依赖引入
```html
<script src="/lib/three-96.min.js"></script>
<script src="/lib/dat.gui.js"></script>
<script src="/lib/photo-sphere-viewer-eidt-1.0.0.js"></script>
```

## 实例代码
```js
var getMeshPosition = function(data) {
  console.log('mesh-data', data);
}

var div = document.getElementById('container');
var psv = new PhotoSphereViewerEidt({
  panorama: './3.jpg',
  container: div,
  max_fov: 90,
  default_position: {
    long: 3,
    lat: 0,
  },
  getMeshPosition: getMeshPosition,
})
```