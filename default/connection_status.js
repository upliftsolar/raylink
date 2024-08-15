
function reUpOpacity(d3elem,ms){
  var elem = d3elem.node();

  if(window.fadeOutTimer != undefined){
    clearInterval(window.fadeOutTimer);
    window.fadeOutTimer = undefined;
    //continue to re-start decline
  }

  opacity = 1;
  elem.style.display = "block";
  elem.style.visibility = "visible";
  elem.style.opacity = opacity;
  elem.style.filter = "alpha(opacity=" + opacity * 100 + ")";

  var opacity = 1; //todo: maybe it would look better if this linie wasn't sudden
  window.fadeOutTimer = setInterval( function() {
  opacity -= 50 / ms;
  if( opacity <= 0 )
  {
      clearInterval(fadeOutTimer);
      window.fadeOutTimer = undefined;
      opacity = 0;
      elem.style.display = "none";
      elem.style.visibility = "hidden";
  }
  //console.log('opacity: ',opacity);
  elem.style.opacity = opacity;
  elem.style.filter = "alpha(opacity=" + opacity * 100 + ")";
  }, 50 );
}


///////////////////////////
// CONNECTION INDICATIONS//
///////////////////////////
window.statusDisplay = function(token_or_func){
  window.statusDisplayDiv.text(statusDisplayAccessor(token_or_func));
};
window.statusDisplayAccessor = function(token_or_func){
  if(typeof(token_or_func) == 'function'){
    return token_or_func();
  }
  var o; // o for 'out'
  token = token_or_func;
  switch(token){
    case "initialize": o = "CONNECTING..."; break;
    case "connected": o='CONNECTED'; break;
    case "not_connected": o = 'NOT CONNECTED'; break;
    case "stale": o= 'CONNECTION STALE'; break;
    case "reconnecting": o='ATTEMPTING TO RECONNECT...'; break;
    default:
      o = token;
  }
  return o;
};

//this redirection may help devs to override, or see which tokens are meaningful
window.ConnectionStatus = {
  EXPECTED_CONNECTION: 3000, //ms
  "initialize": function(){ 
    if(window.connectionStatusAlreadyInitialized != undefined){
      throw("should only initialize one time");
    }
    window.connectionStatusAlreadyInitialized = true;
    var found = d3.select('.status-display'); //comes up faster if part of original page load
    if(found){
      window.statusDisplayDiv = found;
    } else {
      window.statusDisplayDiv= d3.select('body').insert('div').attr('class','status-display');
    }
  
    window.connectionTimeoutId = setTimeout(ConnectionStatus.not_connected,ConnectionStatus.EXPECTED_CONNECTION);
    statusDisplay('initialize'); 
  },
  "connected": function(){ statusDisplay('connected'); },
  "not_connected": function(){ statusDisplay('not_connected'); },
  "stale": function(){ statusDisplay('stale'); 
      var elem = statusDisplayDiv.node();
      elem.style.display = "block";
      elem.style.visibility = "visible";
      elem.style.opacity = 50;
      elem.style.filter = "alpha(opacity=" + 50 + ")";
  },
  "reconnecting": function(){ statusDisplay('reconnecting'); }
}
window.CS = ConnectionStatus;


function reUpDisplayDivConnected(){
  ConnectionStatus.connected();
  clearTimeout(connectionTimeoutId);
  reUpOpacity(statusDisplayDiv,2200);
  window.connectionTimeoutId = setTimeout(()=>{
      ConnectionStatus.stale();
  },ConnectionStatus.EXPECTED_CONNECTION);
}
ConnectionStatus.registerConnectionHandler = function(fn){
  return((envelope,raw_envelope)=>{
    if(!envelope.sent){
      reUpDisplayDivConnected();
    }
    
    return fn.apply(this,[envelope,raw_envelope]);
  });
};

window.addEventListener('load',ConnectionStatus.initialize);


