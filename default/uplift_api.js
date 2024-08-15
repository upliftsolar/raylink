// poorly organized library for parsing uplift messages
// and handling onDahboardLoad, onInitialMessage, onSensorData, onNonSensorData
// More about Uplift's protocol for sending messages at the official ICD here:
// TODO: have a public link



// listen for messages
window.uplift_nonSensorControls = {
    48: '0', //high voltage coordination
    67: 'C',
    99: 'c',
    70: 'F',
  100: 'd',
  101: 'e',
  102: 'f',
  70: 'F',
  109: 'm',
  77: 'M',
  118: 'v',
  108: 'l',
  116: 't',
  121: 'y',
  110: 'n',
  114: 'r',
  115: 's',
  122: 'z',


  62: '\>', 
  94: '\^', 
  64: '\@', // for OTA
  58: '\:',
  37: '\%',
  36: '\$',
  38: '\&',
};
window.uplift_sensorControls = {
  73: 'I',
  97: 'a',
  105: 'i',
  112: 'p',
  104: 'h',

  //76: 'L',
};

function debugPrint(str){
  //DEBUG also gets printed in flutter. 
  if(window.location.href.includes('debug')){
  console.log('DEBUG: '+str);
  }
}
function upliftalert(str){
  if(window.location.href.includes('alert') && d3.select(".actions")._groups[0]){
    var _actions = d3.select(".actions").append('div');
    //alert(str);
    _actions.append('p').text(str);
  }
}
function upliftSend(str){
  //if(window.location.href.includes('')){
  window.uplift_port.postMessage(str);
}

window.controlCharacters = Object.assign({},uplift_sensorControls,uplift_nonSensorControls);
window.humanControlCharacters = Object.values(controlCharacters);
for(var actual in controlCharacters){
  var expected = controlCharacters[actual].charCodeAt(0).toString();
  if(expected != actual){
    throw("incorrect charCode for value '"+uplift_nonSensorControls[actual]+"'. expected: '"+expected+"' but got "+actual.toString());
  }
}

function getUint48U(dv, start){
  var r = 0;
  try{
    var  high_start = start, low_start = start+2;
    r = (dv.getUint16(high_start, false) * Math.pow(2,4)) +
      dv.getUint32(low_start, false);
  } catch(e){
    upliftalert('failed uint48 '+r.toString());
  }
  return r;
}


function encodeUpliftDate(date){
  var v = date.getTime();
  //console.log(v);
  return v;
}
// Convert a hex string to a byte array
function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes) {
  return Array.from(bytes, byte =>
    ("00" + (byte & 0xFF).toString(16)).slice(-2)
  ).join('');
}

function parseUpliftDate(list_of_ints){
  var dv = getDataView(list_of_ints);
  return parseUpliftDateFromDataView(dv, 0);
}
function parseUpliftDateFromDataView(dv, start){
  var t = new Date(Date.UTC(1970, 0, 1)); // Epoch
  try{
  var secs  = 0;

  var debuggingTmpArray = [0,0];

  for(var i=start; i < start+6; i++){
    debuggingTmpArray.push(dv.getUint8(i, false));
  }
  var v = getDataView(debuggingTmpArray);
  secs = v.getBigUint64(0,false);

  //console.log("DEBUG %o",debuggingTmpArray);
  t.setUTCSeconds(Number(secs));

  if(dv.buffer.length > (start+10)){
    debuggingTmpArray = [];
    for(var i=start+6; i < start+10; i++){
      debuggingTmpArray.push(dv.getUint8(i, false));
      
    }
    var millis = getDataView(debuggingTmpArray).getUint16();
    t.setUTCMilliseconds(millis);
  }
  } catch(e){
    debugPrint('failed to parse time: '+e.toString());
  }

  //debugPrint(t.toUTCString());
  return(t);
}

function controlFor(msg){
  return(msg[23] || '[out-of-bounds in array: "'+msg.toString()+'"]');
}


