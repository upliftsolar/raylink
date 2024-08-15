/*
1) setup assumptions and build divs
2) define onDashboarLoad (which is called by later handler, indirectly)
3) data parser functions
4) actual event handlers 
5) setup debugging, for testing situations
*/


const pageLoadDate = new Date(); 

// DATA
// create an array for the dataset, according to the function
const max = 100,
    length = 500;

const MAX_AMPS = 4;


// INTRODUCTORY HTML ELEMENTS
/*container
    .append("h1")
    //.attr("class", "title")
    .text("Dashboard");
*/

const colored_cards = d3.selectAll('.colored_card');

const titleCard = d3.select('.colored_card:nth-child(1)').append('div');

// TOOLTIP
const tooltip = titleCard 
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);
var subtitle =  titleCard 
.append("p");
subtitle.attr("class", "description").style("margin", "1rem 0 2rem").text(`Smart Solar`);
subtitle.append("p").html("<img src='MerlinLogo.png' style='max-width:200px;'/>");


var actions = d3.select('.actions');

window.powerPlotDiv = d3.select('.colored_card:nth-child(2)').append('div').attr('id',"powerPlot");
window.powerPlotRangeDiv = d3.select('.colored_card:nth-child(2)').append('div').attr('id',"powerPlotRange");

window.inputdonutDiv = d3.select('.colored_card:nth-child(3)').append('div').attr('id',"inputdonut");
window.ampplotDiv = d3.select('.colored_card:nth-child(3)').append('div').attr('id',"ampplot");
window.temperaturePlotDiv = d3.select('.colored_card:nth-child(4)').append('div').attr('id',"tempplot");

class MainPowerChart extends dc.LineChart {
    yAxisMin () {
      const min = d3.min(this.data(), layer => d3.min(layer.values, p => p.y + p.y0));
      return dc.utils.subtract(min, this.yAxisPadding());
    }
}
function AddYAxis(chartToUpdate, displayText) {
  return 'DISABLED';
    chartToUpdate.svg()
        .append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
   // rotatee?
        .attr("x", 0)
        .attr("y", chartToUpdate.height()/2)
        .text(displayText);
}
function AddXAxis(chartToUpdate, displayText) {
  return 'DISABLED';
    chartToUpdate.svg()
        .append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", chartToUpdate.width() / 2)
        .attr("y", chartToUpdate.height())
        .text(displayText);
}

//TODO: re-up the amperage for the dashboard using statusDisplayAccessor(...)


window.onInitialData = (envelope_raw, envelope) => {
  //todo: faster to pass back the two charts, for individual rendeering?
  var charts = initPowerPlot(envelope.messages);
  for(var i in charts){
    charts[i].render();
  }
  dc.renderAll();
}

window.onDashboardLoad = (envelope_raw, envelope) => {
    // format the data according to the layout function
    var batch_raw = envelope_raw.messages;
    var data = envelope.messages;
    window.ndx = crossfilter(data);

    dc.config.defaultColors(d3.schemeCategory10);

    plotInputDonut(data);
    plotAmpBars(data);
   
    dc.renderAll();
    //TODO: reset ticks: d3.select(".axis--y1").call(yAxis.tickValues(yTickValues)); //(per https://github.com/d3/d3-axis/issues/29)

}
let sizing = chart => {
      chart
          //.width(window.innerWidth)
          //.height(window.innerHeight/3)
          .width(null)
          .height(300)
          .redraw();
};

let resizing = chart => window.onresize = () => sizing(chart);


