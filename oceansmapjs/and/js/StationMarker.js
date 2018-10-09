L.StationMarker = L.CircleMarker.extend({
    _openPopup: function (e) {
		this._popup.setLatLng(e.latlng);
		//only showing vertical profile data for water column data
		if(this.feature.properties.params.search('current_speed')> -1){
			//this._map.openPopup(this._popup);
			//this keeps the popup on the map
			this._map.addLayer(this._popup);
		}
		mapView.get_station_click(this.feature);
	}
});