//returns characters OR number if no character is an enumerated controlCharacter
function humanControl(uint8){
  var candidateChar = String.fromCharCode(uint8);
  if(humanControlCharacters.indexOf(candidateChar) != -1){
    return candidateChar;
  }
  return uint8;
}

window.textEnc = new TextDecoder("utf-8");

function parseClusterMessage(list_of_ints){
  try{
  debugPrint("parseClusterMessage");
  var view = getDataView(list_of_ints);
  debugPrint('about to parseClusterMessageHeaderFromDataView');
  var cm = parseClusterMessageHeaderFromDataView(view);
  //qualify
  if(cm.control == undefined){
    var errMsg = 'DEV: operating strictly... not sure what uint8:'+controlFor(list_of_ints).toString()+' cluster message is supposed to be?';
    throw(errMsg);
  }

  debugPrint('just did: '+cm.control.toString());
  //TODO most 's' status messages will just be block from memory?
  if(7 == cm.device && 'z' == cm.control){

    debugPrint('offset is..');
    cm.offset = view.getUint16(24,false);
    debugPrint('offset: '+cm.offset.toString());
    var header_start_index= 24;
    var headr_plus_position_start_index = header_start_index+4;
    if(cm.offset == 5616) {
      //this is hardcoded in ../../../lib/utils/reassembled_subscribeable.dart 
      //['modestate', 'batterySoC', 'A1_V', 'A1_I', 'A2_V', 'A2_I', 'O_T','O_V','O_I']
      cm.nowcast3 = true;
      cm.modestate = view.getUint8(headr_plus_position_start_index);headr_plus_position_start_index+=1;
      cm.batterySoC = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
      cm.A1_V = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
      cm.A1_I = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
      cm.A2_V = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
      cm.A2_I = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
      cm.O_T =  view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
      cm.O_V = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
      cm.O_I = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
    } else if(cm.offset == 5609) {
      //this is hardcoded in ../../../lib/utils/reassembled_subscribeable.dart 
      cm.efficiency = view.getFloat32(headr_plus_position_start_index,true);headr_plus_position_start_index+=4;
    }

    return cm;
  }
 

  switch(cm.control){
    case 'd': 
      cm.debug = textEnc.decode(view.buffer.slice(24));
      break;
    
    default:
      //console.warn("control == ", cm.control);
      //console.warn(".");
      break;
  }
  }catch(e){
    //need a more abstract transfer function debugError or something
    console.log("ERROR: "+e.message+"\n");//+e.line.toString());
  }
  return cm;
}

function getDataView(list_of_ints){
  const buffer = new ArrayBuffer(200); // benchmark?
  var _uint8 = new Uint8Array(list_of_ints);
  var view = new DataView(_uint8.buffer);      
  for (var i = 0; i< _uint8.length; i++){
    view.setUint8(i,_uint8[i]);
  }
  return view;
}

//const ALL_DESTINATION = 0xffffffffffff
function parseClusterMessageHeaderFromDataView(view){
  cm = {}
  cm.to = getUint48U(view, 0);
  
  var testIsAll = view.getUint8();
  //cm.from = getUint48U(view, 6);
  //if(cm.from > ){

  //}
  cm.from = testIsAll;
  cm.date = parseUpliftDateFromDataView(view, 12);

  cm.device = view.getUint8(22);

  var str_or_number = view.getUint8(23);
  if((dutyTableControls.indexOf(str_or_number) != -1) || controlCharacters.hasOwnProperty(str_or_number)){
    cm.control = humanControl(str_or_number);
  }
  return cm;
}

window.isNonSensorAndNonSensorHandlerIsDefined = function(msg) {
  return(window.onUpliftNonSensorData != null && uplift_nonSensorControls.keys.indexOf(controlFor(msg)) != -1);
};



//////////////////////////////////////////////
///////  DATA PARSIING AND DEBUGGING /////////
//////////////////////////////////////////////

