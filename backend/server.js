var port = process.env.PORT || 4000; //sets local server port to 4000. 
var express = require('express'); // Express web server framework
var app = express();
console.log("Starting up server...");

app.get('//', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.send({sub: "text"})
});


app.listen(port, function () { }); //starts the server