function initPowerPlot(data) {
    var fullDomain;// = [pageLoadDate,new Date()];
    //if(data.length>2){
      fullDomain = [data[0].date, data.slice(-1)[0].date];
    //}
    const chart = new MainPowerChart(powerPlotDiv);
    const rangeChart = new dc.LineChart(powerPlotRangeDiv);
    const tempPlot = new dc.LineChart(temperaturePlotDiv);

    const dimension = ndx.dimension(d => d.date);
    const groups_by_min_interval = [
        {
            name: 'minutes',
            threshold: 0,
            interval: d3.timeMinute
        }, {
            name: 'hours',
            threshold: 60 * 60 * 1000,
            interval: d3.timeHour
        }, {
            name: 'days',
            threshold: 60 * 60 * 1000 * 24,
            interval: d3.timeDay
        }
    ];
    var interval_obj = groups_by_min_interval[0];
    if(!interval_obj.group){
      interval_obj.group = make_group(interval_obj.interval);
    }

    function make_group (interval) {
        return dimension.group(interval).reduce(
            (p, v) => {
              p.count++;
              if(v.efficiency){
                p.efficiency = v.efficiency;
              } else if(v.nowcast3){
                p.a1_power = (v.A1_V*v.A1_I);
                p.a2_power = (v.A2_V*v.A2_I);
                p.O_T = v.O_T;
              }
              return p;
            },
            (p, v) => {
              p.count--;
              if(v.nowcast3){
                p.efficiency = v.efficiency;
              } else if(v.nowcast3){
                p.a1_power = (v.A1_V*v.A1_I);
                p.a2_power = (v.A2_V*v.A2_I);
                p.O_T = v.O_T;
              }
              return p;
            },
            () => ({count: 0, 
              a1_power: 0,
              a2_power: 0
            })
        );
    }
    function choose_group (extent) {
      const d = extent[1].getTime() - extent[0].getTime();
      //found = groups_by_min_interval.find(mg => d >= mg.threshold);
      found = groups_by_min_interval[0];
      console.log('interval ' + d + ' is more than ' + found.threshold + ' ms; choosing ' + found.name +
          ' for ' + found.interval.range(extent[0], extent[1]).length + ' points');
      if (!found.group) {
          found.group = make_group(found.interval);
      }
      return found.group;
    }
    chart
        .width(300)
        .height(275)
        .dimension(dimension)
        .group(choose_group(fullDomain))
        .yAxisPadding(0.1)
        .valueAccessor((kv)=> { kv.value.a1_power })
        .rangeChart(rangeChart)
        .x(d3.scaleTime().domain(fullDomain))
        .xUnits(d3.timeDay)
        .brushOn(false)
        .mouseZoomable(true)
        .zoomScale([1, 100])
        .zoomOutRestrict(true)
        .renderVerticalGridLines(true)
        .elasticY(true)
        .transitionDuration(100);
    rangeChart
        .width(275)
        .height(100)
        .dimension(dimension)
        .group(groups_by_min_interval[0].group)
        .yAxisPadding(1)
        .valueAccessor((kv)=> { kv.value.a1_power })
        .x(d3.scaleTime().domain(fullDomain))
        .xUnits(d3.timeDay);

      tempPlot
        .width(275)
        .height(200)
        .dimension(dimension)
        .group(groups_by_min_interval[0].group)
        .yAxisPadding(1)
        .valueAccessor((kv)=> { kv.value.O_T })
        .x(d3.scaleTime().domain(fullDomain))
        .xUnits(d3.timeDay);

/*
    rangeChart.on('filtered.dynamic-interval', (_, filter) => {
        console.log("filtered.dynamic-interval");
        var grp = choose_group(filter || fullDomain);
        chart.group(grp);
        console.log("filtered.dynamic-interval end");
    });
*/
    var upliftAxisTimeFormat = d3.timeFormat('%H/%M');
    //var _minuteScale = Date.now().add();

    chart.yAxis().tickValues([2.5,5]);
    chart.yAxis().tickFormat(t => t);
    chart.xAxis().tickValues(fullDomain);
    chart.xAxis().tickFormat(t => {
      //if(t > _now){
        return upliftAxisTimeFormat(t);
      //}
    });
    rangeChart.xAxis().tickValues(fullDomain);
    //TODO: rangeChart.xAxis().tickFormat(t => {
    rangeChart.xAxis().tickFormat(t => {
      return upliftAxisTimeFormat(t);
    });
    rangeChart.yAxis().tickFormat(t => '');
    rangeChart.yAxis().ticks(0);

  tempPlot.xAxis().tickValues(fullDomain);
    //TODO: rangeChart.xAxis().tickFormat(t => {
    tempPlot.xAxis().tickFormat(t => {
      return upliftAxisTimeFormat(t);
    });
    tempPlot.yAxis().tickFormat(t => '');
    tempPlot.yAxis().ticks(0);
   
   
    AddXAxis(chart, "Time");
}//end powerplot

