/******************************************************************************
* Project: SOS
* Module:  SOS.js
* Purpose: Core library of the SOS project
* Author:  Paul M. Breen
* Date:    2012-12-12
* Id:      $Id$
******************************************************************************/

/**
 * SOS
 *
 * @fileOverview SOS Class, built on the OpenLayers SOS support
 * @name SOS
 */

/* The SOS object is built on top of OpenLayers */
if(typeof OpenLayers !== "undefined" && OpenLayers !== null) {

  /* Create the SOS namespace */
  if(typeof SOS === "undefined") {
    /* Enable internationalisation of all error messages */
    OpenLayers.Lang.setCode("en");
    OpenLayers.Util.extend(OpenLayers.Lang.en, {
      "SOSGetCapabilitiesErrorMessage": "SOS Get Capabilities failed: ",
      "SOSGetLatestObservationsErrorMessage": "SOS Get Latest Observations failed: ",
      "SOSGetObservationsErrorMessage": "SOS Get Observations failed: ",
      "SOSGetFeatureOfInterestErrorMessage": "SOS Get Feature Of Interest failed: ",
      "SOSGetFeatureOfInterestTimeErrorMessage": "SOS Get Feature Of Interest Time failed: ",
      "SOSDescribeSensorErrorMessage": "SOS Describe Sensor failed: "
    });

    /* This library uses a proxy host.  Change the path accordingly */
    OpenLayers.ProxyHost = "http://map.asascience.com/EGDataViewer/Scripts/proxy.php?";

    /**
     * SOS Class
     */
    var SOS = OpenLayers.Class({
      url: null,
      events: null,
      capsFormatter: null,
      obsFormatter: null,
      foiFormatter: null,
      foiTimeFormatter: null,
      sensorDescFormatter: null,
      config: null,
      CLASS_NAME: "SOS",

      /**
       * Constructor for a SOS object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.events = new OpenLayers.Events(this);
        this.capsFormatter = new OpenLayers.Format.SOSCapabilities();
        this.obsFormatter = new OpenLayers.Format.SOSGetObservation();
        this.foiFormatter = new OpenLayers.Format.SOSGetFeatureOfInterest();
        this.foiTimeFormatter = new OpenLayers.Format.SOSGetFeatureOfInterestTime();
        this.sensorDescFormatter = new OpenLayers.Format.SOSDescribeSensor();
        this.config = {
          /* N.B.: Our SOS instance (52n) fails unless version is 1.0.0 */
          version: "1.0.0",
          async: true,
          observation: {
            responseFormatType: "text/xml",
            responseFormat: "text/xml;subtype=\"om/1.0.0\"",
            eventTimeLatest: "latest",
            eventTimeFirst: "getFirst",
            resultModel: "om:Measurement",
            responseMode: "inline",
            forceSort: true
          }
        };
        OpenLayers.Util.extend(this, options);
      },

      /**
       * Destructor for a SOS object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Copy mandatory properties from 'this' to the given object
       */
      copyMandatoryObjectProperties: function(obj) {
        if(typeof obj === "object") {
          obj.config = this.config;
          obj.url = this.url;
        }

        return obj;
      },

      /**
       * Register a user-supplied function as an event handler
       */
      registerUserCallback: function(params) {
        if(SOS.Utils.isValidObject(params)) {
          if(typeof params.event === "string" && typeof params.callback === "function") {
            if(!SOS.Utils.isValidObject(params.scope)) {
              params.scope = this;
            }
            this.events.register(params.event, params.scope, params.callback);
          }
        }
      },

      /**
       * Unregister a previously assigned event handler
       */
      unregisterUserCallback: function(params) {
        if(SOS.Utils.isValidObject(params)) {
          if(typeof params.event === "string" && typeof params.callback === "function") {
            if(!SOS.Utils.isValidObject(params.scope)) {
              params.scope = this;
            }
            this.events.unregister(params.event, params.scope, params.callback);
          }
        }
      },

      /**
       * Request the capabilities document from the SOS
       */
      getCapabilities: function(callback) {
        var params = {"service": "SOS", "request": "GetCapabilities", "AcceptVersions": this.config.version};
        var paramString = OpenLayers.Util.getParameterString(params);
        //var url = OpenLayers.Util.urlAppend(this.url, paramString);
        var url = this.url;
        
        // Optionally the caller can register a callback for the caps request
        if(arguments.length > 0) {
          this.registerUserCallback({event: "sosCapsAvailable", scope: this, callback: callback});
        }

        OpenLayers.Request.GET({
          url: url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSGetCapabilitiesErrorMessage") + url);
          },
          success: this._parseCapabilities
        });
      },

      /**
       * Parse the capabilities document of the SOS & notify any listeners
       */
      _parseCapabilities: function(response) {
        this.SOSCapabilities = this.capsFormatter.read(response.responseXML || response.responseText);
        this.setObservationResponseFormatFromTypeSuggestion(this.config.observation.responseFormatType);
        this.events.triggerEvent("sosCapsAvailable", {response: response});
      },

      /**
       * Validate the internal capabilities object
       */
      haveValidCapabilitiesObject: function() {
        return SOS.Utils.isValidObject(this.SOSCapabilities);
      },

      /**
       * Set the config.observation.responseFormat member to an available
       * format of the given type, parsed from the capabilities object
       */
      setObservationResponseFormatFromTypeSuggestion: function(type) {
        if(this.haveValidCapabilitiesObject()) {
          if(SOS.Utils.isValidObject(this.SOSCapabilities.operationsMetadata)) {
            for(var format in this.SOSCapabilities.operationsMetadata.GetObservation.parameters.responseFormat.allowedValues) {
              if(format.indexOf(type) >= 0) {
                this.config.observation.responseFormat = format;
                break;
              }
            }
          }
        }
      },

      /**
       * Get the (raw) offering list
       */
      getOfferingList: function() {
        return (this.haveValidCapabilitiesObject() ? this.SOSCapabilities.contents.offeringList : null);
      },

      /**
       * Get the offering IDs
       */
      getOfferingIds: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.SOSCapabilities.contents.offeringList) {
            result.push(id);
          }
        }

        return result;
      },

      /**
       * Get the offering names
       */
      getOfferingNames: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.SOSCapabilities.contents.offeringList) {
            result.push(this.SOSCapabilities.contents.offeringList[id].name);
          }
        }

        return result;
      },

      /**
       * Get an SOS.Offering object given an offering ID
       */
      getOffering: function(id) {
        var offering;

        if(this.haveValidCapabilitiesObject()) {
          var o = this.SOSCapabilities.contents.offeringList[id];

          if(SOS.Utils.isValidObject(o)) {
            o.id = id;
            this.copyMandatoryObjectProperties(o);
            offering = new SOS.Offering(o);
          }
        }

        return offering;
      },

      /**
       * Get the feature-of-interest (FOI) IDs
       */
      getFeatureOfInterestIds: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.SOSCapabilities.contents.offeringList) {
            var offering = this.SOSCapabilities.contents.offeringList[id];
            result = result.concat(offering.featureOfInterestIds);
          }
          result = SOS.Utils.getUniqueList(result);
        }

        return result;
      },

      /**
       * Get a list of SOS.Offering objects that include the given FOI
       */
      getOfferingsForFeatureOfInterestId: function(foiId) {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var offId in this.SOSCapabilities.contents.offeringList) {
            var o = this.SOSCapabilities.contents.offeringList[offId];

            if(OpenLayers.Util.indexOf(o.featureOfInterestIds, foiId) > -1) {
              o.id = offId;
              this.copyMandatoryObjectProperties(o);
              result.push(new SOS.Offering(o));
            }
          }
        }

        return result;
      },

      /**
       * Get the latest observations for a given FOI
       */
      getLatestObservationsForFeatureOfInterestId: function(foiId) {
        if(this.haveValidCapabilitiesObject()) {
          // If foiId is set, then it's sent in latest obs request
          this.foiId = foiId;
          var offerings = this.getOfferingsForFeatureOfInterestId(foiId);

          // Get obs for any offerings that have the given FOI
          for(var i = 0, len = offerings.length; i < len; i++) {
            this.getLatestObservationsForOffering(offerings[i]);
          }
        }
      },

      /**
       * Get the latest observations for a given SOS.Offering object
       */
      getLatestObservationsForOffering: function(offering) {
        /* Build the request document.  Only offering, observedProperties,
           and responseFormat are mandatory */
        var params = {
          eventTime: this.config.observation.eventTimeLatest,
          resultModel: this.config.observation.resultModel,
          responseMode: this.config.observation.responseMode,
          responseFormat: this.config.observation.responseFormat,
          offering: offering.id,
          observedProperties: offering.observedProperties
        };
        if(this.foiId) {
          params.foi = {objectId: this.foiId};
        }
        var xml = this.obsFormatter.write(params);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSGetLatestObservationsErrorMessage") + this.url);
          },
          success: this._parseLatestObservations,
          data: xml
        });
      },

      /**
       * Parse the latest observations result & notify any listeners
       */
      _parseLatestObservations: function(response) {
        this.SOSObservations = this.obsFormatter.read(response.responseXML || response.responseText);
        // Result is unsorted so we can optionally ensure a default sort order
        if(this.config.observation.forceSort) {
          this.SOSObservations.measurements.sort(this._sortObservations);
        }
        this.events.triggerEvent("sosLatestObsAvailable", {response: response});
      },

      /**
       * Sort the observations result on samplingTime ascending
       */
      _sortObservations: function(a, b) {
        var ret = 0;

        if(a.samplingTime.timeInstant.timePosition < b.samplingTime.timeInstant.timePosition) {
          ret = -1;
        } else if(a.samplingTime.timeInstant.timePosition > b.samplingTime.timeInstant.timePosition) {
          ret = 1;
        }

        return ret;
      },

      /**
       * Construct a GML time period given start and end datetimes
       */
      constructGmlTimeperiod: function(start, end) {
        // We slightly increase the time interval to make it inclusive
        var t = SOS.Utils.isoToTimeInterval(start, end);
        t = SOS.Utils.adjustTimeInterval(t, -1, 1);

        /* N.B.: The "inclusive" attribute isn't implemented in the 52n SOS so
                 this is an open interval, in the strict mathematical sense.
                 Hence the need to broaden the given time interval, above */
        var s = "<eventTime>" +
                  "<ogc:TM_During>" +
                    "<ogc:PropertyName>om:samplingTime</ogc:PropertyName>" +
                    "<gml:TimePeriod>" +
                      "<gml:beginPosition>" + t.start.toISOString() + "</gml:beginPosition>" +
                      "<gml:endPosition>" + t.end.toISOString() + "</gml:endPosition>" +
                    "</gml:TimePeriod>" +
                  "</ogc:TM_During>" +
                "</eventTime>";

        return s;
      },

      /**
       * Insert a GML time period into the given request for the given start
       * and end datetimes
       */
      insertGmlTimeperiodInRequest: function(xml, start, end) {
        var timeperiodXml = this.constructGmlTimeperiod(start, end);
        xml = xml.replace("xmlns:ogc=\"http://www.opengis.net/ogc\"", "xmlns:ogc=\"http://www.opengis.net/ogc\" xmlns:gml=\"http://www.opengis.net/gml\"");
        xml = xml.replace("<eventTime/>", timeperiodXml);

        return xml;
      },

      /**
       * Get requested observations for a given SOS.Offering object
       * between given start and end datetimes
       */
      getObservationsForOffering: function(offering, start, end, property) {
        /* Build the request document.  Note that the GML time period is
           missing in the OL formatter, so we have to insert it */
        var t = SOS.Utils.isoToTimeInterval(start, end);
        function pad(number) {
          var r = String(number);
          if(r.length === 1) {
            r = '0' + r;
          }
          return r;
        }
        var s = t.start.getUTCFullYear()
            + '-' + pad(t.start.getUTCMonth() + 1)
            + '-' + pad(t.start.getUTCDate())
            + 'T' + pad(t.start.getUTCHours())
            + ':' + pad(t.start.getUTCMinutes())
            + ':' + pad(t.start.getUTCSeconds())
            + 'Z';
        var e = t.end.getUTCFullYear()
            + '-' + pad(t.end.getUTCMonth() + 1)
            + '-' + pad(t.end.getUTCDate())
            + 'T' + pad(t.end.getUTCHours())
            + ':' + pad(t.end.getUTCMinutes())
            + ':' + pad(t.end.getUTCSeconds())
            + 'Z';
        var params = {
          eventtime: s+'/'+e,
          //resultModel: this.config.observation.resultModel,
          //responseMode: this.config.observation.responseMode,
          responseFormat: 'text/csv',//this.config.observation.responseFormat,
          offering: offering.name,
          version: '1.0.0',
          request:'GetObservation',
          service:'SOS',
          observedProperty: property
        };
        if(this.foiId) {
          params.foi = {objectId: this.foiId};
        }
        //var xml = this.obsFormatter.write(params);
        //xml = this.insertGmlTimeperiodInRequest(xml, start, end);
        OpenLayers.Request.GET({
          //url: this.url,
          url: 'http://sdf.ndbc.noaa.gov/sos/server.php?',
          //scope: this,
          //async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOS Get Observations failed: ") + this.url);
          },
          success: function(response) {
              offering.SOSObservations = SOS.Utils.csvJSON(response.responseXML || response.responseText);
              offering.events.triggerEvent("sosObsAvailable", {response: offering});
          },
          params: params
        });
      },
      /**
       * Parse the observations result & notify any listeners
       */
      _parseObservations: function(response) {
        /*this.SOSObservations = this.obsFormatter.read(response.responseXML || response.responseText);
        // Result is unsorted so we can optionally ensure a default sort order
        if(this.config.observation.forceSort) {
          this.SOSObservations.measurements.sort(this._sortObservations);
        }*/
        this.SOSObservations = SOS.Utils.csvJSON(response.responseXML || response.responseText);

        offering.events.triggerEvent("sosObsAvailable", {response: response});
      },

      /**
       * Validate the internal observations object
       */
      haveValidObservationsObject: function() {
        return SOS.Utils.isValidObject(this.SOSObservations);
      },

      /**
       * Get a count of the number of records contained in the internal
       * observations object
       */
      getCountOfObservations: function() {
        var n = 0;

        if(this.haveValidObservationsObject()) {
          if(SOS.Utils.isValidObject(this.SOSObservations.measurements)) {
            n = this.SOSObservations.measurements.length;
          }
        }

        return n;
      },

      /**
       * Get the observation for the given index from the internal
       * observations object
       */
      getObservationRecord: function(i) {
        var record = {};

        if(this.haveValidObservationsObject()) {
          record = this.SOSObservations.measurements[i];

          // Some convenience properties
          record.time = record.samplingTime.timeInstant.timePosition;
          record.observedPropertyTitle = SOS.Utils.toTitleCase(SOS.Utils.toDisplayName(SOS.Utils.urnToName(record.observedProperty)));
          record.uomTitle = SOS.Utils.toDisplayUom(record.result.uom);
        }

        return record;
      },

      /**
       * Get details for the given FOI
       */
      getFeatureOfInterest: function(foiId) {
        /* Build the request document */
        var params = {
          fois: [foiId]
        };
        var xml = this.foiFormatter.write(params);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSGetFeatureOfInterestErrorMessage") + this.url);
          },
          success: this._parseFeatureOfInterest,
          data: xml
        });
      },

      /**
       * Parse the FOI result & notify any listeners
       */
      _parseFeatureOfInterest: function(response) {
        var a = this.foiFormatter.read(response.responseXML || response.responseText);
        if(a && a.length > 0) {
          this.SOSFeatureOfInterest = a[0];
        }
        this.events.triggerEvent("sosFeatureOfInterestAvailable", {response: response});
      },

      /**
       * Get the temporal coverage for the given FOI
       */
      getTemporalCoverageForFeatureOfInterestId: function(foiId) {
        /* Build the request document */
        var params = {
          foi: foiId
        };
        var xml = this.foiTimeFormatter.write(params);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSGetFeatureOfInterestTimeErrorMessage") + this.url);
          },
          success: this._parseTemporalCoverage,
          data: xml
        });
      },

      /**
       * Parse the temporal coverage result & notify any listeners
       */
      _parseTemporalCoverage: function(response) {
        this.SOSTemporalCoverage = this.foiTimeFormatter.read(response.responseXML || response.responseText);
        this.events.triggerEvent("sosTemporalCoverageAvailable", {response: response});
      },

      /**
       * Get the description for the given procedure (sensor system)
       */
      describeSensor: function(procedureId) {
        /* Build the request document */
        var params = {
          procedure: procedureId
        };
        var xml = this.sensorDescFormatter.write(params);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSDescribeSensorErrorMessage") + this.url);
          },
          success: this._parseSensorDescription,
          data: xml
        });
      },

      /**
       * Parse the describe sensor result & notify any listeners
       */
      _parseSensorDescription: function(response) {
        this.SOSSensorDescription = this.sensorDescFormatter.read(response.responseXML || response.responseText);
        this.events.triggerEvent("sosSensorDescriptionAvailable", {response: response});
      }
    });

    /**
     * SOS.Offering Class
     *
     * Inherits from:
     *  - <SOS>
     */
    SOS.Offering = OpenLayers.Class(SOS, {
      url: null,
      events: null,
      capsFormatter: null,
      obsFormatter: null,
      config: null,
      CLASS_NAME: "SOS.Offering",

      /**
       * Constructor for a SOS.Offering object
       *
       * @constructor
       */
      initialize: function(options) {
        this.url = null;
        this.events = new OpenLayers.Events(this);
        this.capsFormatter = new OpenLayers.Format.SOSCapabilities();
        this.obsFormatter = new OpenLayers.Format.SOSGetObservation();
        this.config = {
          /* N.B.: Our SOS instance (52n) fails unless version is 1.0.0 */
          version: "1.0.0",
          async: true,
          observation: {
            responseFormatType: "text/xml",
            responseFormat: "text/xml;subtype=\"om/1.0.0\"",
            eventTimeLatest: "latest",
            eventTimeFirst: "getFirst",
            resultModel: "om:Measurement",
            responseMode: "inline",
            forceSort: true
          }
        };
        OpenLayers.Util.extend(this, options);
      },

      /**
       * Destructor for a SOS.Offering object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Get the feature-of-interest (FOI) IDs
       */
      getFeatureOfInterestIds: function() {
        return SOS.Utils.getUniqueList(this.featureOfInterestIds);
      },

      /**
       * Get the procedure IDs
       */
      getProcedureIds: function() {
        return SOS.Utils.getUniqueList(this.procedures);
      },

      /**
       * Get the observed property IDs
       */
      getObservedPropertyIds: function() {
        return SOS.Utils.getUniqueList(this.observedProperties);
      },

      /**
       * Get the observed property Names
       */
      getObservedPropertyNames: function() {
        return SOS.Utils.urnToName(SOS.Utils.getUniqueList(this.observedProperties));
      },

      /**
       * Filter this offering's observed properties list via URNs or names
       */
      filterObservedProperties: function(list) {
        if(!SOS.Utils.isArray(list)) {
          list = [list];
        }
        /* list can be URNs or names.  Ensure we have URNs only.  If we've
           already filtered, we must use the stored original list of URNs */
        var masterList = (SOS.Utils.isValidObject(this.observedPropertiesOriginal) ? this.observedPropertiesOriginal : this.observedProperties);
        var urns = SOS.Utils.lookupUrnFromName(list, masterList);

        // Store original list of observed properties so it can be restored
        if(!SOS.Utils.isValidObject(this.observedPropertiesOriginal)) {
          this.observedPropertiesOriginal = this.observedProperties;
        }
        this.observedProperties = urns;
      },

      /**
       * Reset this offering's observed properties list to an unfiltered state
       */
      unfilterObservedProperties: function() {
        if(SOS.Utils.isValidObject(this.observedPropertiesOriginal)) {
          this.observedProperties = this.observedPropertiesOriginal;
          delete this.observedPropertiesOriginal;
        }
      },

      /**
       * Get latest observations for observed properties of this offering
       */
      getLatestObservations: function(callback) {
        // Optionally the caller can register a callback for the obs request
        if(arguments.length > 0) {
          this.registerUserCallback({event: "sosLatestObsAvailable", scope: this, callback: callback});
        }

        // Inherited from SOS parent class
        this.getLatestObservationsForOffering(this);
      },

      /**
       * Get observations for observed properties of this offering between the
       * given start and end datetimes
       */
      getObservations: function(property, start, end, callback) {
        // Optionally the caller can register a callback for the obs request
        if(arguments.length > 2) {
          this.registerUserCallback({event: "sosObsAvailable", scope: this, callback: callback});
        }

        // Inherited from SOS parent class
        this.getObservationsForOffering(this, start, end,property);
      }
    });

    /**
     * SOS.Utils namespace.  Utility functions for SOS classes
     */
    SOS.Utils = {
      uomDisplayTitles: {
        "Cel": "&deg;C",
        "deg": "&deg;",
        "m/s": "m s<sup>-1</sup>"
      },

      nonPrintingCharacterLabels: {
        ' ': "(space)",
        '\t': "(tab)",
        '\n': "(newline)",
        '\r\n': "(carriage return/newline)",
        '\r': "(carriage return)"
      },

      isValidObject: function(x) {
        return (typeof x !== "undefined" && x !== null);
      },

      isArray: function(x) {
        return (Object.prototype.toString.call(x) === "[object Array]");
      },

      isNumber: function(x) {
        return (!isNaN(parseFloat(x)) && isFinite(x));
      },

      csvJSON: function(csv){
          var lines=csv.split("\n");
          var result = [];
          var headers=lines[0].split(",");
 
          for(var i=1;i<lines.length;i++){
 
            var obj = {};
            var currentline=lines[i].split(",");
 
            for(var j=0;j<headers.length;j++){
              obj[headers[j]] = currentline[j];
            }
 
            result.push(obj);
          }
  
        //return result; //JavaScript object
        return JSON.stringify(result); //JSON
       },

      getUniqueList: function(x) {
        var a = [];

        for(var i = 0, len = x.length; i < len; i++) {
          if(OpenLayers.Util.indexOf(a, x[i]) === -1) {
            a.push(x[i]);
          }
        }

        return a;
      },

      toTitleCase: function(x) {
        var y = x;

        if(typeof x == "string") {
          var a = x.split(/ /);

          for(var j = 0, len = a.length; j < len; j++) {
            a[j] = a[j].replace(/^(.)/, function(match, $1, offset, original) {return ($1).toUpperCase();});
          }
          y = a.join(" ");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.toTitleCase(x[i]));
          }
        }

        return y;
      },

      toDisplayName: function(x) {
        var y = x;

        if(typeof x == "string") {
          y = x.replace(/_/g, " ");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.toDisplayName(x[i]));
          }
        }

        return y;
      },

      urnToName: function(x) {
        var y = x;

        if(typeof x == "string") {
          y = x.replace(/^.*:/, "");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.urnToName(x[i]));
          }
        }

        return y;
      },

      lookupUrnFromName: function(x, a) {
        var y = x;

        if(typeof x == "string") {
          for(var i = 0, len = a.length; i < len; i++) {
            if(this.urnToName(a[i]) === x) {
              y = a[i];
              break;
            }
          }
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.lookupUrnFromName(x[i], a));
          }
        }

        return y;
      },

      toDisplayUom: function(x) {
        var y = x;

        /* SOS units are encoded according to Unified Code for Units of Measure
           (UCUM).  See http://unitsofmeasure.org/ */
        if(this.isValidObject(this.uomDisplayTitles)) {
          if(typeof x == "string") {
            if(this.uomDisplayTitles[x]) {
              y = this.uomDisplayTitles[x];
            }
          } else if(this.isArray(x)) {
            y = [];

            for(var i = 0, len = x.length; i < len; i++) {
              y.push(this.toDisplayUom(x[i]));
            }
          }
        }

        return y;
      },

      nonPrintingCharacterToLabel: function(x) {
        var y = x;

        if(this.isValidObject(this.nonPrintingCharacterLabels)) {
          if(typeof x == "string") {
            if(this.nonPrintingCharacterLabels[x]) {
              y = this.nonPrintingCharacterLabels[x];
            }
          } else if(this.isArray(x)) {
            y = [];

            for(var i = 0, len = x.length; i < len; i++) {
              y.push(this.nonPrintingCharacterToLabel(x[i]));
            }
          }
        }

        return y;
      },

      newlineToBr: function(x) {
        var y = x;

        if(typeof x == "string") {
          y = x.replace(/(\r\n|\n|\r)/g, "<br/>");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.newlineToBr(x[i]));
          }
        }

        return y;
      },

      isoToDateObject: function(x) {
        var y = x;

        // Example datetime string: 2012-01-01T01:00:00.000Z (or date only)
        if(typeof x == "string") {
          var a = x.split(/T/);
          if(a.length < 2) {a[1] = "00:00:00.00Z";}
          var d = a[0].split(/-/);
          a[1] = a[1].replace(/Z$/, "");
          var t = a[1].split(/:/);
          var ms = t[2].replace(/^\d+\./, "");
          t[2] = t[2].replace(/\.\d+$/, "");

          y = new Date(Date.UTC(parseInt(d[0], 10),
                       parseInt(d[1]-1, 10),
                       parseInt(d[2], 10),
                       parseInt(t[0], 10),
                       parseInt(t[1], 10),
                       parseInt(t[2], 10),
                       parseInt(ms, 10)));
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.isoToDateObject(x[i]));
          }
        }

        return y;
      },

      isoToJsTimestamp: function(x) {
        var y = x;

        if(typeof x == "string") {
          var D = this.isoToDateObject(x);
          y = D.getTime();
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.isoToJsTimestamp(x[i]));
          }
        }

        return y;
      },

      jsTimestampToIso: function(x) {
        var y = x;

        if(typeof x == "string" || typeof x == "number") {
          var D = new Date(x);
          y = D.toISOString();
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.jsTimestampToIso(x[i]));
          }
        }

        return y;
      },

      isoToTimeInterval: function(start, end) {
        var t = {start: null, end: null};

        t.start = this.isoToDateObject(start);
        t.end = this.isoToDateObject(end);

        return t;
      },

      adjustTimeInterval: function(t, startOffset, endOffset) {
        t.start.setTime(t.start.getTime() + startOffset);
        t.end.setTime(t.end.getTime() + endOffset);

        return t;
      },

      parseRelativeTime: function(x) {
        var t = {start: null, end: null};
        var local = new Date();
        var T = local.getTime();
        var s = x;
        var u = 0, c = 0, d = 0;

        // N.B.: We get local time but always use the getUTC* methods

        t.start = new Date(T);
        t.end = new Date(T);

        // For convenience we accept today, yesterday, current*, & previous*
        s = s.replace(/to|current/i, "this");
        s = s.replace(/yester|previous/i, "last");

        if((/hour$/i).test(s)) {
          u = 60 * 60 * 1000;
          c = T % u;
        }
        if((/day$/i).test(s)) {
          u = 24 * 60 * 60 * 1000;
          c = T % u;
        }
        if((/week$/i).test(s)) {
          d = 24 * 60 * 60 * 1000;
          u = 7 * 24 * 60 * 60 * 1000;
          c = local.getUTCDay() * d + T % d;
        }
        if((/month$/i).test(s)) {
          d = 24 * 60 * 60 * 1000;
          u = 31 * 24 * 60 * 60 * 1000;
          c = (local.getUTCDate() - 1) * d + T % d;
        }
        if((/year$/i).test(s)) {
          d = 24 * 60 * 60 * 1000;
          u = 366 * 24 * 60 * 60 * 1000;
          c = (local.getUTCDayOfYear() - 1) * d + T % d;
        }

        if((/^this/i).test(s)) {
          this.adjustTimeInterval(t, - c, - c + u - 1);
        }
        if((/^last/i).test(s)) {
          this.adjustTimeInterval(t, - c - u, - c - 1);
        }
        if((/^rolling/i).test(s)) {
          this.adjustTimeInterval(t, - u, - 1);
        }

        return t;
      },

      extractColumn: function(x, n) {
        var y = [];

        if(this.isArray(x)) {
          for(var i = 0, len = x.length; i < len; i++) {
            y.push(x[i][n]);
          }
        }

        return y;
      },

      sum: function(x) {
        var y = 0;

        for(var i = 0, len = x.length; i < len; i++) {
          y += parseFloat(x[i]);
        }

        return y;
      },

      computeStats: function(x) {
        var y = {N: 0, sum: 0, min: 0, max: 0, mean: 0, median: 0, q1: 0, q3: 0, variance: 0, sd: 0};

        if(this.isArray(x) && x.length > 1) {
          y.N = x.length;
          y.sum = this.sum(x);
          y.mean = y.sum / y.N;
          y.min = Math.min.apply(null, x);
          y.max = Math.max.apply(null, x);

          // We must copy x as sort() sorts in-place
          var sorted = x.slice(0);
          sorted.sort(function(a, b) {return a - b;});

          var floor = Math.floor(y.N / 2);
          y.median = ((y.N % 2) == 0) ? this.sum(sorted.slice(floor, floor + 2)) / 2 : sorted[floor + 1];
          floor = Math.floor(y.N / 4);
          y.q1 = ((y.N % 2) == 0) ? this.sum(sorted.slice(floor, floor + 2)) / 2 : sorted[floor + 1];
          floor *= 3;
          y.q3 = ((y.N % 2) == 0) ? this.sum(sorted.slice(floor, floor + 2)) / 2 : sorted[floor + 1];

          var t = 0;

          for(var i = 0, len = x.length; i < len; i++) {
            t += Math.pow(x[i] - y.mean, 2);
          }
          y.variance = t / (y.N - 1);
          y.sd = Math.sqrt(y.variance);
        }

        return y;
      },

      computeHistogram: function(x) {
        var y = {min: 0, max: 0, lower: 0, upper: 0, nBins: 0, binWidth: 0, data: []};

        if(this.isArray(x) && x.length > 1) {
          var j = 0;
          var sorted = x.slice(0);
          sorted.sort(function(a, b) {return a - b;});
          y.min = Math.min.apply(null, sorted);
          y.max = Math.max.apply(null, sorted);
          y.lower = Math.floor(y.min);
          y.upper = Math.ceil(y.max);
          y.nBins = 10;

          if((y.upper - y.lower) > 0) {
            y.binWidth = Math.pow(10, Math.round(Math.log(y.upper - y.lower) / Math.log(10))) / y.nBins;

            for(var i = y.lower; i < y.upper; i += y.binWidth) {
              var bin = [i, 0];
              for(var len = sorted.length; j < len; j++) {
                if(sorted[j] < i + y.binWidth) {
                  bin[1]++;
                } else {
                  break;
                }
              }
              y.data.push(bin);
            }
          }
        }

        return y;
      }
    };

    /**************************************************************************
     * Overrides, bug fixes, JS engine compatibility fixups etc.
     *
     * Arbitrary code that's not strictly part of the SOS library, but
     * nonetheless required by it
     *************************************************************************/
    if(!Date.prototype.toISOString) {
      (function() {
        function pad(number) {
          var r = String(number);
          if(r.length === 1) {
            r = '0' + r;
          }
          return r;
        }
        Date.prototype.toISOString = function() {
          return this.getUTCFullYear()
            + '-' + pad(this.getUTCMonth() + 1)
            + '-' + pad(this.getUTCDate())
            + 'T' + pad(this.getUTCHours())
            + ':' + pad(this.getUTCMinutes())
            + ':' + pad(this.getUTCSeconds())
            //+ '.00' + String((this.getUTCMilliseconds()/1000).toFixed(2)).slice(2, 4)
            + 'Z';
        };
      }());
    }
    if(!Date.prototype.getUTCDayOfYear) {
      (function() {
        Date.prototype.getUTCDayOfYear = function() {
          var d = new Date(this.getUTCFullYear(), 0, 1);

          return Math.ceil((this.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
        };
      }());
    }

    /* OpenLayers formatters for parsing various SOS response documents.
       These are missing from a stock OpenLayers install */

    /**
     * Method: write
     *
     * Parameters:
     * options - {Object} Optional object.
     *
     * Returns:
     * {String} An SOS GetFeatureOfInterest request XML string.
     */
    OpenLayers.Format.SOSGetFeatureOfInterest.prototype.write = function(options) {
        /* N.B.: Some of the namespaces are missing from the original OL class,
                 hence they're explicitly specified here */
        this.namespaces.ows = this.namespaces.ows || "http://www.opengis.net/ows";
        this.namespaces.ogc = this.namespaces.ogc || "http://www.opengis.net/ogc";

        var node = this.writeNode("sos:GetFeatureOfInterest", options);
        node.setAttribute("xmlns:ows", this.namespaces.ows);
        node.setAttribute("xmlns:ogc", this.namespaces.ogc);
        node.setAttribute("xmlns:gml", this.namespaces.gml);
        this.setAttributeNS(
            node, this.namespaces.xsi,
            "xsi:schemaLocation", this.schemaLocation
        );
        return OpenLayers.Format.XML.prototype.write.apply(this, [node]);
    } 

    /**
     * @requires OpenLayers/Format/XML.js
     * @requires OpenLayers/Format/GML/v3.js
     */

    /**
     * Class: OpenLayers.Format.SOSGetFeatureOfInterestTime
     * Read and write SOS GetFeatureOfInterestTime. This is used to get temporal
     * coverage of the features (stations). The stations can have 1 or more
     * sensors.
     *
     * Inherits from:
     *  - <OpenLayers.Format.XML>
     */
    OpenLayers.Format.SOSGetFeatureOfInterestTime = OpenLayers.Class(OpenLayers.Format.XML, {
        
        /**
         * Constant: VERSION
         * {String} 1.0.0
         */
        VERSION: "1.0.0",

        /**
         * Property: namespaces
         * {Object} Mapping of namespace aliases to namespace URIs.
         */
        namespaces: {
            sos: "http://www.opengis.net/sos/1.0",
            ogc: "http://www.opengis.net/ogc",
            ows: "http://www.opengis.net/ows",
            gml: "http://www.opengis.net/gml",
            xsi: "http://www.w3.org/2001/XMLSchema-instance"
        },

        /**
         * Property: schemaLocation
         * {String} Schema location
         */
        schemaLocation: "http://www.opengis.net/sos/1.0 http://schemas.opengis.net/sos/1.0.0/sosGetFeatureOfInterest.xsd",

        /**
         * Property: defaultPrefix
         */
        defaultPrefix: "sos",

        /**
         * Property: regExes
         * Compiled regular expressions for manipulating strings.
         */
        regExes: {
            trimSpace: (/^\s*|\s*$/g),
            removeSpace: (/\s*/g),
            splitSpace: (/\s+/),
            trimComma: (/\s*,\s*/g)
        },
        
        /**
         * Constructor: OpenLayers.Format.SOSGetFeatureOfInterest
         *
         * Parameters:
         * options - {Object} An optional object whose properties will be set on
         *     this instance.
         */

        /**
         * APIMethod: read
         * Parse a GetFeatureOfInterest response and return an array of features
         * 
         * Parameters: 
         * data - {String} or {DOMElement} data to read/parse.
         *
         * Returns:
         * {Array(<OpenLayers.Feature.Vector>)} An array of features. 
         */
        read: function(data) {
            if(typeof data == "string") {
                data = OpenLayers.Format.XML.prototype.read.apply(this, [data]);
            }
            if(data && data.nodeType == 9) {
                data = data.documentElement;
            }
            var info = {};
            this.readNode(data, info);
            return info;
        },

        /**
         * Method: write
         *
         * Parameters:
         * options - {Object} Optional object.
         *
         * Returns:
         * {String} An SOS GetFeatureOfInterestTime request XML string.
         */
        write: function(options) {
            var node = this.writeNode("sos:GetFeatureOfInterestTime", options);
            node.setAttribute("xmlns:ows", this.namespaces.ows);
            node.setAttribute("xmlns:ogc", this.namespaces.ogc);
            node.setAttribute("xmlns:gml", this.namespaces.gml);
            this.setAttributeNS(
                node, this.namespaces.xsi,
                "xsi:schemaLocation", this.schemaLocation
            );
            return OpenLayers.Format.XML.prototype.write.apply(this, [node]);
        }, 

        /**
         * Property: readers
         * Contains public functions, grouped by namespace prefix, that will
         *     be applied when a namespaced node is found matching the function
         *     name.  The function will be applied in the scope of this parser
         *     with two arguments: the node being read and a context object passed
         *     from the parent.
         */
        readers: {
            "gml": OpenLayers.Util.applyDefaults({
                "TimePeriod": function(node, obj) {
                    var timePeriod = {};
                    obj.timePeriod = timePeriod;
                    this.readChildNodes(node, timePeriod);
                },
                "beginPosition": function(node, timePeriod) {
                    timePeriod.beginPosition = this.getChildValue(node);
                },
                "endPosition": function(node, timePeriod) {
                    timePeriod.endPosition = this.getChildValue(node);
                }
            }, OpenLayers.Format.GML.v3.prototype.readers.gml)
        },

        /**
         * Property: writers
         * As a compliment to the readers property, this structure contains public
         *     writing functions grouped by namespace alias and named like the
         *     node names they produce.
         */
        writers: {
            "sos": {
                "GetFeatureOfInterestTime": function(options) {
                    var node = this.createElementNSPlus("GetFeatureOfInterestTime", {
                        attributes: {
                            version: this.VERSION,
                            service: 'SOS',
                            "xsi:schemaLocation": this.schemaLocation
                        } 
                    }); 
                    if (options.foi) {
                        this.writeNode("FeatureOfInterestId", {foi: options.foi}, node);
                    }
                    return node; 
                },
                "FeatureOfInterestId": function(options) {
                    var node = this.createElementNSPlus("FeatureOfInterestId", {value: options.foi});
                    return node;
                }
            }
        },

        CLASS_NAME: "OpenLayers.Format.SOSGetFeatureOfInterestTime"
    });

    /**
     * @requires OpenLayers/Format/XML.js
     */

    /**
     * Class: OpenLayers.Format.SOSDescribeSensor
     * Read and write SOS DescribeSensor (to get metadata for a sensor system) 
     *     version 1.0.0
     *
     * Inherits from:
     *  - <OpenLayers.Format.XML>
     */
    OpenLayers.Format.SOSDescribeSensor = OpenLayers.Class(OpenLayers.Format.XML, {

        /**
         * Property: namespaces
         * {Object} Mapping of namespace aliases to namespace URIs.
         */
        namespaces: {
            sos: "http://www.opengis.net/sos/1.0",
            sml: "http://www.opengis.net/sensorML/1.0.1",
            swe: "http://www.opengis.net/swe/1.0.1",
            gml: "http://www.opengis.net/gml",
            xlink: "http://www.w3.org/1999/xlink",
            xsi: "http://www.w3.org/2001/XMLSchema-instance"
        },

        /**
         * Property: regExes
         * Compiled regular expressions for manipulating strings.
         */
        regExes: {
            trimSpace: (/^\s*|\s*$/g),
            removeSpace: (/\s*/g),
            splitSpace: (/\s+/),
            trimComma: (/\s*,\s*/g)
        },

        /**
         * Constant: VERSION
         * {String} 1.0.0
         */
        VERSION: "1.0.0",

        /**
         * Property: schemaLocation
         * {String} Schema location
         */
        schemaLocation: "http://www.opengis.net/sos/1.0 http://schemas.opengis.net/sos/1.0.0/sosDescribeSensor.xsd",

        /**
         * Property: outputFormat
         * {String} Output format
         */
        outputFormat: "text/xml;subtype=\"sensorML/1.0.1\"",

        /**
         * Property: defaultPrefix
         */
        defaultPrefix: "sos",

        /**
         * Constructor: OpenLayers.Format.SOSDescribeSensor
         *
         * Parameters:
         * options - {Object} An optional object whose properties will be set on
         *     this instance.
         */

        /**
         * Method: read
         * 
         * Parameters: 
         * data - {String} or {DOMElement} data to read/parse.
         *
         * Returns:
         * {Object} An object containing the sensor system(s) description
         */
        read: function(data) {
            if(typeof data == "string") {
                data = OpenLayers.Format.XML.prototype.read.apply(this, [data]);
            }
            if(data && data.nodeType == 9) {
                data = data.documentElement;
            }
            var info = {members: []};
            this.readNode(data, info);
            return info;
        },

        /**
         * Method: write
         *
         * Parameters:
         * options - {Object} Optional object.
         *
         * Returns:
         * {String} An SOS DescribeSensor request XML string.
         */
        write: function(options) {
            var node = this.writeNode("sos:DescribeSensor", options);
            node.setAttribute("outputFormat", this.outputFormat);
            this.setAttributeNS(
                node, this.namespaces.xsi,
                "xsi:schemaLocation", this.schemaLocation
            );
            return OpenLayers.Format.XML.prototype.write.apply(this, [node]);
        }, 

        /**
         * Property: readers
         * Contains public functions, grouped by namespace prefix, that will
         *     be applied when a namespaced node is found matching the function
         *     name.  The function will be applied in the scope of this parser
         *     with two arguments: the node being read and a context object passed
         *     from the parent.
         */
        readers: {
            "sml": {
                "SensorML": function(node, obj) {
                    this.readChildNodes(node, obj);
                },
                "member": function(node, obj) {
                    var member = {};
                    obj.members.push(member);
                    this.readChildNodes(node, member);
                },
                "System": function(node, member) {
                    var system = {
                      id: this.getAttributeNS(node, this.namespaces.gml, "id"),
                      description: null
                    };
                    member.system = system;
                    this.readChildNodes(node, system);
                },
                "identification": function(node, system) {
                    var identification = {};
                    system.identification = identification;
                    this.readChildNodes(node, identification);
                },
                "IdentifierList": function(node, identification) {
                    identification.identifierList = [];
                    this.readChildNodes(node, identification.identifierList);
                },
                "identifier": function(node, identifierList) {
                    var identifier = {
                      name: node.getAttribute("name"),
                      term: {}
                    };
                    identifierList.push(identifier);
                    this.readChildNodes(node, identifier);
                },
                "classification": function(node, system) {
                    var classification = {};
                    system.classification = classification;
                    this.readChildNodes(node, classification);
                },
                "ClassifierList": function(node, classification) {
                    classification.classifierList = [];
                    this.readChildNodes(node, classification.classifierList);
                },
                "classifier": function(node, classifierList) {
                    var classifier = {
                      name: node.getAttribute("name"),
                      term: {}
                    };
                    classifierList.push(classifier);
                    this.readChildNodes(node, classifier);
                },
                "Term": function(node, obj) {
                    obj.term.definition = node.getAttribute("definition");
                    this.readChildNodes(node, obj);
                },
                "value": function(node, obj) {
                    obj.term.value = this.getChildValue(node);
                },
                "capabilities": function(node, system) {
                    var capabilities = {};
                    system.capabilities = capabilities;
                    this.readChildNodes(node, capabilities);
                },
                "position": function(node, system) {
                    var position = {
                      name: node.getAttribute("name")
                    };
                    system.position = position;
                    this.readChildNodes(node, position);
                },
                "inputs": function(node, system) {
                    var inputs = {};
                    system.inputs = inputs;
                    this.readChildNodes(node, inputs);
                },
                "InputList": function(node, inputs) {
                    inputs.inputList = [];
                    this.readChildNodes(node, inputs.inputList);
                },
                "input": function(node, inputList) {
                    /* N.B.: The content object of an input could be a
                             swe:ObservableProperty or swe:Quantity */
                    var input = {
                      name: node.getAttribute("name"),
                      quantity: {},
                      observableProperty: {}
                    };
                    inputList.push(input);
                    this.readChildNodes(node, input);
                },
                "outputs": function(node, system) {
                    var outputs = {};
                    system.outputs = outputs;
                    this.readChildNodes(node, outputs);
                },
                "OutputList": function(node, outputs) {
                    outputs.outputList = [];
                    this.readChildNodes(node, outputs.outputList);
                },
                "output": function(node, outputList) {
                    var output = {
                      name: node.getAttribute("name"),
                      quantity: {}
                    };
                    outputList.push(output);
                    this.readChildNodes(node, output);
                },
                "offering": function(node, obj) {
                    this.readChildNodes(node, obj);
                },
                "id": function(node, obj) {
                    obj.id = this.getChildValue(node);
                },
                "name": function(node, obj) {
                    obj.name = this.getChildValue(node);
                }
            },
            "swe": {
                "SimpleDataRecord": function(node, obj) {
                    var record = {
                      fields: []
                    };
                    obj.record = record;
                    this.readChildNodes(node, record.fields);
                },
                "Record": function(node, obj) {
                    var record = {
                      fields: []
                    };
                    obj.record = record;
                    this.readChildNodes(node, record.fields);
                },
                "field": function(node, fields) {
                    var field = {
                      name: node.getAttribute("name"),
                      quantity: {},
                      text: {},
                      category: {},
                      count: {}
                    };
                    fields.push(field);
                    this.readChildNodes(node, field);
                },
                "Text": function(node, obj) {
                    obj.text.definition = node.getAttribute("definition");
                    this.readChildNodes(node, obj.text);
                },
                "ObservableProperty": function(node, obj) {
                    obj.observableProperty.definition = node.getAttribute("definition");
                    this.readChildNodes(node, obj.observableProperty);
                },
                "Quantity": function(node, obj) {
                    obj.quantity.definition = node.getAttribute("definition");
                    obj.quantity.axisId = node.getAttribute("axisID");
                    this.readChildNodes(node, obj.quantity);
                },
                "description": function(node, obj) {
                    obj.description = this.getChildValue(node);
                },
                "value": function(node, obj) {
                    obj.value = this.getChildValue(node);
                },
                "uom": function(node, obj) {
                    obj.uom = node.getAttribute("code");
                },
                "Position": function(node, obj) {
                    obj.referenceFrame = node.getAttribute("referenceFrame");
                    var location = {};
                    obj.location = location;
                    this.readChildNodes(node, obj.location);
                },
                "location": function(node, obj) {
                    this.readChildNodes(node, obj);
                },
                "Vector": function(node, obj) {
                    var vector = {
                      id: this.getAttributeNS(node, this.namespaces.gml, "id"),
                      coordinates: []
                    };
                    obj.vector = vector;
                    this.readChildNodes(node, vector.coordinates);
                },
                "coordinate": function(node, coordinates) {
                    var coordinate = {
                      name: node.getAttribute("name"),
                      quantity: {}
                    };
                    coordinates.push(coordinate);
                    this.readChildNodes(node, coordinate);
                }
            },
            "gml": {
                "metaDataProperty": function(node, obj) {
                    var metadataProperty = {};
                    obj.metadataProperty = metadataProperty;
                    this.readChildNodes(node, metadataProperty);
                },
                "description": function(node, obj) {
                    obj.description = this.getChildValue(node);
                }
            }
        },

        /**
         * Property: writers
         * As a compliment to the readers property, this structure contains public
         *     writing functions grouped by namespace alias and named like the
         *     node names they produce.
         */
        writers: {
            "sos": {
                "DescribeSensor": function(options) {
                    var node = this.createElementNSPlus("DescribeSensor", {
                        attributes: {
                            version: this.VERSION,
                            service: 'SOS',
                            "xsi:schemaLocation": this.schemaLocation
                        } 
                    }); 
                    if (options.procedure) {
                        this.writeNode("procedure", {procedure: options.procedure}, node);
                    }
                    return node; 
                },
                "procedure": function(options) {
                    var node = this.createElementNSPlus("procedure", {value: options.procedure});
                    return node;
                }
            }
        },

        CLASS_NAME: "OpenLayers.Format.SOSDescribeSensor"
    });
  }
}

