var express = require('express')
  , request = require('request')
  , http = require('http'),
   mime = require('mime');

var app = express();

app.use(express.logger('dev'));
mime.lookup('.map'); 

// ajax stuff ******************

app.get('/ajax/login', function(req, res) {
// http://coastmap.com/ecop/wms.aspx?request=GetUserInfo&version=1.1.1&username=asademo&pw=asademo55

  var getreq = 'http://coastmap.com/ecop/wms.aspx?request=GetUserInfo&version=1.1.1';

  // add get varsdd
  getreq += '&username=' + req.query.username;
  getreq += '&pw=' + req.query.pw;

  request(getreq, function(err, response, body) {
    if (err) throw err;

    res.send(body);
  });
});

app.get('/ajax/stations/getstations', function(req, res) {
  request('http://imms.ehihouston.com/stations/JSON/', function(err, response, body) {
    if (err) throw err;

    res.type('json');
    res.send(body);
  });
});

app.get('/ajax/stations/latest', function(req,res) {
  request('http://imms.ehihouston.com/stations/'+req.query.sid+'/latest/JSON/?metric=True',
    function(err, response, body) {
      if (err) throw err;

      res.type('json');
      res.send(body);
    }
  );
});

// coastmap proxy

app.get('/ajax/wmsproxy', function(req, res) {
  var url = '/ecop/wms.aspx'
          + req.originalUrl.substr(req.originalUrl.indexOf('?'));

  var request = http.get({
    hostname: 'coastmap.com',
    path: url,
  }, function(response) {
//    console.log('STATUS: ' + response.statusCode);
//    console.log('HEADERS: ' + JSON.stringify(response.headers));
    
    var bodychunks = [];
    response.on('data', function(chunk) {
      bodychunks.push(chunk);
//      console.log('got data, chunk ' + bodychunks.length.toString());
    }).on('end', function() {
      res.type('png');
      res.send(Buffer.concat(bodychunks));
    });
  });
  
  request.on('error', function(e) {
    console.log('http error: ' + e.message);
  });
});


app.get('/ajax/stations/andadarko', function(req, res) {
  //request('http://mapappstaging.asascience.com:8080/oceansmap65/metobs/getstations/?attr=and&mode=true&y=as', function(err, response, body) {
    request('http://localhost:8080/oceansmap65/metobs/getstations/?attr=and&mode=true&y=as', function(err, response, body) {
    if (err) throw err;
    res.type('json');
    res.send(body);
  });
});

// asascience proxy
// http://gis.asascience.com/ArcGIS/rest/services/oilmap/oceansmap/MapServer
app.get('/ajax/asaproxy/export', function(req, res) {
  var url = '/ArcGIS/rest/services/oilmap/oceansmap/MapServer/export'
          + req.originalUrl.substr(req.originalUrl.indexOf('?'));

  var request = http.get({
    hostname: 'gis.asascience.com',
    path: url,
  }, function(response) {
//    console.log('STATUS: ' + response.statusCode);
//    console.log('HEADERS: ' + JSON.stringify(response.headers));
    
    var bodychunks = [];
    response.on('data', function(chunk) {
      bodychunks.push(chunk);
//      console.log('got data, chunk ' + bodychunks.length.toString());
    }).on('end', function() {
      res.type('png');
      res.send(Buffer.concat(bodychunks));
    });
  });
  
  request.on('error', function(e) {
    console.log('http error: ' + e.message);
  });
});

// serve static files
app.use(express.static(__dirname + '/public'));

// start listening
app.listen('5000', function() {
  console.log('Listening on port 5000');
});