function plotInputDonut(data){
    var inputDim = ndx.dimension((d) => Math.random > 0.5 ? 'a1' : 'a2');//d.input);
    var inputGroup = inputDim.group().reduceSum((d) => 1);
    var inputBar = dc.pieChart(inputdonutDiv)
              .width(200).height(200)
              .dimension(inputDim)
              .group(inputGroup)
              //.slicesCap(4)
              //   .legend(dc.legend())
              .innerRadius(50);
    
              
    // by default, pie charts will use group.key as the label
    inputBar.renderLabel(true)
        .label(function (d) {
        return d.key.toUpperCase();
        });
      }    
      function plotAmpBars(){

    var ampDim = ndx.dimension((d) => d.to.toString());
    var ampGroup = ampDim.group().reduceSum((d) => 1);
    var ampPlot = dc.barChart(ampplotDiv)
        .width(300).height(200)
        .dimension(ampDim)
        .group(ampGroup)
        // .x(d3.scale.linear().domain([2011,2016]))
        .x(d3.scaleBand().domain(ampGroup.all().map((d, i) => { 
            //foo
            return d.key;
            //
        })))
        .xUnits(dc.units.ordinal)
        .barPadding(0.1)
        .outerPadding(0.05);


}






///////////////////////////////////////////////////
/* data parsing and debugging helpers            */
///////////////////////////////////////////////////
function normalize(cm) {
  if(cm.amps != null){
    // round to nearest 0.25 -- both for formatting, and possibly for ordinal binning
    cm.power = Math.round(+cm.amps * cm.volts * 4) / 4;
  }
  cm.debug = cm.debug == null ? "" : cm.debug;

  cm.dt_year = +yearFormat(cm.date);
  cm.dt_month = monthFormat(cm.date);
  cm.dt_day = dayOfWeekFormat(cm.date);
  return cm;
};






///////////////////////////
/* actual event handlers */
///////////////////////////



//keep incoming data in bins, so we can 'roll' a real-time dataset for the last X minutes.
window.recent = [];
window.recent_indexes = [0];
function fifo_push_recent(_normalized){
  recent = recent.concat(_normalized);
  recent_indexes = recent_indexes.concat(_normalized.length);
  if(recent_indexes.length > 100){ 
    var toEliminate = recent_indexes.shift();
    recent = recent.slice(toEliminate, recent.length); // TODO: benchmark
  }
}


//NOTE 1: if onUpliftNonSensorData is a valid function, onUpliftSensorData only receives the sensor subset 
//NOTE 2: if onUpliftSensorData has only 1 argument, messages will NOT be pre-parsed or separately handled.


window.handlingInitial = false;
window.onUpliftSensorData = CS.registerConnectionHandler(function(envelope_raw,envelope_parsed){ 
  //alert("onUpliftSensorData +"+batch_parsed.length.toString());
  var normalized = envelope_parsed.messages.map(normalize);
  //normalized= fakeData(200);

  if(onInitialData != undefined && !handlingInitial && envelope_raw.messages.length > 1){

    //alert('got here');
    handlingInitial = true;
    onInitialData(envelope_raw, {'messages': normalized});
    onInitialData = undefined;
    //setTimeout(handlingInitial = false;
  }
  fifo_push_recent(normalized); // keep last N sensor readings
  //TODO: instead of fifo_push, can the xf reducer function do this? this would reduce the number of 
  
  ndx.remove(()=>true);
  //ndx.add.apply(null, recent);
  ndx.add(recent);

  dc.redrawAll();
});

/////////////////////////
//    DEBUGGING HELPERS:/
// TODO load debugging helpers through a script that checks the URL
/////////////////////////

if(window.location.href.includes('debug')){
  d3.json('subsequentData.json').then(function(event){ 
    setTimeout(onInitialMessage, (ConnectionStatus.EXPECTED_CONNECTION / 2)),
    setInterval(()=>{
      var index = Math.floor(Math.random()*(event.hex.length - 1));
      var changedRaws = [];
      event.hex.slice(0,index).map((v)=>{
        if(v.indexOf('IGNORE') == -1){
          changedRaws.push(hexToBytes(v));
        }
      });
      onUpliftSensorData({'messages': changedRaws}, {'messages':changedRaws.map(parseClusterMessage)});
    },ConnectionStatus.EXPECTED_CONNECTION)
  });
}

