var express = require('express');
var path = require('path');


var app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get("/json", function (req, res) {
	res.sendFile(__dirname + "/GS_MDM4.json");
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});