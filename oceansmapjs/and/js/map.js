var MapView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, 'initializeoverlays', 'initializelayers', 'initializerealtime', 'addStation', 'popUp', 'get_station_click', 'plot_profile');

    var that = this;

    var terr = L.tileLayer('http://{s}.tiles.mapbox.com/v3/asamap.map-p0q0dl08/{z}/{x}/{y}.png', {visible:false}),
    imgry  = L.tileLayer('http://{s}.tiles.mapbox.com/v3/asamap.map-ijjg5918/{z}/{x}/{y}.png', {visible:false}),
    asabase = L.tileLayer('http://{s}.tiles.mapbox.com/v3/asamap.asabase1/{z}/{x}/{y}.png', {visible:false});
    //esocean = L.esri.basemapLayer("ShadedRelief", {visible:false});

    this.map = L.map('map', {
      center: new L.LatLng(-10.7616, 40.7734),
      zoom: 10,
      maxZoom: 16,
      minZoom: 4,
      loadingControl: true,
      layers: [terr]
    });

    var baseMaps = {
      "RPS Map": asabase,
      //"ESRI Oceans": esocean,
      "Imagery": imgry,
      "Terrain": terr
    };

    $('.ui.dropdown').dropdown();
    $('#observs')
      .dropdown('setting',{
         onChange : this.changeObs
         }
      )
      .dropdown('set selected','all')
    ;
    $('#deployDD')
      .dropdown('setting',{
         onChange : this.changeDeplmnt
         }
      )
      .dropdown('set selected','all')
    ;

    L.control.layers(baseMaps).addTo(this.map);

    //this.initializeoverlays();
    this.initializeTimeSlider();
    this.initializeTimeSliderMap('new');
    this.bind('timesliderChange',this.updateTime);
    this.initializerealtime();
    this.timesliderdate = new Date(2012,00,11).format('yyyy-mm-dd"T"HH:00:00');

    this.model.set('selectedType', 'all');
    this.model.set('selectedDeployment', '1');
  },

  addIndent: function(nSpaces) {
         var strOutput = '';
         for(var i = 0; i < nSpaces; i++) {
            strOutput += '--';
         }
         return strOutput; 
      },

  parseObjToStr: function(oObject, title) {
       var that = this;
       var strOutput = title+ "<br />";
       var nLevel = 0;

       for(var oEl in oObject) {
          if(typeof oObject[oEl] === 'object' || Object.prototype.toString.call( oObject[oEl] ) === '[object Array]') 
          {
             strOutput += that.addIndent(nLevel) + oEl + "<br />";
             strOutput += that.parseObjToStr( oObject[oEl], nLevel+1);
          } 
          else 
          {

            if(oEl != "sid"){
              strOutput += that.addIndent(nLevel) + oEl + " = " + oObject[oEl] + "<br />";
            }             
          }
       }

       return strOutput;
    },

  //timeslider change
  updateTime: function(evt){
    //add anadarko stations
    $.ajax({
    url: 'http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://10.90.209.21:8080/oceansmap65/metobs/getvalues/?attr=and&&y=adf2&t='+mapView.timesliderdate,
    //localhost
    //url: 'http://localhost:8080/oceansmap65/metobs/getvalues/?attr=and&&y=adf2&t='+mapView.timesliderdate,
    type: 'GET',
    datatype: 'json',
      success: function(response) { 
        var jsony = JSON.parse(response);
        mapView.model.set('markerData',jsony);
        mapView.syncMarkers(jsony);
      }
    });
  },

  //drop down for type
  changeObs: function(evt) {
    // change the active icon
    $('#current_observs').removeClass().addClass(evt.replace(/ /g,'_').toLowerCase() + ' circle icon');
    var $checkbox = $('#stations').find('.checkbox input');

    mapView.model.set('selectedType', evt);
    //iterate through and only show the points that are have that type
    for(var marker in mapView.model.stationlayers['Stations']._layers)
    {
      var visibl = 0;
      if(evt == 'all'){
        visibl = 1;
      }
      else if(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['desc']== evt){
         mapView.model.stationlayers['Stations']._layers[marker].bringToFront();
         visibl = 1;
      }
      if(mapView.model.attributes.selectedDeployment != 'all' && mapView.model.stationlayers['Stations']._layers[marker].feature.properties['deploy'] != mapView.model.attributes.selectedDeployment){
        visibl = 0;
      }

/*
      if(visibl == 0 || $checkbox.filter(":checked").length == 0){
        mapView.model.stationlayers['Stations']._layers[marker].hideLabel();
      }
      else{
        mapView.model.stationlayers['Stations']._layers[marker].showLabel();
      }
*/

      mapView.model.stationlayers['Stations']._layers[marker].setStyle({fillOpacity: visibl, opacity: visibl});
    }
    mapView.syncStationList();
  },

  //drop down for deployment
  changeDeplmnt: function(evt) {
    
    var $checkbox = $('#stations').find('.checkbox input');

    var t0 = new Date(2015,10,10);
    var t1 = new Date(1965,10,10);

    mapView.model.set('selectedDeployment', evt);
    //iterate through and only show the points that are have that deployment
    for(var marker in mapView.model.stationlayers['Stations']._layers)
    {
      var visibl = 0;
      if(evt == 'all'){
        visibl = 1;
        //find min max of the deployment 
          if(Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['end'])>t1.getTime()){
            t1 = Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['end']);
          }
          if(Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['start'])<t0.getTime()){
            t0 = Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['start']);
          }
      }
      else if(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['deploy']== evt){
        mapView.model.stationlayers['Stations']._layers[marker].bringToFront();
        visibl = 1;
        if(Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['end'])>t1.getTime()){
            t1 = Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['end']);
          }
          if(Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['start'])<t0.getTime()){
            t0 = Date.parse(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['start']);
          }
      }
      if(mapView.model.attributes.selectedType != 'all' && mapView.model.stationlayers['Stations']._layers[marker].feature.properties['desc'] != mapView.model.attributes.selectedType){
        visibl = 0;
      }
      //check to see if labels are supposed to be on
