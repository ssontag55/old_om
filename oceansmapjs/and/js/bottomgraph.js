var GraphView = Backbone.View.extend({
  events: {
    'click div.ui.icon.button' : 'togglebottomgraph'
  },

  initialize: function() {
    _.bindAll(this, 'formatndbctograph', 'showloading', 'drawbottomgraph', 'hideshowtabs', 'cleargraphdata', 'togglebottomgraph');

    var that = this;

    this.$menu = this.$el.children('.menu');
    this.$tabs = this.$menu.children();
    this.$svg = this.$el.children('svg');
    this.$loader = this.$el.children('.loader');
    this.graphdata = {};

    this.selectedfeatureindex = {
      'winds': '"wind_speed (m/s)"',
      'air_temperature': '"air_temperature (C)"',
      'waves': '"sea_surface_swell_wave_significant_height (m)"',
      'sea_water_temperature': '"sea_water_temperature (C)"',
      'air_pressure_at_sea_level': '"air_pressure_at_sea_level (hPa)"',
      'sea_water_salinity': '"sea_water_salinity (psu)"',
      'currents': '"sea_water_speed (cm/s)"'
    }

    this.model.set('activetab', 'winds');

    // add handlers for tabs
    var tab;
    for (tab in this.selectedfeatureindex) {
      this.$tabs.each(function(index, value) {
        $(this).click(function() {
          that.$menu.children().removeClass('active');
          $(this).addClass('active');
          that.model.set('activetab', $(this).data('id'));
        });
      });
    }

    // callback is the activetab changes
    this.model.on('change:activetab', function() {
      that.$tabs.removeClass('active');
      var activedatafeature = that.model.get('activetab');

      that.$tabs.each(function() {
        if ($(this).data('id') == activedatafeature)
          $(this).addClass('active');
      });

      that.drawbottomgraph();
    });

    // set the initial state to hidden
    this.model.set('state', 'hidden');
    this.$svg.css('display', 'none');
  },

  togglebottomgraph: function() {
    var that = this;

    if (this.model.get('state') == 'visible') {
      this.model.set('state', 'resizing');

      this.$svg.css('display', 'none');

      this.$el.animate(
        { height: '39px' },
        { duration: 1000,
          easing: 'easeOutExpo',
          done: function() {
            that.model.set('state', 'hidden');
            mapView.map.invalidateSize();
          }
        }
      );

      mapView.$el.animate(
        { bottom: '39px' },
        { duration: 1000, easing: 'easeOutExpo' }
      );
    } else if (this.model.get('state') == 'hidden') {
      this.model.set('state', 'resizing');

      this.$svg.css('display', 'block');

      this.$el.animate(
        { height: '260px' },
        { duration: 1000,
          easing: 'easeOutExpo',
          done: function() {
            that.model.set('state', 'visible');
            mapView.map.invalidateSize();
          }
        }
      );

      mapView.$el.animate(
        { bottom: '260px' },
        { duration: 1000, easing: 'easeOutExpo' }
      );
    }
  },

  hideshowtabs: function(tabs) {
    this.$tabs.fadeOut();
  },

  showloading: function() {
    var that = this;

    this.drawbottomgraph();
    if (this.model.get('state') != 'visible') {
      this.togglebottomgraph();
    }

    this.$loader.fadeIn();
    this.$svg.fadeOut();

    this.loadingtimeout = setTimeout(function() {
      if (that.model.get('state') == 'hidden') {

        var tabtoshow;
        if (that.graphdata.winds) {
          tabtoshow = 'winds';
        } else if (that.graphdata.air_temperature) {
          tabtoshow = 'air_temperature';
        } else if (that.graphdata.waves) {
          tabtoshow = 'waves';
        } else if (that.graphdata.sea_water_temperature) {
          tabtoshow = 'sea_water_temperature';
        } else if (that.graphdata.air_pressure_at_sea_level) {
          tabtoshow = 'air_pressure_at_sea_level';
        } else{
          tabtoshow = 'winds';
        }

        if (tabtoshow) {
          that.$tabs.each(function() {
            if ($(this).data('id') == tabtoshow) {
              that.model.set('activetab', $(this).data('id'));
              that.togglebottomgraph();
              return false;
            }
          });
        }
      }

      that.$loader.fadeOut();

    }, 25000);
  },

  drawbottomgraph: function() {
    // setup graphs
    var activetab = this.model.get('activetab')
      , datum;

    if (this.graphdata[activetab]){
      datum = this.graphdata[activetab];
      if (this.model.get('state') == 'hidden')
        this.togglebottomgraph();
    } 
    /*else if(this.winddata){
      datum = this.winddata;
      this.model.set('activetab', 'winds');
    }
    else if(this.wavedata){
      datum = this.wavedata;
      this.model.set('activetab', 'waves');
    }
    else if(this.airpressdata){
      datum = this.airpressdata;
      this.model.set('activetab', 'air_pressure_at_sea_level');
    }
    else if(this.seatempdata){
      datum = this.seatempdata;
      this.model.set('activetab', 'sea_water_temperature');
    }
    else if(this.currentdata){
      datum = this.currentdata;
      this.model.set('activetab', 'currents');
    }*/
    else {
      return;
    }

    var chart
      , columns = [];

    var unitVal = datum[2];
    if((activetab == 'winds') && (this.winddata)) {
      columns.push(
        datum[0],
        this.winddata[0],
        datum[1],
        this.winddata[1]
      );
    }
    else if ((activetab == 'waves') && (this.wavedata)) {
      columns.push(
        datum[0],
        this.wavedata[0],
        datum[1],
        this.wavedata[1]
      );
    } else if ((activetab == 'sea_water_temperature') && (this.seatempdata)) {
      columns.push(
        datum[0],
        this.seatempdata[0],
        datum[1],
        this.seatempdata[1]
      );
    }else if ((activetab == 'air_pressure_at_sea_level') && (this.airpressdata)) {
      columns.push(
        datum[0],
        this.airpressdata[0],
        datum[1],
        this.airpressdata[1]
      );
    }else if ((activetab == 'currents') && (this.currentdata)) {
      columns.push(
        datum[0],
        this.currentdata[0],
        datum[1],
        this.currentdata[1]
      );
    }
    else {
      columns.push(
        datum[0],
        datum[1]
      );
    }

    chart = c3.generate({
      bindto: '#c3graph',
      size: {
       height: 245
      },
      data: {
        xs: {
          'Realtime-UTC': 'x1',
          'Forecast-UTC': 'x2'
        },
//        x_format : "%Y-%m-%dT%H:%M:%S.%LZ",
        columns: columns
      },
      zoom:{
        enabled:true
      },
      grid: {
        x: {
            show: true
        },
        y: {
            show: true
        }
      },
      axis: {
        x: {
          tick: {
            format: function(date) {
              var date = new Date(date);
              return date.getMonth() + '/' + date.getDate() + ' ' + date.toTimeString().substr(0,5);
            }
          }
        },
        y: {
          tick: {
            format: function(val) {
              return val + unitVal;
            }
          }
        }
      },
      legend: {
        show: true
      }
    });

    this.$svg.fadeIn();
    this.$loader.fadeOut();
  },

  cleargraphdata: function() {
    this.graphdata = {};
    this.wavedata = null;
    this.winddata = null;
    this.seatempdata = null;
    this.airpressdata = null;
    this.currentdata = null;
  },

//for EDS graph
  formatleaflettograph: function(rawdata) {
    if(rawdata.Data){
      var data = rawdata.Data.Point
      , xs = ['x2']
      , ys = ['Forecast-UTC'];

    var i;
    
    var unitVal;
    if(data[1].Value[0]){
      if(data[1].Value[0]['@attributes'].Unit == "Knots"){
        if(data[1].Value[0]['@attributes'].Var == "Water Velocity"){
          unitVal = ' cm/s ';
         for (i=0; i<data.length; i++) {
           xs.push(new Date(data[i].Time['#text']));
           ys.push(parseFloat((Number(data[i].Value[0]['#text']))*0.0514444).toPrecision(2));
         }

         this.currentdata = [xs, ys, unitVal];
        }
        else{
         unitVal = ' m/s ';
         for (i=0; i<data.length; i++) {
           xs.push(new Date(data[i].Time['#text']));
           ys.push(parseFloat((Number(data[i].Value[0]['#text']))*0.514444).toPrecision(4));
         }

         this.winddata = [xs, ys, unitVal];
        }
       }
    }
     if(data[1].Value['@attributes']){
        if(data[1].Value['@attributes'].Unit == "Meters"){
           unitVal = ' m ';
           for (i=0; i<data.length; i++) {
             xs.push(new Date(data[i].Time['#text']));
             ys.push(parseFloat(data[i].Value['#text']).toPrecision(4));
           }

           this.wavedata = [xs, ys, unitVal];
         } 
        if(data[1].Value['@attributes'].Unit == "Pascals"){
           unitVal = ' hPa ';
           for (i=0; i<data.length; i++) {
             xs.push(new Date(data[i].Time['#text']));
             ys.push(parseFloat(Number(data[i].Value['#text']))/100);
           }
  
           this.wavedata = [xs, ys];
           this.airpressdata = [xs, ys, unitVal];
        }
        if(data[1].Value['@attributes'].Unit == "Degrees in Celcius"){
         unitVal = ' °C ';
         for (i=0; i<data.length; i++) {
           xs.push(new Date(data[i].Time['#text']));
           ys.push(parseFloat(data[i].Value['#text']).toPrecision(4));
         }

         this.seatempdata = [xs, ys, unitVal];
       }
    }
    
      this.drawbottomgraph();
      this.model.set('state', 'visible');
    }
  },

  formatndbctograph: function(data) {
//    var selectProperted = mapView.model.get('selectProperted');
    var selectProperted;
    var unitVal;

    for (prop in this.selectedfeatureindex) {
      if (data[0].hasOwnProperty(this.selectedfeatureindex[prop]))
        selectProperted = prop;
    }
    if(selectProperted == 'winds'){
      unitVal =  ' m/s ';
    }
    if(selectProperted == 'air_temperature' || selectProperted == 'sea_water_temperature' ){
      unitVal =  ' °C ';
    }
    if(selectProperted == 'waves'){
      unitVal =  ' m ';
    }
    if(selectProperted == 'air_pressure_at_sea_level'){
      unitVal =  ' hPa ';
    }
    if(selectProperted == 'sea_water_salinity'){
      unitVal =  ' psu ';
    }
    if(selectProperted == 'currents'){
      unitVal =  ' cm/s ';
    }

    var xs = ['x1']
      , ys = ['Realtime-UTC'];
    
    // clean data
    var i;
    for (i=0; i<data.length; i++) {
      data[i].date_time = new Date(data[i].date_time);
      data[i][this.selectedfeatureindex[selectProperted]] = parseFloat(data[i][this.selectedfeatureindex[selectProperted]]);

      if (isNaN(data[i][this.selectedfeatureindex[selectProperted]])) {
          data.splice(i,1);
          i--;
      } else {
        if(selectProperted == 'currents'){
            //only take the first bin for surface
            if(data[i]['bin (count)'] == "1"){
              xs.push(data[i].date_time);
              ys.push(data[i][this.selectedfeatureindex[selectProperted]]);
            }
        }
        else{
          xs.push(data[i].date_time);
          ys.push(data[i][this.selectedfeatureindex[selectProperted]]);
        }
      }
    }

    // stop rendering if there isn't any data
    if (!data.length) {
      console.log('no data');
//      $graphs.html('<p style="font-size: 1.5em; margin-top: 0;">Recent Data Not Available</p>');
      return;
    } else {
//      $graphs.empty();
      this.graphdata[selectProperted] = [ xs, ys, unitVal ];

      this.$tabs.each(function() {
        if ($(this).data('id') == selectProperted)
          $(this).fadeIn();
      });

      if (selectProperted == this.model.get('activetab')) {
        //this.drawbottomgraph();
      }
    }
    this.drawbottomgraph();
  }
});