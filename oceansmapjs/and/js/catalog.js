var CatalogView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, 'togglecatalog');

    var that = this;
 
    // set the initial state to hidden
    this.model.set('state', 'hidden');
    this.model.set('dates',{
      bounds : {
         min : new Date(1900,0,1)
        ,max : new Date(1900,11,31)
      }
      ,defaultValues : {
         min : new Date(1900,0,1)
        ,max : new Date(1900,11,31)
      }
      ,values : {
         min : new Date(1900,0,1)
        ,max : new Date(1900,0,1)
      }
    });
    
    $('#time_controls').hide();
    $('#param0InfoContainer').hide();
    $('#param1InfoContainer').hide();

    $('#big_graph').html('<div class="ui segment"><h3>Select a parameter to begin.</h3></div>');
    $('#big_graph').css('height','100%');

    this.model.on('change:deployment', function() {
      console.log('dep change');
      this.set('dates',{
        bounds : {
           min : new Date(1900,0,1)
          ,max : new Date(1900,11,31)
        }
        ,defaultValues : {
           min : new Date(1900,0,1)
          ,max : new Date(1900,11,31)
        }
        ,values : {
           min : new Date(1900,0,1)
          ,max : new Date(1900,11,31)
        }
      });
      this.unset('lastDates');
      this.unset('chart0Data');
      this.unset('chart1Data');
      this.unset('graph0');
      this.unset('graph1');

      $('#time_controls').hide();
      $('#param0InfoContainer').hide();
      $('#param1InfoContainer').hide();

      if (!/Select a parameter/i.test($('#big_graph').html())) {
        $('#big_graph').html('<div class="ui segment"><h3>Your deployment has changed.<br><br>Select a parameter to continue.</h3></div>');
        $('#big_graph').css('height','100%');
      }
    });

    this.model.on('change:graph0', function() {
      // graph0 is our pivot point -- it controls everything
      console.log('graph0 change');
      var h = this.get('graph0');
      if (h) {
        if (/Select a parameter/i.test($('#big_graph').html())) {
          $('#big_graph').empty();
        }
        $('#time_controls').show();
        $('#param0InfoContainer').show();
        if (_.isUndefined(this.get('lastDates'))) {
          var minDt = new Date(h.station_dates[0]);
          var maxDt = new Date(h.station_dates[1]);
          var t0    = new Date(h.group_dates[0]);
          var t1    = new Date(h.group_dates[1]);

          // keep the initial selected time range reasonable
          if (maxDt.getTime() - minDt.getTime() > 3600 * 24 * 10 * 1000) {
            maxDt = new Date(minDt.getTime() + 3600 * 24 * 10 * 1000);
          }

          $('#catalog #date_slider').dateRangeSlider(
             'bounds'
             ,t0
             ,t1
          );
          $('#catalog #date_slider').dateRangeSlider(
             'values'
             ,minDt
             ,maxDt
          );

          this.set('dates',{
            bounds : {
               min : t0
              ,max : t1
            }
            ,defaultValues : {
               min : minDt
              ,max : maxDt
            }
            ,values : {
               min : minDt
              ,max : maxDt
            }
          });

          $('#catalog #start').html(t0.format("UTC:yyyy-mm-dd"));
          $('#catalog #end').html(t1.format("UTC:yyyy-mm-dd"));
        }
        h.graphId = 0;
        catalogView.goGraph(h,true);
      }

      setTimeout(function() {
        $('#catalog #date_slider').show();
        catalogView.resize();
      },100);
    });

    this.model.on('change:graph1', function() {
      console.log('graph1 change');
      var h = this.get('graph1');
      if (h) {
        $('#param1InfoContainer').show();
        h.graphId = 1;
        catalogView.goGraph(h);
      }
    });

    // slider needs dummy data to init
    $('#catalog #date_slider').dateRangeSlider({
       bounds        : this.model.get('dates').bounds
      ,defaultValues : this.model.get('dates').defaultValues
      ,step          : {days : 1}
      ,formatter     : function(val) {
        return val.format("UTC:yyyy-mm-dd");
      }
      ,scales        : [{
         first : function (value) {
          var d = new Date(value.getTime()).add(1).months();
          return new Date(d.format("yyyy"),d.format("mm")-1);
        }
        ,end   : function (value) {return value;}
        ,next  : function (value) {
          var next = new Date(value);
          return new Date(next.setMonth(value.getMonth() + 1));
        }
        ,label : function (value) {
          return value.format("UTC:mm-dd")
        }
      }]
    });
    $('#catalog #date_slider').bind('userValuesChanged',function(e,data){
      var dates = catalogView.model.get('dates');
      dates.values = data.values;
      catalogView.model.set('dates',dates);
      catalogView.refreshGraphs();
   });

    $(window).resize(function() {
      catalogView.resize(); 
    }); 
  },

  togglecatalog: function() {
    var that = this;

    if (this.model.get('state') == 'visible') {
      this.$el.hide();
      mapView.$el.show();
      mapView.map.invalidateSize();
      $('#timesmap').show();
      $('#timesliderlabel').show();
      $('#timesliderlabelend').show();
      $('#timesliderlabelstart').show();
      that.model.set('state', 'hidden');
    }
    else if (this.model.get('state') == 'hidden') {
      this.$el.show();
      $('#timesmap').hide();
      $('#timesliderlabel').hide();
      $('#timesliderlabelend').hide();
      $('#timesliderlabelstart').hide();
      mapView.$el.hide();
      that.model.set('state', 'visible');
    }
  },

  refreshGraphs : function() {
    var h = this.model.get('graph0');
    if (h) {
      h.graphId = 0;
      catalogView.goGraph(h);
    }

    h = this.model.get('graph1');
    if (h) {
      h.graphId = 1;
      catalogView.goGraph(h);
    }
  },

  goGraph : function(info,isNew) {
    catalogView.model.unset('chart' + info.graphId + 'Data');

    var depths  = info.depth_values ? info.depth_values : '';
    var dates   = this.model.get('dates');

    if (info.param.indexOf('current') >= 0) {
        if (!isNew) {
          $('.show-graph').trigger('click');
          return;
        }
        $('#param0Stats .button').popup('remove');
        $('#param0Stats .button').unbind('click');
        $('#param0Header').html('<i class="rightc indent left icon"></i> <b>' + info.station_name + '</b> : Currents');
        var checked = catalogView.model.get('activeCurrentsDepths') || [];
        var depths = info.depth_values.split(',');
        // max 15 rows in a column
        var tr = [];
        for (var i = 0 ; i < Math.min(depths.length,10); i++) {
          var td = [];
          for (var j = 0; j < depths.length / 10; j++) {
            if (depths[j * 10 + i]) {
              td.push('<div class=\'ui toggle checkbox\'><input ' + (checked.indexOf(depths[j * 10 + i]) >= 0 ? 'checked' : '') + ' type=\'checkbox\' name=\'' + depths[j * 10 + i] + '\'><label>' + depths[j * 10 + i] + ' m</label></div>');
            }
            else {
              td.push('&nbsp;');
            }
          }
          tr.push('<td>' + td.join('</td><td>') + '</td>');
        }
        var content = '<table id=\'depth-options\' class=\'ui table segment\'><tr>' + tr.join('</tr><tr>') + '</tr></table><div data-param=\'' + info.param + '\' class=\'show-graph small ui button\' data-sid=\'' + info.sid + '\' data-station_dates=\'' + info.station_dates + '\'>Show graph</div>';
        $('#param0Stats').html('<div data-content="' + content + '" data-title="Available depths" class="ui hover tiny button">Depths</div><div id="currentsStats">Select one or more depths.</div>');
        $('#param0Stats .button').popup({
           position : 'bottom right'
          ,on       : 'click'
          ,title    : 'Available depths'
          ,content  : content
          ,preserve : true
          ,onCreate : function() {
            $('#depth-options .ui.toggle.checkbox').checkbox();
            $('.show-graph').click(function() {
              catalogView.showSpinner();
              $('#currentsStats').html('Loading...');
              var dates         = catalogView.model.get('dates');
              var sid           = $(this).data('sid');
              var station_dates = $(this).data('station_dates');
              var w             = $('#big_graph').width() - 15
              var h             = $('#catalog').height() - 120
              var checked       = [];
              $.each($(this).parent().find('input'),function(o) {
                if ($(this).prop('checked')) {
                  checked.push($(this).attr('name'));
                }
              });
              catalogView.model.set('activeCurrentsDepths',checked);
              $('#param0Stats .button').popup('hide');
              $.ajax({
                 i             : 0
                ,station_dates : station_dates
                ,url           : 'http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://10.90.209.21:8080/oceansmap65/metobs/gettimeseriescurrentsimage/?st=' + sid + '&starttime=' + dates.values.min.format('yyyy-mm-dd"T"HH:00:00') + '&endtime=' + dates.values.max.format('yyyy-mm-dd"T"HH:00:00') + '&y=surface&d=' + checked.join(',') + '&attr=and&h=' + h + '&w=' + w
                ,success  : function(r) {
                  if (catalogView.model.get('chart')) {
                    catalogView.model.unset('chart1Data');
                    catalogView.model.get('chart').clearChart();
                  }
                  if (r == 'Please check your request') {
                    $('#currentsStats').html('<span class="nodata">No data for this time.</span>');
                    $('#param' + this.i + 'Controls').html('<div class="ui hover tiny button clear-graph" data-graph-id="' + this.i + '"><i class="close icon"></i>Clear</div> <div class="red ui hover tiny button zoom-to-dates" data-start="' + station_dates[0] + '" data-end="' + station_dates[1] + '"><i class="icon calendar"></i> View all times</div>');
                  }
                  else {
                    $('#big_graph').html('<img id="stick" src="data:image/png;base64,' + r + '" />');
                    $('#currentsStats').html('Right click to save image.');
                    $('#param0Controls').html('<div class="ui hover tiny button clear-graph" data-graph-id="' + this.i + '"><i class="close icon"></i>Clear</div> <div class="ui hover tiny button zoom-to-dates" data-start="' + this.station_dates[0] + '" data-end="' + this.station_dates[1] + '"><i class="icon calendar"></i> View all times</div>');
                  }
                  $('.clear-graph').click(function() {
                    catalogView.model.unset('chart' + $(this).data('graph-id') + 'Data');
                    catalogView.model.unset('graph' + $(this).data('graph-id'));
                    $('#big_graph').empty();
                    $('#param' + $(this).data('graph-id') + 'InfoContainer').hide();
                    $('#stationListMain .graph' + ($(this).data('graph-id') == '0' ? 'A' : 'B')).removeClass('inverted');
                  });
                  $('.zoom-to-dates').click(function() {
                    $('#catalog #date_slider').dateRangeSlider(
                       'values'
                       ,new Date($(this).data('start'))
                       ,new Date($(this).data('end'))
                    );
                    var dates = catalogView.model.get('dates');
                    dates.values = {
                       min : new Date($(this).data('start'))
                      ,max : new Date($(this).data('end'))
                    };
                    catalogView.model.set('dates',dates);
                    setTimeout(function() {
                      $('#catalog #date_slider').show();
                      catalogView.resize();
                    },100);
                    catalogView.refreshGraphs();
                  });

                  $('#catalog').spin(false);
                }
                ,error  : function(r) {
                  $('#catalog').spin(false);
                }
                ,fail: function(r) {
                  $('#catalog').spin(false);
                }
              });
            });
          }
        });
        $('#param0Stats .button').popup('show');
    }
    else{
      $('#param' + info.graphId + 'Header').html('<i class="' + (info.graphId == 0 ? 'rightc' : 'leftc') + ' indent left icon"></i> <b>' + info.station_name + '</b>');
      $('#param' + info.graphId + 'Stats').html('Loading...');
      catalogView.showSpinner();
      $.ajax({
         dataType     : 'json'
        ,i            : info.graphId
        ,s            : info.sid
        ,station_name  : info.station_name
        ,station_dates : info.station_dates
        ,url      : 'http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://10.90.209.21:8080/oceansmap65/metobs/gettimeseries/?attr=and&param=' + info.param + '&st=' + info.sid + '&starttime=' + dates.values.min.format('yyyy-mm-dd"T"HH:00:00')+ '&endtime=' + dates.values.max.format('yyyy-mm-dd"T"HH:00:00') + '&y=adf'
        //,url      : 'http://localhost:8080/oceansmap65/metobs/gettimeseries/?attr=and&param=' + info.param + '&st=' + info.sid + '&starttime=' + dates.values.min.format('yyyy-mm-dd"T"HH:00:00')+ '&endtime=' + dates.values.max.format('yyyy-mm-dd"T"HH:00:00') + '&y=adf'
        ,success  : function(r) {
          var pIdx = this.i;
          var psx = this.s;
          var station_name = this.station_name;
          var station_dates = this.station_dates;

          if(!r.profile){
            $('#catalog').spin(false);
            $('#param' + pIdx + 'Stats').html('<span class="nodata">No data for this time.</span>');
            $('#param' + pIdx + 'Controls').html('<div class="ui hover tiny button clear-graph" data-graph-id="' + pIdx + '"><i class="close icon"></i>Clear</div> <div class="red ui hover tiny button zoom-to-dates" data-start="' + station_dates[0] + '" data-end="' + station_dates[1] + '"><i class="icon calendar"></i> View all times</div>');
          }
          else{
              _.each(_.sortBy(_.filter(_.pairs(r.profile),function(o){return _.isObject(o[1])}),function(o){return o[1].parametername.toLowerCase()}),function(o) { 
              var values = _.map(o[1].data,function(o){return o.value});
              if (values.length < 1) {
                $('#catalog').spin(false);
                $('#param' + pIdx + 'Stats').html('<span class="nodata">No data for this time.</span>');
                $('#param' + pIdx + 'Controls').html('<div class="ui hover tiny button clear-graph" data-graph-id="' + pIdx + '"><i class="close icon"></i>Clear</div> <div class="red ui hover tiny button zoom-to-dates" data-start="' + station_dates[0] + '" data-end="' + station_dates[1] + '"><i class="icon calendar"></i> View all times</div>');
                return false;
              };
              var stats = {
                 min  : math.min(values)
                ,max  : math.max(values)
                ,mean : math.mean(values)
              };

              var chartOptions = {
                 explorer         : {}
                ,legend           : {position : 'none'}
                ,areaOpacity      : 0.10
                ,hAxis            : {baselineColor: '#ffffff',gridlines : {color : 'transparent'}}
                ,tooltip          : {isHtml : true} 
                ,interpolateNulls : true
                ,chartArea        : {width : '80%',height : '90%'}
              }; 

              var data = new google.visualization.DataTable();
              data.addColumn('datetime','t');
              var uom;
              if (/current_.*/.test(o[0])) {
                var depths = _.uniq(_.pluck(o[1].data,'depth')).sort(function(a,b){return b-a});
                var dataByTime = _.groupBy(o[1].data,'time');
                _.each(depths,function(d) {
                  //data.addColumn('number',o[1].parametername + ' (' + o[1].parameterunits + ') @ ' + d + 'm');
                  data.addColumn('number',o[1].parametername + ' (' + d + ' m)');
                  data.addColumn({type : 'string',role : 'tooltip',p: {html : true}});
                  uom = o[1].parameterunits;
                });
                _.each(dataByTime,function(v,k) {
                  var r = [Date.parse(k)];
                  _.each(depths,function(d) {
                    var o = _.findWhere(v,{depth : d});
                    //-100 is the difference in value going down 
                    r.push(o ? o.value + -100 * d : null);
                    r.push(o ? '<b>' + Date.parse(k).format('UTC:yyyy-mm-dd HH:MM:ss') + ' UTC</b><br>' + String(o.value) + ' ' + uom + ' @ ' + d + ' m': null);
                  });
                  data.addRow(r);
                });
                chartOptions.vAxis = {
                   baselineColor : '#fff'
                  ,gridlineColor : '#fff'
                  ,textPosition  : 'none'
                };
              }
              else {
                uom = o[1].parameterunits;
                data.addColumn('number',o[1].parametername + ' (' + uom + ')');
                data.addColumn({type : 'string',role : 'tooltip',p: {html : true}});
                var rows = _.map(o[1].data,function(o){return [Date.parse(o.time),o.value,'<b>' + Date.parse(o.time).format('UTC:yyyy-mm-dd HH:MM:ss')+ ' UTC</b><br>' + String(o.value) + ' ' + uom + '  '+ station_name]});
                data.addRows(_.sortBy(rows,function(o){return o[0].getTime()}));
              }

              catalogView.model.set('chart',new google.visualization.ComboChart(document.getElementById('big_graph')));
              catalogView.model.set('chart' + pIdx + 'Data',data);
              catalogView.model.set('chartOptions',chartOptions);
              catalogView.drawChart();

              $('#param' + pIdx + 'Header').html('<i class="' + (pIdx == 0 ? 'rightc' : 'leftc') + ' indent right icon"></i> <b>' + station_name + '</b> : ' + o[1].parametername + ' (' + uom + ')');
              $('#param' + pIdx + 'Stats').html('Avg: ' + (Math.round(stats.mean * 100) / 100) + ';  Min: '+(Math.round(stats.min * 100) / 100)+';  Max: '+(Math.round(stats.max * 100) / 100) + '&nbsp;' + o[1].parameterunits);
              $('#param' + pIdx + 'Controls').html('<div class="ui hover tiny button clear-graph" data-graph-id="' + pIdx + '"><i class="close icon"></i>Clear</div> <div class="ui hover tiny button zoom-to-dates" data-start="' + station_dates[0] + '" data-end="' + station_dates[1] + '"><i class="icon calendar"></i>View all times</div>');

              $('#catalog').spin(false);
            });
          }

          $('.clear-graph').click(function() {
            catalogView.model.unset('chart' + $(this).data('graph-id') + 'Data');
            catalogView.model.unset('graph' + $(this).data('graph-id'));
            $('#param' + $(this).data('graph-id') + 'InfoContainer').hide();
            catalogView.model.get('chart').clearChart();
            catalogView.drawChart();
            $('#stationListMain .graph' + ($(this).data('graph-id') == '0' ? 'A' : 'B')).removeClass('inverted');
          });
          $('.zoom-to-dates').click(function() {
            $('#catalog #date_slider').dateRangeSlider(
               'values'
               ,new Date($(this).data('start'))
               ,new Date($(this).data('end'))
            );
            var dates = catalogView.model.get('dates');
            dates.values = {
               min : new Date($(this).data('start'))
              ,max : new Date($(this).data('end'))
            };
            catalogView.model.set('dates',dates);
            setTimeout(function() {
              $('#catalog #date_slider').show();
              catalogView.resize();
            },100);
            catalogView.refreshGraphs();
          });
        }
        ,error  : function(r) {
          $('#catalog').spin(false);
        }
        ,fail: function(r) {
          $('#catalog').spin(false);
        }
      });
    }

    this.model.set('lastDates', this.model.get('dates'));
  },

  resize : function() {
    if (this.model.get('state') == 'visible') {
      $('#big_graph').height($('#catalog').height() - $('#time_controls').height() - 40 - 85);
      $('#catalog #date_slider').dateRangeSlider('resize');
      this.drawChart();
    }
  },

  //not used -- this was for the removal of certain axis' for the vertical profile
  showHideSeries: function() {
        var sel = catalogView.model.get('chart').getSelection();
        // if selection length is 0, we deselected an element
        var dsel = catalogView.model.get('chartData')[0];
        var vw = new google.visualization.DataView(dsel);
        if(sel.length > 0){

        vw.hideColumns([sel[0].column,sel[0].column+1]);
        var cr = [];
        cr[0] = vw.toDataTable();
        catalogView.model.set('chartData',cr);
        catalogView.drawChart();
        }
        /*if (sel.length > 0) {
            // if row is undefined, we clicked on the legend
            if (sel[0].row == null) {
                var col = sel[0].column;
                if (typeof(columns[col]) == 'number') {
                    var src = columns[col];
                    
                    // hide the data series
                    columns[col] = {
                        label: dsel.getColumnLabel(src),
                        type: dsel.getColumnType(src),
                        sourceColumn: src,
                        calc: function () {
                            return null;
                        }
                    };
                    
                    // grey out the legend entry
                    series[columnsMap[src]].color = '#CCCCCC';
                }
                else {
                    var src = columns[col].sourceColumn;
                    
                    // show the data series
                    columns[col] = src;
                    series[columnsMap[src]].color = null;
                }
                var view = chart.getView() || {};
                view.columns = columns;
                chart.setView(view);
                chart.draw();
            }
        }*/
    } ,

  drawChart : function() {
    if (catalogView.model.get('chart')) {
      var chartData = [];
      catalogView.model.get('chart0Data') && chartData.push(catalogView.model.get('chart0Data'));
      catalogView.model.get('chart1Data') && chartData.push(catalogView.model.get('chart1Data'));
      if (!_.isEmpty(chartData)) {
        // throw away any 2nd graph if plotting currents
        if (/Current Speed|Current Direction/.test(chartData[0].getColumnLabel(1)) && chartData.length == 2) {
          chartData.pop();
        }
        var chartOptions = catalogView.model.get('chartOptions');
        if (chartData.length > 1) {
          chartOptions.series = {
             0 : {targetAxisIndex : 0}
            ,1 : {targetAxisIndex : chartData[0].getColumnLabel(1) == chartData[1].getColumnLabel(1) ? 0 : 1} // share same axis if possible
          };
          if (/direction/i.test(chartData[0].getColumnLabel(1))) {
            _.extend(chartOptions.series['0'],{type : 'line',pointSize : 6,lineWidth : 0});
          }
          else {
            _.extend(chartOptions.series['0'],{type : 'area'});
          }
          if (/direction/i.test(chartData[1].getColumnLabel(1))) {
            _.extend(chartOptions.series['1'],{type : 'line',pointSize : 6,lineWidth : 0});
          }
          else {
            _.extend(chartOptions.series['1'],{type : 'area'});
          }
        }
        else {
          chartOptions.series = {0 : {color : catalogView.model.get('chart0Data') ? '#0000ff' : '#ff0000'}};
          if (/direction/i.test(chartData[0].getColumnLabel(1))) {
            _.extend(chartOptions.series['0'],{type : 'line',pointSize : 6,lineWidth : 0});
          }
          else {
            _.extend(chartOptions.series['0'],{type : 'area'});
          }
        }
        catalogView.model.get('chart').clearChart();
        catalogView.model.get('chart').draw(
           chartData.length == 1 ? chartData[0] : google.visualization.data.join(chartData[0],chartData[1],'full',[[0,0]],[1,2],[1,2])
          ,chartOptions
        );
        //google.visualization.events.addListener(catalogView.model.get('chart'), 'select', catalogView.showHideSeries);
      }
    }
  },  

  extendedEncode : function(arrVals, maxVal) {
    var EXTENDED_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.';
    var EXTENDED_MAP_LENGTH = EXTENDED_MAP.length;
    var chartData = '';

    for(i = 0, len = arrVals.length; i < len; i++) {
      // In case the array vals were translated to strings.
      var numericVal = new Number(arrVals[i]);
      // Scale the value to maxVal.
      var scaledVal = Math.floor(EXTENDED_MAP_LENGTH *
          EXTENDED_MAP_LENGTH * numericVal / maxVal);

      if(scaledVal > (EXTENDED_MAP_LENGTH * EXTENDED_MAP_LENGTH) - 1) {
        chartData += "..";
      } else if (scaledVal < 0) {
        chartData += '__';
      } else {
        // Calculate first and second digits and add them to the output.
        var quotient = Math.floor(scaledVal / EXTENDED_MAP_LENGTH);
        var remainder = scaledVal - EXTENDED_MAP_LENGTH * quotient;
        chartData += EXTENDED_MAP.charAt(quotient) + EXTENDED_MAP.charAt(remainder);
      }
    }
    return chartData;
  },

  showSpinner : function() {
    $('#catalog').spin({
      lines: 12, // The number of lines to draw
      length: 15, // The length of each line
      width: 8, // The line thickness
      radius: 22, // The radius of the inner circle
      corners: 1, // Corner roundness (0..1)
      rotate: 0, // The rotation offset
      direction: 1, // 1: clockwise, -1: counterclockwise
      color: '#000', // #rgb or #rrggbb or array of colors
      speed: .6, // Rounds per second
      trail: 60, // Afterglow percentage
      shadow: true, // Whether to render a shadow
      hwaccel: false, // Whether to use hardware acceleration
      className: 'spinner', // The CSS class to assign to the spinner
      zIndex: 2e9, // The z-index (defaults to 2000000000)
      top: '40%', // Top position relative to parent
      left: '50%' // Left position relative to parent
    });
  }
});
