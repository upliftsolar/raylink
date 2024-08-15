//OLD example. From: https://jsfiddle.net/gordonwoodhull/5xc9rh4f/
d3.select('#download')
  .on('click', function () {
  if (d3.select('#download-type input:checked').node().value === 'table') {
    data = window.ivdata.map(function (d) {
      var row = {};
      table.columns().forEach(function (c) {
        row[table._doColumnHeaderFormat(c)] = table._doColumnValueFormat(c, d);
      });
      return row;
    });
  }
  var blob = new Blob([d3.csv.format(data)], {type: "text/csv;charset=utf-8"});
  saveAs(blob, 'data.csv');
});