window.fakeDutyTableMeasure = (value,dutyCycle) =>
 value*(100+Math.random()*dutyCycle); //DEBUG


 window.old_price = 2;
 window.volatility = 0.02
 window.fakeDataTicks = 0;
 window.fakeData = (items)=>{ // must be large initially, then small is fine.
   var out = [];
   for (var i in Array.apply(null, Array(items))){
     window.fakeDataTicks += 1;
    var change_percent = 2 * volatility * Math.random();
    if (change_percent > volatility)
        change_percent -= (2 * volatility);
    var change_amount = old_price * change_percent;
    var new_price = old_price + change_amount;
    window.old_price = new_price;
    out.push({value: new_price, date: new Date(Date.now()+(fakeDataTicks * 1000))}); //1000 ms between expected new data
   }
   return out;
 };
/*
function fakeData(items){ // must be large initially, then small is fine.
const data = [];

const start = Date.now();
for (i = 0; i < items; i++) {
    const t = start + i * 50;
    const d = new Date(t);
    data.push({
        value: 5 * Math.sin(2 * Math.PI * t / (60 * 60 * 1000)),
        date: d
    });
}
return data;
}
*/

window.roundTo2 = (i) => (Math.round((num + Number.EPSILON) * 100) / 100);

//In script, use:
//window.modifyDutyTableMeasure = fakeDutyTableMeasure;

//function ensureTopLevelValueExistsBang(out,j,control){
  
//}

//TODO: keep the time at the top-level, so we can 'fade' and 'jitter' scatterpoints
function dutyTableMeasures(raws){
  //initialize with length 200 the 'right' way https://stackoverflow.com/questions/4852017/how-to-initialize-an-arrays-length-in-javascript
  // 50 measurements, as noted below.
  var out = {};
  var i = 0; 
  var j = 0;
  for(var ignored in raws){
    var raw = raws[i];
    var control = raw[23]; // 10-13,20-23, or 30-33, inclusive
    
    
    if(dutyTableControls.indexOf(control) != -1){
      var cellstring = Math.floor(control/10); //e.g., 1,2 or 3
      var _uint8 = new Uint8Array(raw.slice(24,224));
      var view = new DataView(_uint8.buffer);
      var _date = parseUpliftDateFromDataView(view,12);

      var length = _uint8.length/4; // if 200 bytes, => 50 ints => 25% in 0.5% increments
      j = 0;
      while(j<length){
        //x == dutyCycle, y == ... amps or power
        var dutyCycle = dutyCycleFrom200BytePartial(j,control);
        var value = view.getFloat32(i*4, true);//TODO: just return 0 if close to 0 (remove small excursions)
        if(window.modifyDutyTableMeasure != undefined){
          value = window.modifyDutyTableMeasure(value,dutyCycle);
        }
        var ugly_j = Math.round(dutyCycle*2);
        //ensureTopLevelValueExistsBang(out,j,control);
        if(typeof(out[ugly_j]) == 'undefined'){ //must be the first time
          out[ugly_j] = {'key': ugly_j,'value': []};
        }
        out[ugly_j]['value'].push({'value': value, 'key': cellstring, 'date': _date});
        j+=1;
      }
    }
    i+=1;
  }
  return Object.values(out); 
}

//the weirdness is a result of limited bluetooth packet size.
//10,11,12,13 combine to form 100% in 0.5% increments
//eg 3#21 == x#y so... => y*25+x(0.5) == 51.5
function dutyCycleFrom200BytePartial(index,control){
  var val = index*0.5+(control % 10)*25; 
  //console.log(" ..dc.. %o", val);
  return val;
}



//////////////////////////////////////////////
///////  ROUTING DATA TO JS HANDLERS /////////
//////////////////////////////////////////////