/*
      if(visibl == 0 || $checkbox.filter(":checked").length == 0){
        mapView.model.stationlayers['Stations']._layers[marker].hideLabel();
      }
      else{
        mapView.model.stationlayers['Stations']._layers[marker].showLabel();
      }
*/
      
      mapView.model.stationlayers['Stations']._layers[marker].setStyle({fillOpacity: visibl, opacity: visibl});
    }
    mapView.syncStationList();

    var newDateRange=[t0,t1];
    mapView.initializeTimeSliderMap(newDateRange);
    catalogView.model.set('deployment',evt);
  },

  addStation: function(f,l) {
    var geojsonMarkerOptions = {
      radius: 6,
      fillColor: "#00CC00",
      color: "#000",
      weight: 1,
      opacity: 0, // 1,
      fillOpacity: 0 // 0.8
    };

    if (f.properties.desc == "Nearshore") {//redish
      geojsonMarkerOptions.fillColor = "#31869E";
    } else if (f.properties.desc == "Offshore") {//light blue
      geojsonMarkerOptions.fillColor = "#57051B";
    }
    else if (f.properties.desc == "Waves") {
      geojsonMarkerOptions.fillColor = "#FECC6D";
    }
    else if (f.properties.desc == "Tides") {
      geojsonMarkerOptions.fillColor = "#525252";//grey
    } 
    else if (f.properties.desc == "Weather") {
      geojsonMarkerOptions.fillColor = "#73AA69";//green
    } else {
      geojsonMarkerOptions.fillColor = "#151D22";//black
    }
    var stationMarker = new L.StationMarker(l, geojsonMarkerOptions);
    return stationMarker;
  },

  popups: {},
  popUp: function(f,l) {
    var out = []
      , popup = L.popup({ minWidth: 330 })
      , html = '<div id="'+f.properties.sid+'-station_popup_content">'
          // href="' + document.URL + '"
             + '<strong><a>' + f.properties.station_name + '</a></strong><br />'
             + '<div class="title">Time</div>'
             + 'Type:' + f.properties.desc + '<br />'
             + '<br /><div class="ui active inline medium loader" style="width: 100%; margin: 0 auto;"></div>'
             + '<div class="graph"></div>'
             + '</div>';

    popup.setContent(html);
    this.popups[f.properties.desc] = popup;
    l.bindLabel(f.properties.station_name,{ direction: 'auto', className:'alwaysvisiblelable', offset:[9,-12]});
    l.bindPopup(popup);
  },

  get_station_click: function(featur) {
    
    if(featur.properties.params.search('current_speed')> -1){
      var that = this
      , $content = $('#'+featur.properties.sid+'-station_popup_content')
      , $loader = $content.children('.loader');

      $loader.addClass('active');

      $.getJSON(
        //'/ajax/stations/latest',
        'http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://10.90.209.21:8080/oceansmap65/metobs/getvertprofile/?y=adf&attr=and&st='+featur.properties.sid +'&t='+this.timesliderdate,
        //'http://localhost:8080/oceansmap65/metobs/getvertprofile/?y=adf&attr=and&st='+featur.properties.sid +'&t='+this.timesliderdate,
        function(data) {
          $loader.removeClass('active');
          that.plot_profile($content, data.profile);
        }
      );
    }

    $('.ui.accordion').accordion('open',$('#stationListMain [data-sid="' + featur.properties.sid + '"]').data('accordion-id'));
    setTimeout(function() {
      $('#stationListMain [data-sid="' + featur.properties.sid + '"] div p').last().scrollintoview();
      mapView.goStation(featur.properties.sid);
    },100);
  },

  scrub_2d_data: function(data) {
    var i;

    for (i=0; i<data.length; i++) {
      if (!data[i][0] || !data[i][1]) {
        data.splice(i,1);
        i--;
      }
    }

    return data;
  },

  plot_profile: function($content, rawdata) {
    
    var $title = $content.children('.title')
      , $graph = $content.children('.graph')
      , depthsorteddata = []
      , directionsorteddata = [];

    if(rawdata)
    {
        // merge 2 arrays together
        var i
          , direction_data = this.scrub_2d_data(rawdata.direction.data)
          , speed_data = this.scrub_2d_data(rawdata.speed.data);
        for (i=0; i<direction_data.length; i++) {
          depthsorteddata.push({
            depth: speed_data[i][1],
            speed: speed_data[i][0],
            direction: direction_data[i][0]
          });
        }

        directionsorteddata = depthsorteddata.slice(0);
        directionsorteddata.sort(function(obj1, obj2) {
          return obj1.direction - obj2.direction;
        });

        if (directionsorteddata.length > 2) {
          var tstamp = rawdata.speed.time;
          $title.html('Profile at: ' + tstamp.replace('t',' '));

          // graph code
          this.d3drawcompass($graph, directionsorteddata);
          this.d3drawverticalgraph($graph, depthsorteddata);
        }

        else {
          $title.html('');
          $graph.html('<p class="warning centered">No Profile Available at this time.</p>');
        }
    }
    else{
        $title.html('');
        $graph.html('<p class="warning centered">No Profile Available at this time.</p>');
    }
  },

  d3drawverticalgraph: function($graph, data) {
    var margin = {top: 5, right: 1, bottom: 5, left: 40},
      width = 130 - margin.left - margin.right,
      height = 190 - margin.top - margin.bottom;

    var svg = d3.select($graph.children('svg')[0])
      .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scale.linear()
          .range([0, width]); // width

    var y = d3.scale.linear()
        .range([height, 0]); // height

    var xAxis = d3.svg.axis()
        .scale(x)
        .ticks(2)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .ticks(5)
        .orient("left");

    var line = d3.svg.line()
        .x(function(d) { return x(d.speed); })
        .y(function(d) { return y(d.depth); });

    //range for x and y axis
    //x.domain(d3.extent(data, function(d) { return d.speed }));
    y.domain(d3.extent(data, function(d) { return d.depth}));
    x.domain([.1,50]);
    //y.domain([-1200,0]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0,"+height+")")
        .call(xAxis)

    svg.append('g')
        .attr('transform', 'translate(0,200)')
      .append('text')
        .attr('x', 81)
        .attr('y', 8)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text('Speed (cm/s)');

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -189)
        .attr("y", -39)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Depth (m)");     

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

    svg.append('rect')
      .attr('class', 'overlay')
      .attr('width', 150)
      .attr('height', 174)
      .attr('transform', 'translate(-60,0)')
      .on('mouseover', function() { arrow.style('display', null); })
      .on('mouseout', function() { arrow.style('display', 'none'); })
      .on('mousemove', mousemove);

    svg.append("image")
      .attr('x',134)
      .attr('y',222)
      .attr('width', 133)
      .attr('height', 16)
      .attr("xlink:href","../images/legend_rose.jpg");

    var updatedSpeed = svg.append("text")
      .attr('x',95)
      .style('font-weight', 'bold')
      .attr('y',20);
    /*var updateddir = svg.append("text")
      .attr('x',25)
      .style('font-weight', 'bold')
      .attr('y',50);*/

    var mxspd = 0;
    var atdepth = 0;
    for (m=0; m<data.length; m++) {
        if (mxspd < data[m].speed) {
          mxspd = data[m].speed;
          atdepth = data[m].depth;
          //capping the threshold to 40
          /*if(data[m].speed>40){
            data[m].speed = 40;
          }*/
        }
      };
    var maxSpeed = svg.append("text")
      .attr('x',-9)
      .attr('y',242)
      .style('font-weight', 'bold')
      .text('Max: ' + mxspd.toPrecision(2)+ ' cm/s at '+ atdepth +'m');

    var arrow = d3.select($graph.children('svg')[0]).append('g')
      .style('display', 'none')
      .attr('transform', 'translate(235,105)');

    var arrowline = arrow.append('line')
        .attr('x1', 0)
        .attr('y1', -86)
        .attr('x2', 0)
        .attr('y2', 0)
        .style('stroke', '#404040')
        .style('stroke-width', '3px');

    var arrowhead = arrow.append('polygon')
      .attr('points', '-10,70 0,90 10,70 -10,70')
      .style('fill', '#404040');

    function mousemove() {
      var y0 = y.invert(d3.mouse(this)[1])
        , i;
        var dd = data;

      for (i=0; i<data.length; i++) {
        if (y0 > data[i].depth-1 && y0 < data[i].depth+1) {
          break;
        }
      }

      //scale for arrow
      if (data[i]) {
        var direction = data[i].direction
          , speedscale = data[i].speed*1.4;

        updatedSpeed.text(data[i].speed.toPrecision(2)+ ' cm/s');
        //updateddir.text(data[i].direction+ ' d');
        
        arrowline
          .attr('transform', 'rotate(' + direction + ')')
          .attr('y1', -speedscale);
        arrowhead
          .attr('points', '-9,'+(speedscale)+' 0,'+(speedscale+13)+' 9,'+(speedscale)+' -10,'+(speedscale))
          .attr('transform', 'rotate(' + (direction-180)  + ')');
      }
    }
  },

  d3drawcompass: function($graph, data) {
    var points = []
      , max = 0
      , j=0;

    //chose the interval to calculate predominate direction
    for (i=0; i<360; points.push({ direction: i, speed: max }), i+=5.625) {
      max = 0;
      for (;j<data.length; j++) {
        if (data[j].direction > i)
          break;

        if (data[j].speed > max)
          /*if(data[j].speed>40){
            data[j].speed = 40;
          }*/
          max = data[j].speed;
      }
    }

    var diameter = 50;

    var svg = d3.select($graph[0]).append("svg")
        .attr('width', 380)
        .attr('height', 250)
      .append("g")
        .attr('transform', 'translate(235,105)');

    //scale range for the radius of the predominate svg area
    var scaleradius = d3.scale.linear()
      .range([0, diameter / 25]);

    var line = d3.svg.line.radial()
      .radius(function(d) { return scaleradius(d.speed); })
      .angle(function(d) { return d.direction / 180 * Math.PI })

    for (i=1; i<=3; i++) {
      svg.append('circle')
        .attr('r', 90/Math.PI*i)
        .style('fill', 'none')
        .style('stroke', 'grey');
    }

    for(i=0; i<180; i+=22.5) {
      svg.append('line')
        .attr('x1', 0)
        .attr('y1', -86)
        .attr('x2', 0)
        .attr('y2', 86)
        .style('stroke', 'grey')
        .attr('transform', 'rotate('+i+')');
    }

    svg.append('path')
      .datum(points)
      .attr('class', 'directionpath')
      .attr('d', function(d) { return line(d) + 'Z'; });

    // add directions
    svg.append('text')
      .attr('x', -8)
      .attr('y', -93)
      .style('font-size', '1.5em')
      .text('N');
    svg.append('text')
      .attr('x', 93)
      .attr('y', 8)
      .style('font-size', '1.5em')
      .text('E');
    svg.append('text')
      .attr('x', -8)
      .attr('y', 110)
      .style('font-size', '1.5em')
      .text('S');
    svg.append('text')
      .attr('x', -115)
      .attr('y', 9)
      .style('font-size', '1.5em')
      .text('W'); 
  },

  //EDS Layers
  initializeoverlays: function() {
    var that = this
      , i
      , html
      , $modelslist = $('#modelslist')
      , overlays = this.model.attributes.overlays;

    //models popup
    var $edsinfo = $('#edsinfo');
    $edsinfo.children('i').popup();

    function bindlistele(html, layer) {
     $modelslist
        .append(html)
      .children().last() // select new element to bind to
        .checkbox({
          onEnable: function() {
            that.map.addLayer(that.model.layers[layer]);
            that.model.layers[layer].bringToFront();
          },
          onDisable: function() {
            that.map.removeLayer(that.model.layers[layer]);
          }
        })
      ;
    }

    //initiate map variables
    this.model.layers = {};
    this.model.set('selectProperted', "");
    
    for (i=0; i<overlays.length; i++) {
      var popuphtml =  '<p style="text-align:center;"><p style="text-align:center;"><img src="http://coastmap.com/ecop/wms.aspx?layers='+ overlays[i].name+'&transparent=true&styles=&request=GetLegendGraphic&width=112&version=1.1.1&format=image/png&height=155"></p>';

       html = "<div class='item' style='padding-bottom: 6px;'>"
           +   "<div class='ui checkbox toggle' style='margin-left: -30px;'>"
           +     "<input type='checkbox' />"
           +     "<label style='font-size:14px;'>" + overlays[i].title + "</label>"
           +   "</div>"
           +   "<i class='help icon link' style='position: relative; right: -248px; margin-top: -3px;' "
           +     "data-html='" + popuphtml + "'></i>"
           + "</div>";

      //this.model.layers[overlays[i]] = L.tileLayer.betterWms('/ajax/wmsproxy', {
      this.model.layers[overlays[i].title] = L.nonTiledLayer.wms('http://coastmap.com/ecop/wms.aspx?', {
        layers: overlays[i].name,
        format: 'image/png',
        //add three for the list of basemap layers
        zIndex: overlays.length + i+3
      });

      bindlistele(html, overlays[i].title);

      var $layer = $modelslist.children().last()
        , $helppopup = $layer.children('i');
      $helppopup.popup({position:'bottom right'});
    };
  },

  initializeTimeSliderMap: function (daterange){
    
    var $timesliderdetail = $('#timesliderlabel .detail');
    if(daterange == 'new'){
        //set time slider in the middle
        // initialize time slider
        this.timesliderdate = new Date().format('yyyy-mm-dd"T"HH:00:00');
        var time = new Date(2012,01,11);
        var backtime = new Date(2011,11,29);
        $timesliderdetail.html(backtime.toLocaleString().slice(0,-6) + ' ' + backtime.toLocaleString().substr(-2));
    }
    else{
        var time = daterange[1];
        var backtime = daterange[0];
        $timesliderdetail.html(backtime.toLocaleString().slice(0,-6) + ' ' + backtime.toLocaleString().substr(-2));
        this.timesliderdate = time.format('yyyy-mm-dd"T"HH:00:00');
    }
    
    $('#timesliderlabelend .detail').html(time.getMonth()+'/'+time.getDate()+'/'+time.getFullYear());
    $('#timesliderlabelstart .detail').html(backtime.getMonth()+'/'+backtime.getDate()+'/'+backtime.getFullYear());

    $('#timeslidermap').slider({
      value: 2,
      min: backtime.getTime(),
      max: time.getTime(), 
      // this is for 10 minute increments
      //60*number of minutes*number hours*1000
      step: 60*10*1*1000, 
      slide: function(event, ui) {
        var unixtime = ui.value
          , timestr = new Date(unixtime).toLocaleString();
        //  console.log(time);
        $timesliderdetail.html(timestr.slice(0,-6) + ' ' + timestr.substr(-2));
        
      },
      stop: function (event,ui){
        var unixtime = ui.value
          , timestr = new Date(unixtime);
        //converting to UTC - show local time in the header bar but send UTC time to EDS WMS
        var utcTimeSting = new Date(timestr.toUTCString());
        mapView.timesliderdate = new Date(unixtime).format('yyyy-mm-dd"T"HH:00:00');
        mapView.trigger('timesliderChange', utcTimeSting.toLocaleString());
      }
    });
    
    //set the time slider for the middle of the slider
    $('#timeslidermap .ui-slider-handle').css('left', '0%');
  },


  initializeTimeSlider: function (){

    var t0 = d3.time.hour.round(new Date());
    var t1 = d3.time.day.offset(t0,1);
    var tMin = d3.time.day.round(d3.time.day.offset(t0,-2));
    var tMax = d3.time.day.round(d3.time.day.offset(t0,2));

    var margin = {top: 15, right: 45, bottom: 15, left: 140},
         width = 420 - margin.left - margin.right,
         height = 50 - margin.bottom - margin.top;

    var x = d3.time.scale()
        .domain([tMin,tMax])
        .range([0, width]);

    var brush = d3.svg.brush()
        .x(x)
        .extent([t0,t1])
        .on("brush", brushed);

    var svg = d3.select("#timeslider").append("svg")
        .attr("class", "svgclass")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("rect")
        .attr("class", "grid-background")
        .attr("width", width)
        .attr("height", height);

    svg.append("g")
        .attr("class", "x grid")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(d3.time.hours, 6)
            .tickSize(-height)
            .tickFormat(""))
      .selectAll(".tick")
        .classed("minor", function(d) { return d.getHours(); });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.svg.axis()
          .scale(x)
          .orient("bottom")
          .ticks(d3.time.days, 1)
          .tickPadding(0))
      .selectAll("text")
        .attr("x", 6)
        .style("text-anchor", null);

    var gBrush = svg.append("g")
        .attr("class", "brush")
        .call(brush);

    var ts = gBrush.append("text")
        .attr("x", x((t0.getTime() + t1.getTime()) / 2))
        .attr("y", height / 2 - 15)
        .attr("text-anchor", "middle")
        .attr("class", "ts")
        .text(formatTimeSpanText([t0,t1]));

    gBrush.selectAll("rect")
        .attr("height", height);

    function brushed() {
      var extent0 = brush.extent(),
          extent1;

      // if dragging, preserve the width of the extent
      if (d3.event.mode === "move") {
        var d0 = d3.time.hour.round(extent0[0]),
            d1 = d3.time.hour.offset(d0, Math.round((extent0[1] - extent0[0]) / 3600e3));
        extent1 = [d0, d1];
      }

      // otherwise, if resizing, round both dates
      else {
        extent1 = extent0.map(d3.time.hour.round);

        // if empty when rounded, use floor & ceil instead
        if (extent1[0] >= extent1[1]) {
          extent1[0] = d3.time.hour.floor(extent0[0]);
          extent1[1] = d3.time.hour.ceil(extent0[1]);
        }
      }

      ts.attr("x", x((extent1[0].getTime() + extent1[1].getTime()) / 2))
        .text(formatTimeSpanText(extent1));

      d3.select(this).call(brush.extent(extent1));

      //that.updateTime(extent1);
    }

    function formatTimeSpanText(t) {
      var m0 = d3.time.format("%b")(t[0]);
      var d0 = d3.time.format("%e")(t[0]);
      var h0 = d3.time.format("%H")(t[0]);
      var m1 = d3.time.format("%b")(t[1]);
      var d1 = d3.time.format("%e")(t[1]);
      var h1 = d3.time.format("%H")(t[1]);

      var str = m0 + ' ' + d0 + ' ' + h0 + ':00';
      if (m0 != m1) {
        str = m0 + ' ' + d0 + ' ' + h0 + ':00 ' + ' - ' + m1 + ' ' + d1 + ' ' + h1 + ':00';
      }
      else if (d0 != d1) {
        str = m0 + ' ' + d0 + ' ' + h0 + ':00 ' + ' - ' + m1 + ' ' + d1 + ' ' + h1 + ':00';
      }
      else if (h0 != h1) {
        str = m0 + ' ' + d0 + ' ' + h0 + ':00 ' + ' - ' + h1 + ':00';
      }
      // str += ' UTC';
      return str;
    }
  },
  
  initializerealtime: function() {
    var that = this;

    this.model.stationlayers = {};

    var $obsinfo = $('#obsinfo');
    $obsinfo.children('i').popup();

    function bindlistele(layer, popuphtml, enablecheckbox) {
      var $stations = $('#stationListMain')
        , html
        , popuptitle

      html =  "<div class='ui checkbox toggle'>"
           +     "<input type='checkbox' />"
           +     "<label style='font-size:14px;'>Show Labels</label>"
           +   "</div>"
           +   "<i class='help icon link' style='position: absolute; right: 7px; padding-top: 10px;' "
           +     "data-html='<h4 style=\"text-align:center;\" class=\"ui header\">" + layer + '</h4>' + popuphtml + "'></i>"
           //+ "</div>";

      //add checkbox for layer
      var el = document.createElement('div');
      el.className ='item';
      el.innerHTML = html;
      $stations
       .before(el);

      // select elements
      //var $layer = el
      var $checkbox = $('#stations').find('.checkbox');
      var $helppopup = $('#stations').find('i');

      $checkbox
        .checkbox({
          onEnable: function() {
            mapView.model.stationlayers[layer].eachLayer(function(l) {
              if(l.options.opacity ==1)
                {l.showLabel();}
            });
          },
          onDisable: function() {
            mapView.model.stationlayers[layer].eachLayer(function(l) {l.hideLabel();});
          }
        })
      ;

      $helppopup.popup();

      if (enablecheckbox) {
        $checkbox.checkbox('enable');
        that.model.stationlayers[layer].addTo(that.map);
      }
    }

    //add anadarko stations
    $.ajax({
    url: 'http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://10.90.209.21:8080/oceansmap65/metobs/getstations/?attr=and&mode=true&y=as',
    //localhost
    //url: '/ajax/stations/andadarko',
    type: 'GET',
    datatype: 'json',
      success: function(response) { 
          var jsony = JSON.parse(response);//response;//
          that.model.stationlayers['Stations'] = L.geoJson(jsony, {
          pointToLayer: that.addStation,
          onEachFeature: that.popUp
        });
          //remove checkbox for stations
        bindlistele('Stations', '<p style="text-align:center;">Mozambique data stations, provide temporal profile metocean conditions at these location. <p style="text-align:center;"><img src="../images/and.png" ></p>', true); // true to enable layer
        // fire Deployment 1 as the default view after data loaded
        mapView.changeDeplmnt(1);
        $('#deployDD').dropdown('set selected',1);
        mapView.syncStationList();
      }
    }); 
  },

  initializelayers: function() {
    var that = this;

    this.model.gislayers = {};

    function bindlistele(layer, popuphtml, enablecheckbox) {
      var $lays = $('#layerTOC')
        , html
        , popuptitle

      html = "<div class='item'>"
           +   "<div class='ui checkbox toggle'>"
           +     "<input type='checkbox' />"
           +     "<label style='font-size:14px;'>" + layer + "</label>"
           +   "</div>"
           +   "<i class='help icon link' style='position: absolute; right: 0px; padding-top: 10px;' "
           +     "data-html='<h4 style=\"text-align:center;\" class=\"ui header\">" + layer + '</h4>' + popuphtml + "'></i>"
           + "</div>";

      $lays
        .append(html);

      // select elements
      var $layer = $lays.children().last()
        , $checkbox = $layer.children('.checkbox')
        , $helppopup = $layer.children('i');

      $checkbox
        .checkbox({
          onEnable: function() {
            mapView.model.gislayers[layer].addTo(mapView.map);
          },
          onDisable: function() {
            mapView.map.removeLayer(mapView.model.gislayers[layer]);
          }
        })
      ;

      $helppopup.popup();

      if (enablecheckbox) {
        $checkbox.checkbox('enable');
        that.model.gislayers[layer].addTo(that.map);
      }
    }

    // add arc gis layer
    this.model.gislayers['ArcGIS GIS Server'] = L.esri.dynamicMapLayer('http://gis.asascience.com/ArcGIS/rest/services/oilmap/oceansmap/MapServer');
    bindlistele('ArcGIS GIS Server', '<p style="text-align:center;"><p style="text-align:center;"><img src="../images/ags_legend.jpg" ></p>');

    //weather
    this.model.gislayers['Current Precipitation'] = L.tileLayer('http://{s}.tile.openweathermap.org/map/precipitation/{z}/{x}/{y}.png', {visible:false,zIndex:10, opacity:.4, attribution: 'Map data © OpenWeatherMap'});
    bindlistele('Current Precipitation', '<p style="text-align:center;">Current Quantity of precipitation Coverage : provided by Open Weather Map<p style="text-align:center;"><img src="../images/PR.png" ></p>');
  },

  syncStationList : function() {
    var stations = _.sortBy(
      _.map(
        _.filter(mapView.model.stationlayers['Stations']._layers,function(o){return o.options.opacity == 1})
        ,function(o) {
          return o.feature.properties
        })
      ,function(o) {
        var a = o.station_name.match(/^([^\d+]+)(\d*)-(\d+)-(\d+)$/);
        if (!a) {
          return o.station_name;
        }
        else {
          return a[1] + (1000 + Number(a[2])) + '-' + (1000 + Number(a[3])) + '-' + (1000 + Number(a[4]));
        }
      }
    );
    var t0 = Date.parse(_.pluck(stations,'start').sort().shift());
    t0.setMinutes(0);
    t0.setMilliseconds(0);
    t0.setHours(0);
    var t1 = Date.parse(_.pluck(stations,'end').sort().pop());
    t1.setMinutes(0);
    t1.setMilliseconds(0);
    t1.setHours(0);
    t1.add(1).days();

    var s = [];
    _.each(stations,function(sta) {
      var content;
      var adcp = '';
      if (!_.isNull(sta.depth_values)) {
        adcp = '<p>ADCP depths: ' + _.compact(sta.depth_values.split(/, */)).join(', ') + '</p>';
      }
      var origParams = sta.params.split(',');
      var origPrettyParams = sta.pretty_params.split(',');
      var p = [];
      _.each(_.compact(sta.pretty_params.split(/, */)).sort(),function(param) {
        // Assuming, that current_direction and current_speed are 1:1, only show current_direction
        // and label it as Currents.
        if (!/current speed/i.test(param)) {
          // currents only fair game in graphA
          var graphB = /current/i.test(param) ? 'disabled circular indent right icon' : 'leftc circular indent right icon link';
          p.push('<p data-param="' + origParams[origPrettyParams.indexOf(param)] + '"><i class="rightc circular indent left icon link graphA"></i> <i class="' + graphB + ' graphB"></i> ' + param.replace(/current direction/i,'Currents') + '</p>');
        }
      });

      content = p.join('')
        + '<div class="ui tertiary center aligned segment"><p class="info-header"><b>Station Information</b></p>'
          + '<p>' + Date.parse(sta.start).format("UTC:mmm d, yyyy") + ' to ' + Date.parse(sta.end).format("UTC:mmm d, yyyy") + '</p>'
          + '<p>Station depth: ' + sta.avedepth + ' meters</p>'
          + adcp
       + '</div>';
      s.push(
        '<div class="title"><i class="dropdown icon"></i><i class="' + sta.desc.replace(/ /g,'_').toLowerCase() + ' circle icon"></i><a data-accordion-id="' + s.length + '" data-sid="' + sta.sid + '">' + sta.station_name + '</a></div>'
        + '<div class="content" data-sid="' + sta.sid + '" data-depth_values="' + _.compact(String(sta.depth_values).split(/, */)).join(',').trim() + '" data-station_name="' + sta.station_name + '" data-station-start="' + Date.parse(sta.start) + '" data-station-end="' + Date.parse(sta.end) + '" data-group-start="' + t0 + '" data-group-end="' + t1 + '">' + content + '</div>'
      );
    });
    $('#stationListMain').html('<div class="ui fluid styled accordion">' + s.join('') + '</div>');
    
    $('#stationListMain .graphB').popup({position:'bottom right',content:'Click to add to Red Graph'});
    $('#stationListMain .graphA').popup({position:'bottom right',content:'Click to add to Blue Graph'});
    $('#stationListMain .disabled').popup({position:'bottom right',content:'You can only show one currents Graph'});

    $('#stationListMain .graphA').click(function() {
      $('#stationListMain .graphA').removeClass('inverted');
      // currents will nuke any graphB selection
      if (/current/i.test($(this).parent().data('param'))) {
        if ($('#stationListMain .graphB.inverted').length > 0) {
          $('#modal-header').html('Graph removed');
          $('#modal-content').html('Your right-hand (red) graph has been removed since Currents must be plotted alone.');
          $('#modal-alert').modal('show');
        }
        $('#stationListMain .graphB').removeClass('inverted');
      }
      $(this).addClass('inverted');
      mapView.goParam(
         0 
         ,$(this).parent().parent().data('sid') 
         ,$(this).parent().parent().data('station_name') 
         ,$(this).parent().parent().data('depth_values') != 'null' ? $(this).parent().parent().data('depth_values') : false
         ,$(this).parent().data('param')
         ,[$(this).parent().parent().data('station-start'),$(this).parent().parent().data('station-end')]
         ,[$(this).parent().parent().data('group-start'),$(this).parent().parent().data('group-end')]
      );
    });
    $('#stationListMain .graphB:not(.disabled)').click(function() {
      // don't allow a graphB plot if graphA = current
      if (/current/i.test($('#stationListMain .graphA.inverted').parent().data('param'))) {
        $('#modal-header').html('Graph unavailable');
        $('#modal-content').html('You may not plot a right-hand (red) graph while viewing a Currents graph.  Please change your left-hand (blue) graph first.');
        $('#modal-alert').modal('show');
      }
      // make sure a graphA has been selected 1st
      else if ($('#stationListMain .graphA.inverted').length > 0) {
        $('#stationListMain .graphB').removeClass('inverted');
        $(this).addClass('inverted');
        mapView.goParam(
           1
           ,$(this).parent().parent().data('sid')
           ,$(this).parent().parent().data('station_name')
           ,$(this).parent().parent().data('depth_values') != 'null' ? $(this).parent().parent().data('depth_values') : false
           ,$(this).parent().data('param')
           ,[$(this).parent().parent().data('station-start'),$(this).parent().parent().data('station-end')]
           ,[$(this).parent().parent().data('group-start'),$(this).parent().parent().data('group-end')]
        );
      }
      else {
        $('#modal-header').html('Graph unavailable');
        $('#modal-content').html('Please launch a left-hand (blue) graph before attempting to launch a right-hand (red) graph.');
        $('#modal-alert').modal('show');
      }
    });

    $('.ui.accordion').accordion({
       exclusive : false
      ,onOpen    : function() {
        mapView.goStation($(this).data('sid'));
      }
      ,onClose   : function() {
        // give the expand / collapse time to register before syncing the markers
        setTimeout(function(){mapView.syncMarkers(mapView.model.get('markerData'))},100);
      }
    });
    $('#stationListMain a').mouseover(function() {
      mapView.hightlightStation($(this).data('sid'));
    });
    $('#stationListMain a').mouseout(function() {
      mapView.unhighlight();
    });

    mapView.syncMarkers();
  },

  syncMarkers : function(jsony) {
console.log('syncMarkers');
    if (!jsony) {
      return;
    }
    var activeStations = [];
    $('#stationListMain .title.active a').each(function() {activeStations.push($(this).text())});
    for (var marker in mapView.model.stationlayers['Stations']._layers) {
      mapView.model.stationlayers['Stations']._layers[marker].hideLabel();
      mapView.model.stationlayers['Stations']._layers[marker].label.setContent(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['station_name']);
      if (activeStations.indexOf(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['station_name']) >= 0) {
         for (var sidObj in jsony.values){
            if (jsony.values[sidObj].sid == mapView.model.stationlayers['Stations']._layers[marker].feature.properties['sid']){
              mapView.model.stationlayers['Stations']._layers[marker].label.setContent(mapView.parseObjToStr(jsony.values[sidObj],mapView.model.stationlayers['Stations']._layers[marker].feature.properties['station_name']));
              mapView.model.stationlayers['Stations']._layers[marker].showLabel();
            }
         }
      }
    }
  },

  unhighlight : function() { 
    
    for(var marker in mapView.model.stationlayers['Stations']._layers)
    {
      mapView.model.stationlayers['Stations']._layers[marker].setStyle({radius: 6,weight: 1});
    }
  },
  hightlightStation : function(sid) { 
    
    for(var marker in mapView.model.stationlayers['Stations']._layers)
    {
      if(mapView.model.stationlayers['Stations']._layers[marker].feature.properties['sid']== sid){
         mapView.model.stationlayers['Stations']._layers[marker].setStyle({radius: 8,weight: 2});
      }
      else{
         mapView.model.stationlayers['Stations']._layers[marker].setStyle({radius: 6,weight: 1});
      }
    }
  },

  goStation : function(sid) { 
    mapView.hightlightStation(sid);
    // give the expand / collapse time to register before syncing the markers
    setTimeout(function(){mapView.syncMarkers(mapView.model.get('markerData'))},100);
  },

  goParam : function(graphId,sid,station_name,depth_values,param,station_dates,group_dates) {
    if (catalogView.model.get('state') == 'hidden') {
      catalogView.togglecatalog();
    }
    var $s2 = $('#tools').find('.toggle');
    $s2.html("Map View <i class='chart basic icon'></i>");

    catalogView.model.set('graph' + graphId,{
       sid           : sid
      ,station_name  : station_name
      ,depth_values  : depth_values
      ,param         : param
      ,station_dates : station_dates
      ,group_dates   : group_dates
    });
  }
});
