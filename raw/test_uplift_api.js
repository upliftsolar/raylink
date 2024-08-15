//[ 0, 0, 97, 100, 215, 50, 45, 76, 174, 0]
//seconds =  [ 0, 0, 97, 100, 215, 50], micro = [45, 76, 174, 0]


//big-endian 48 int
var _seconds_uint8List = [ 0,0,98,165,235,181 ];
var foundDate = parseUpliftDate(_seconds_uint8List);
var expectedDate = new Date();
console.log("found date 1: "+foundDate.toString());
if(foundDate != expectedDate){
   throw('expected '+expectedDate.toString());
}

_seconds_uint8List = [ 0, 0, 97, 100, 215, 50];
foundDate = parseUpliftDate(_seconds_uint8List);
expectedDate = new Date();
console.log("found date 2: "+foundDate.toString());


//0,0,98,165,235,181,0,0,159,251