//window.fullDateFormat = d3.time.format('%a, %d %b %Y %X %Z');
window.yearFormat = d3.timeFormat('%Y');
window.monthFormat = d3.timeFormat('%b');
window.dayOfWeekFormat = d3.timeFormat('%a');
window.dutyTableControls = []
.concat([10,11,12,13])
.concat([20,21,22,23])
.concat([30,31,32,33]);



  
window.onDashboardLoad = null;
//overridable on script
window.loadDashboard = function(){
  window.onDashboardLoad({'messages':[]},{'messages':[]});
};

window.wrap = function(envelope, msg_or_msgs){
 var msgs = msg_or_msgs; //TODO: handle plurals
 //return({'messages':[msg], 'sent': envelope.sent, 'warn': envelope.warn});
 return({'messages':msgs, 'sent': envelope.sent, 'warn': envelope.warn});
}

//override on page.
window.onInitialMessage = function(envelope){ }; //placeholder
window.onInitialData = undefined; //placeholder for optional function
window.onUpliftSensorData = function(envelope){ console.log('If onUpliftSensorData is not defined (with arity), new data will be ignored.; if arity 2, data will be parsed.'); };
//window.onUpliftNonSensorData = 
window.onUpliftSensorData = function(envelope){ console.log('If onUpliftSensorData is not defined (with arity), new data will be ignored.; if arity 2, data will be parsed.'); };

          
window.uplift_handleSensorAndNonSensorSeparately = function(envelope){
  var arity = onUpliftSensorData.length;
  if(arity < 2){
    if(window.ENABLE_FAST_MODE != undefined){
      //ok. I guess the user really did mean this.
      if(window.onUpliftNonSensorData != null){
        throw("DEV: Dashboard is mis-programmed. Non-sensor data is disabled; defining onUpliftSensorData with low arity is an optimization and parsing non-sensor data would work at cross purposes.");
      }
    } else {
      throw("DEV: too few arguments. Please ENABLE_FAST_MODE if you don't want parsing at all");
    }
    window.onUpliftSensorData(envelope);
    if(window.initialData == undefined){
      window.onInitialData(envelope);
      window.initialData = false;
    }
    return; 
  }

  //loop through the messages and handle (or batch sensor data)
  var newSensorDataRaw = [];
  var newSensorData = [];
  for(var i in envelope.messages){
    var msg = envelope.messages[i];
    if(isNonSensorAndNonSensorHandlerIsDefined(msg)){

      //console.log("got here non: "+JSON.stringify(data));
      window.onUpliftNonSensorData(wrap(envelope,[msg]), wrap(envelope,parseClusterMessage([msg]))); // pass array for consitency of api
    } else if(dutyTableControls.indexOf(controlFor(msg)) != -1){

      //console.log("got here dt: "+JSON.stringify(data));
      newSensorDataRaw.push(msg);
      //TODO: benchmark using this data for graphing on browser vs flutter side
    } else {
      //console.log("got here sensor: "+JSON.stringify(data));
      newSensorDataRaw.push(msg);
      var cm = parseClusterMessage(msg);
      newSensorData.push(cm);
    }
  }

  if(newSensorDataRaw.length == 0){
    return;
  }
  window.onUpliftSensorData(wrap(envelope,newSensorDataRaw), wrap(envelope,newSensorData));
  if(window.initialData != undefined){
    window.onInitialData(wrap(envelope,newSensorDataRaw), wrap(envelope,newSensorData));
    window.initialData = undefined;
  }
};


window.uplift_port = {'status': 'beforePortLoaded', 'onmessage': ()=>{},'postMessage': ()=>{}};

window.addEventListener('load', function(event) {
  loadDashboard();
});
window.addEventListener('message', function(event) {
  if (event.data == 'capturePort' && window.uplift_port.status == 'beforePortLoaded' && event.ports[0] != null) {
      window.uplift_port = event.ports[0];
      window.uplift_port.status = 'set';
      //in some future optimization, this is possibly used to negotiate what data / datarate the dashboard expects
      //window.onInitialMessage();
      window.uplift_port.onmessage = (event) =>{
        window.uplift_handleSensorAndNonSensorSeparately(JSON.parse(event.data));
      };
  } 
},false);