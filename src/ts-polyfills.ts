// Polyfills pour les méthodes modernes si besoin (pour Vite/TS)
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement, fromIndex) {
    return this.indexOf(searchElement, fromIndex) !== -1;
  };
}
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth) {
    var flattend = [];
    (function flat(arr, d) {
      for (var i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i]) && (d > 0 || d === undefined)) {
          flat(arr[i], d === undefined ? 1 : d - 1);
        } else {
          flattend.push(arr[i]);
        }
      }
    })(this, isNaN(depth) ? 1 : Number(depth));
    return flattend;
  };
}
// Polyfill Object.entries
if (!Object.entries) {
  Object.entries = function(obj) {
    var ownProps = Object.keys(obj), i = ownProps.length, resArray = new Array(i);
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    return resArray;
  };
}
