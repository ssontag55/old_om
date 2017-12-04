    function addstations(self) {
        var options = {
          //live
          //dev
          url: 'http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://mapappstaging.asascience.com:8080/oceansmap65/metobs/getstations/?attr=and&mode=true&y=as'
          //data is through the contents.offeringList Object[i]
          //look at the bounds bottom and left data
        };

      function capsHandler(evt) {
        //getcaps object
        var s = evt.object.SOSCapabilities;

        //var markers = L.markerClusterGroup({maxClusterRadius: 25});
        var markers = L.layerGroup();
        var ndbcIcon = L.icon({
            iconUrl: '../images/points/warning.png',

        });

        function toolTipcreator(props){
          var stringed = "<br/><hr>Sensors:";
          for (var listPros in props){
              var obsType;
              if(props[listPros]=="winds") obsType = "• Wind";
              if(props[listPros]=="air_temperature") obsType =  "• Air Temperature";
              if(props[listPros]=="waves") obsType = "• Wave Height";
              if(props[listPros]=="sea_water_temperature") obsType = "• Water Temperature";
              if(props[listPros]=="currents") obsType = "• Current Speed";
              if(props[listPros]=="air_pressure_at_sea_level") obsType = "• Air Pressure";
              if(props[listPros]=="sea_water_salinity") obsType = "• Water Salinity";
              if(stringed == "<br/><hr><br/>Sensors:"){
                stringed = stringed + obsType;
              }
              else{
                stringed = stringed+"<br/>"+ obsType;
              }
          }
          return stringed;
        }
        //iterate through the SOS points
        for (var i in s.contents.offeringList)
        {
            //to filter out stations that don't have data for the past day
            if(s.contents.offeringList[i].time.timePeriod.endPosition == "")
            {
              var realname = (s.contents.offeringList[i].name).split(':');
              var obpropList = [];
              for (var obpt in s.contents.offeringList[i].observedProperties){
                var stripProperty = s.contents.offeringList[i].observedProperties[obpt].split('/');
                obpropList.push(stripProperty[6]);
              }
              var marker = L.marker(new L.LatLng(s.contents.offeringList[i].bounds.top, s.contents.offeringList[i].bounds.left), { title: realname[4], icon:ndbcIcon });
              //marker.bindPopup(s.contents.offeringList[i].name);
              marker.on('click',clickSOS);
              marker.attributes = obpropList;
              marker.bindLabel("Station: " + realname[4]+ '<br>Lat: '+(s.contents.offeringList[i].bounds.top).toPrecision(4) + ' Long: '+(s.contents.offeringList[i].bounds.left).toPrecision(4) + toolTipcreator(obpropList),{ direction: 'auto', className:'ndbclabeltext'});
              markers.addLayer(marker);
            }
        }

        //this.self.mapView.map.addLayer(markers);
        this.self.mapView.model.stationlayers['Stations'] = markers;        
      }

      function clickSOS(evt){
        
        //trigger map event when graphic is clicked
        var objClick = {'latlng':evt.latlng};
        mapView.map.fire('click',objClick, this);

        var resultOffering;
        resultOffering = 'TODO';//sos.getOffering('station-'+evt.target.options.title);
        if(resultOffering.time.timePeriod.endPosition == "")
        {
          var currentTime = new Date();
          var yestTime = new Date();
          yestTime.setDate(yestTime.getDate() - 2);

          // add loader
          graphView.showloading(); // $('#graphs').html("<div class='ui active large loader'>Loading</div>");

          //if user selects drop down on map, select that parameter, other wise default to first property
          //attribute found on the marker object
          var selectedObsProp = mapView.model.get('selectProperted') || evt.target.attributes[0];
          graphView.model.set('activetab', selectedObsProp);

          graphView.hideshowtabs(evt.target.attributes);
          graphView.cleargraphdata();

          evt.target.attributes.forEach(function(feature) {
            resultOffering.getObservations(feature,yestTime,currentTime,obsHandler);
          });

          if(mapView.model.get('selectProperted') != ""){
            selectedObsProp = mapView.model.get('selectProperted');
          }
//          resultOffering.getObservations(selectedObsProp,yestTime,currentTime,obsHandler);
        }

        function obsHandler(evt2){
          /*for(var i = 0, len = resultOffering.getCountOfObservations(); i < len; i++) {
            var ob = resultOffering.getObservationRecord(i);
          }*/
          var jsonreturn = JSON.parse(evt2.object.SOSObservations);
          graphView.formatndbctograph(jsonreturn);
        }
      }
};
