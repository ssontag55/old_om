if("undefined"!=typeof OpenLayers&&null!==OpenLayers&&void 0===SOS){OpenLayers.Lang.setCode("en"),OpenLayers.Util.extend(OpenLayers.Lang.en,{SOSGetCapabilitiesErrorMessage:"SOS Get Capabilities failed: ",SOSGetLatestObservationsErrorMessage:"SOS Get Latest Observations failed: ",SOSGetObservationsErrorMessage:"SOS Get Observations failed: ",SOSGetFeatureOfInterestErrorMessage:"SOS Get Feature Of Interest failed: ",SOSGetFeatureOfInterestTimeErrorMessage:"SOS Get Feature Of Interest Time failed: ",SOSDescribeSensorErrorMessage:"SOS Describe Sensor failed: "}),OpenLayers.ProxyHost="http://map.asascience.com/EGDataViewer/Scripts/proxy.php?"
var SOS=OpenLayers.Class({url:null,events:null,capsFormatter:null,obsFormatter:null,foiFormatter:null,foiTimeFormatter:null,sensorDescFormatter:null,config:null,CLASS_NAME:"SOS",initialize:function(e){this.url=null,this.events=new OpenLayers.Events(this),this.capsFormatter=new OpenLayers.Format.SOSCapabilities,this.obsFormatter=new OpenLayers.Format.SOSGetObservation,this.foiFormatter=new OpenLayers.Format.SOSGetFeatureOfInterest,this.foiTimeFormatter=new OpenLayers.Format.SOSGetFeatureOfInterestTime,this.sensorDescFormatter=new OpenLayers.Format.SOSDescribeSensor,this.config={version:"1.0.0",async:!0,observation:{responseFormatType:"text/xml",responseFormat:'text/xml;subtype="om/1.0.0"',eventTimeLatest:"latest",eventTimeFirst:"getFirst",resultModel:"om:Measurement",responseMode:"inline",forceSort:!0}},OpenLayers.Util.extend(this,e)},destroy:function(){},copyMandatoryObjectProperties:function(e){return"object"==typeof e&&(e.config=this.config,e.url=this.url),e},registerUserCallback:function(e){SOS.Utils.isValidObject(e)&&"string"==typeof e.event&&"function"==typeof e.callback&&(SOS.Utils.isValidObject(e.scope)||(e.scope=this),this.events.register(e.event,e.scope,e.callback))},unregisterUserCallback:function(e){SOS.Utils.isValidObject(e)&&"string"==typeof e.event&&"function"==typeof e.callback&&(SOS.Utils.isValidObject(e.scope)||(e.scope=this),this.events.unregister(e.event,e.scope,e.callback))},getCapabilities:function(e){var t={service:"SOS",request:"GetCapabilities",AcceptVersions:this.config.version},s=(OpenLayers.Util.getParameterString(t),this.url)
arguments.length>0&&this.registerUserCallback({event:"sosCapsAvailable",scope:this,callback:e}),OpenLayers.Request.GET({url:s,scope:this,async:this.config.async,failure:function(){alert(OpenLayers.i18n("SOSGetCapabilitiesErrorMessage")+s)},success:this._parseCapabilities})},_parseCapabilities:function(e){this.SOSCapabilities=this.capsFormatter.read(e.responseXML||e.responseText),this.setObservationResponseFormatFromTypeSuggestion(this.config.observation.responseFormatType),this.events.triggerEvent("sosCapsAvailable",{response:e})},haveValidCapabilitiesObject:function(){return SOS.Utils.isValidObject(this.SOSCapabilities)},setObservationResponseFormatFromTypeSuggestion:function(e){if(this.haveValidCapabilitiesObject()&&SOS.Utils.isValidObject(this.SOSCapabilities.operationsMetadata))for(var t in this.SOSCapabilities.operationsMetadata.GetObservation.parameters.responseFormat.allowedValues)if(t.indexOf(e)>=0){this.config.observation.responseFormat=t
break}},getOfferingList:function(){return this.haveValidCapabilitiesObject()?this.SOSCapabilities.contents.offeringList:null},getOfferingIds:function(){var e=[]
if(this.haveValidCapabilitiesObject())for(var t in this.SOSCapabilities.contents.offeringList)e.push(t)
return e},getOfferingNames:function(){var e=[]
if(this.haveValidCapabilitiesObject())for(var t in this.SOSCapabilities.contents.offeringList)e.push(this.SOSCapabilities.contents.offeringList[t].name)
return e},getOffering:function(e){var t
if(this.haveValidCapabilitiesObject()){var s=this.SOSCapabilities.contents.offeringList[e]
SOS.Utils.isValidObject(s)&&(s.id=e,this.copyMandatoryObjectProperties(s),t=new SOS.Offering(s))}return t},getFeatureOfInterestIds:function(){var e=[]
if(this.haveValidCapabilitiesObject()){for(var t in this.SOSCapabilities.contents.offeringList){var s=this.SOSCapabilities.contents.offeringList[t]
e=e.concat(s.featureOfInterestIds)}e=SOS.Utils.getUniqueList(e)}return e},getOfferingsForFeatureOfInterestId:function(e){var t=[]
if(this.haveValidCapabilitiesObject())for(var s in this.SOSCapabilities.contents.offeringList){var i=this.SOSCapabilities.contents.offeringList[s]
OpenLayers.Util.indexOf(i.featureOfInterestIds,e)>-1&&(i.id=s,this.copyMandatoryObjectProperties(i),t.push(new SOS.Offering(i)))}return t},getLatestObservationsForFeatureOfInterestId:function(e){if(this.haveValidCapabilitiesObject()){this.foiId=e
for(var t=this.getOfferingsForFeatureOfInterestId(e),s=0,i=t.length;i>s;s++)this.getLatestObservationsForOffering(t[s])}},getLatestObservationsForOffering:function(e){var t={eventTime:this.config.observation.eventTimeLatest,resultModel:this.config.observation.resultModel,responseMode:this.config.observation.responseMode,responseFormat:this.config.observation.responseFormat,offering:e.id,observedProperties:e.observedProperties}
this.foiId&&(t.foi={objectId:this.foiId})
var s=this.obsFormatter.write(t)
OpenLayers.Request.POST({url:this.url,scope:this,async:this.config.async,failure:function(){alert(OpenLayers.i18n("SOSGetLatestObservationsErrorMessage")+this.url)},success:this._parseLatestObservations,data:s})},_parseLatestObservations:function(e){this.SOSObservations=this.obsFormatter.read(e.responseXML||e.responseText),this.config.observation.forceSort&&this.SOSObservations.measurements.sort(this._sortObservations),this.events.triggerEvent("sosLatestObsAvailable",{response:e})},_sortObservations:function(e,t){var s=0
return e.samplingTime.timeInstant.timePosition<t.samplingTime.timeInstant.timePosition?s=-1:e.samplingTime.timeInstant.timePosition>t.samplingTime.timeInstant.timePosition&&(s=1),s},constructGmlTimeperiod:function(e,t){var s=SOS.Utils.isoToTimeInterval(e,t)
s=SOS.Utils.adjustTimeInterval(s,-1,1)
var i="<eventTime><ogc:TM_During><ogc:PropertyName>om:samplingTime</ogc:PropertyName><gml:TimePeriod><gml:beginPosition>"+s.start.toISOString()+"</gml:beginPosition><gml:endPosition>"+s.end.toISOString()+"</gml:endPosition></gml:TimePeriod></ogc:TM_During></eventTime>"
return i},insertGmlTimeperiodInRequest:function(e,t,s){var i=this.constructGmlTimeperiod(t,s)
return e=e.replace('xmlns:ogc="http://www.opengis.net/ogc"','xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"'),e=e.replace("<eventTime/>",i)},getObservationsForOffering:function(e,t,s,i){function r(e){var t=e+""
return 1===t.length&&(t="0"+t),t}var n=SOS.Utils.isoToTimeInterval(t,s),a=n.start.getUTCFullYear()+"-"+r(n.start.getUTCMonth()+1)+"-"+r(n.start.getUTCDate())+"T"+r(n.start.getUTCHours())+":"+r(n.start.getUTCMinutes())+":"+r(n.start.getUTCSeconds())+"Z",o=n.end.getUTCFullYear()+"-"+r(n.end.getUTCMonth()+1)+"-"+r(n.end.getUTCDate())+"T"+r(n.end.getUTCHours())+":"+r(n.end.getUTCMinutes())+":"+r(n.end.getUTCSeconds())+"Z",l={eventtime:a+"/"+o,responseFormat:"text/csv",offering:e.name,version:"1.0.0",request:"GetObservation",service:"SOS",observedProperty:i}
this.foiId&&(l.foi={objectId:this.foiId}),OpenLayers.Request.GET({url:"http://sdf.ndbc.noaa.gov/sos/server.php?",failure:function(){alert(OpenLayers.i18n("SOS Get Observations failed: ")+this.url)},success:function(t){e.SOSObservations=SOS.Utils.csvJSON(t.responseXML||t.responseText),e.events.triggerEvent("sosObsAvailable",{response:e})},params:l})},_parseObservations:function(e){this.SOSObservations=SOS.Utils.csvJSON(e.responseXML||e.responseText),offering.events.triggerEvent("sosObsAvailable",{response:e})},haveValidObservationsObject:function(){return SOS.Utils.isValidObject(this.SOSObservations)},getCountOfObservations:function(){var e=0
return this.haveValidObservationsObject()&&SOS.Utils.isValidObject(this.SOSObservations.measurements)&&(e=this.SOSObservations.measurements.length),e},getObservationRecord:function(e){var t={}
return this.haveValidObservationsObject()&&(t=this.SOSObservations.measurements[e],t.time=t.samplingTime.timeInstant.timePosition,t.observedPropertyTitle=SOS.Utils.toTitleCase(SOS.Utils.toDisplayName(SOS.Utils.urnToName(t.observedProperty))),t.uomTitle=SOS.Utils.toDisplayUom(t.result.uom)),t},getFeatureOfInterest:function(e){var t={fois:[e]},s=this.foiFormatter.write(t)
OpenLayers.Request.POST({url:this.url,scope:this,async:this.config.async,failure:function(){alert(OpenLayers.i18n("SOSGetFeatureOfInterestErrorMessage")+this.url)},success:this._parseFeatureOfInterest,data:s})},_parseFeatureOfInterest:function(e){var t=this.foiFormatter.read(e.responseXML||e.responseText)
t&&t.length>0&&(this.SOSFeatureOfInterest=t[0]),this.events.triggerEvent("sosFeatureOfInterestAvailable",{response:e})},getTemporalCoverageForFeatureOfInterestId:function(e){var t={foi:e},s=this.foiTimeFormatter.write(t)
OpenLayers.Request.POST({url:this.url,scope:this,async:this.config.async,failure:function(){alert(OpenLayers.i18n("SOSGetFeatureOfInterestTimeErrorMessage")+this.url)},success:this._parseTemporalCoverage,data:s})},_parseTemporalCoverage:function(e){this.SOSTemporalCoverage=this.foiTimeFormatter.read(e.responseXML||e.responseText),this.events.triggerEvent("sosTemporalCoverageAvailable",{response:e})},describeSensor:function(e){var t={procedure:e},s=this.sensorDescFormatter.write(t)
OpenLayers.Request.POST({url:this.url,scope:this,async:this.config.async,failure:function(){alert(OpenLayers.i18n("SOSDescribeSensorErrorMessage")+this.url)},success:this._parseSensorDescription,data:s})},_parseSensorDescription:function(e){this.SOSSensorDescription=this.sensorDescFormatter.read(e.responseXML||e.responseText),this.events.triggerEvent("sosSensorDescriptionAvailable",{response:e})}})
SOS.Offering=OpenLayers.Class(SOS,{url:null,events:null,capsFormatter:null,obsFormatter:null,config:null,CLASS_NAME:"SOS.Offering",initialize:function(e){this.url=null,this.events=new OpenLayers.Events(this),this.capsFormatter=new OpenLayers.Format.SOSCapabilities,this.obsFormatter=new OpenLayers.Format.SOSGetObservation,this.config={version:"1.0.0",async:!0,observation:{responseFormatType:"text/xml",responseFormat:'text/xml;subtype="om/1.0.0"',eventTimeLatest:"latest",eventTimeFirst:"getFirst",resultModel:"om:Measurement",responseMode:"inline",forceSort:!0}},OpenLayers.Util.extend(this,e)},destroy:function(){},getFeatureOfInterestIds:function(){return SOS.Utils.getUniqueList(this.featureOfInterestIds)},getProcedureIds:function(){return SOS.Utils.getUniqueList(this.procedures)},getObservedPropertyIds:function(){return SOS.Utils.getUniqueList(this.observedProperties)},getObservedPropertyNames:function(){return SOS.Utils.urnToName(SOS.Utils.getUniqueList(this.observedProperties))},filterObservedProperties:function(e){SOS.Utils.isArray(e)||(e=[e])
var t=SOS.Utils.isValidObject(this.observedPropertiesOriginal)?this.observedPropertiesOriginal:this.observedProperties,s=SOS.Utils.lookupUrnFromName(e,t)
SOS.Utils.isValidObject(this.observedPropertiesOriginal)||(this.observedPropertiesOriginal=this.observedProperties),this.observedProperties=s},unfilterObservedProperties:function(){SOS.Utils.isValidObject(this.observedPropertiesOriginal)&&(this.observedProperties=this.observedPropertiesOriginal,delete this.observedPropertiesOriginal)},getLatestObservations:function(e){arguments.length>0&&this.registerUserCallback({event:"sosLatestObsAvailable",scope:this,callback:e}),this.getLatestObservationsForOffering(this)},getObservations:function(e,t,s,i){arguments.length>2&&this.registerUserCallback({event:"sosObsAvailable",scope:this,callback:i}),this.getObservationsForOffering(this,t,s,e)}}),SOS.Utils={uomDisplayTitles:{Cel:"&deg;C",deg:"&deg;","m/s":"m s<sup>-1</sup>"},nonPrintingCharacterLabels:{" ":"(space)","  ":"(tab)","\n":"(newline)","\r\n":"(carriage return/newline)","\r":"(carriage return)"},isValidObject:function(e){return void 0!==e&&null!==e},isArray:function(e){return"[object Array]"===Object.prototype.toString.call(e)},isNumber:function(e){return!isNaN(parseFloat(e))&&isFinite(e)},csvJSON:function(e){for(var t=e.split("\n"),s=[],i=t[0].split(","),r=1;r<t.length;r++){for(var n={},a=t[r].split(","),o=0;o<i.length;o++)n[i[o]]=a[o]
s.push(n)}return JSON.stringify(s)},getUniqueList:function(e){for(var t=[],s=0,i=e.length;i>s;s++)-1===OpenLayers.Util.indexOf(t,e[s])&&t.push(e[s])
return t},toTitleCase:function(e){var t=e
if("string"==typeof e){for(var s=e.split(/ /),i=0,r=s.length;r>i;i++)s[i]=s[i].replace(/^(.)/,function(e,t){return t.toUpperCase()})
t=s.join(" ")}else if(this.isArray(e)){t=[]
for(var n=0,r=e.length;r>n;n++)t.push(this.toTitleCase(e[n]))}return t},toDisplayName:function(e){var t=e
if("string"==typeof e)t=e.replace(/_/g," ")
else if(this.isArray(e)){t=[]
for(var s=0,i=e.length;i>s;s++)t.push(this.toDisplayName(e[s]))}return t},urnToName:function(e){var t=e
if("string"==typeof e)t=e.replace(/^.*:/,"")
else if(this.isArray(e)){t=[]
for(var s=0,i=e.length;i>s;s++)t.push(this.urnToName(e[s]))}return t},lookupUrnFromName:function(e,t){var s=e
if("string"==typeof e){for(var i=0,r=t.length;r>i;i++)if(this.urnToName(t[i])===e){s=t[i]
break}}else if(this.isArray(e)){s=[]
for(var i=0,r=e.length;r>i;i++)s.push(this.lookupUrnFromName(e[i],t))}return s},toDisplayUom:function(e){var t=e
if(this.isValidObject(this.uomDisplayTitles))if("string"==typeof e)this.uomDisplayTitles[e]&&(t=this.uomDisplayTitles[e])
else if(this.isArray(e)){t=[]
for(var s=0,i=e.length;i>s;s++)t.push(this.toDisplayUom(e[s]))}return t},nonPrintingCharacterToLabel:function(e){var t=e
if(this.isValidObject(this.nonPrintingCharacterLabels))if("string"==typeof e)this.nonPrintingCharacterLabels[e]&&(t=this.nonPrintingCharacterLabels[e])
else if(this.isArray(e)){t=[]
for(var s=0,i=e.length;i>s;s++)t.push(this.nonPrintingCharacterToLabel(e[s]))}return t},newlineToBr:function(e){var t=e
if("string"==typeof e)t=e.replace(/(\r\n|\n|\r)/g,"<br/>")
else if(this.isArray(e)){t=[]
for(var s=0,i=e.length;i>s;s++)t.push(this.newlineToBr(e[s]))}return t},isoToDateObject:function(e){var t=e
if("string"==typeof e){var s=e.split(/T/)
s.length<2&&(s[1]="00:00:00.00Z")
var i=s[0].split(/-/)
s[1]=s[1].replace(/Z$/,"")
var r=s[1].split(/:/),n=r[2].replace(/^\d+\./,"")
r[2]=r[2].replace(/\.\d+$/,""),t=new Date(Date.UTC(parseInt(i[0],10),parseInt(i[1]-1,10),parseInt(i[2],10),parseInt(r[0],10),parseInt(r[1],10),parseInt(r[2],10),parseInt(n,10)))}else if(this.isArray(e)){t=[]
for(var a=0,o=e.length;o>a;a++)t.push(this.isoToDateObject(e[a]))}return t},isoToJsTimestamp:function(e){var t=e
if("string"==typeof e){var s=this.isoToDateObject(e)
t=s.getTime()}else if(this.isArray(e)){t=[]
for(var i=0,r=e.length;r>i;i++)t.push(this.isoToJsTimestamp(e[i]))}return t},jsTimestampToIso:function(e){var t=e
if("string"==typeof e||"number"==typeof e){var s=new Date(e)
t=s.toISOString()}else if(this.isArray(e)){t=[]
for(var i=0,r=e.length;r>i;i++)t.push(this.jsTimestampToIso(e[i]))}return t},isoToTimeInterval:function(e,t){var s={start:null,end:null}
return s.start=this.isoToDateObject(e),s.end=this.isoToDateObject(t),s},adjustTimeInterval:function(e,t,s){return e.start.setTime(e.start.getTime()+t),e.end.setTime(e.end.getTime()+s),e},parseRelativeTime:function(e){var t={start:null,end:null},s=new Date,i=s.getTime(),r=e,n=0,a=0,o=0
return t.start=new Date(i),t.end=new Date(i),r=r.replace(/to|current/i,"this"),r=r.replace(/yester|previous/i,"last"),/hour$/i.test(r)&&(n=36e5,a=i%n),/day$/i.test(r)&&(n=864e5,a=i%n),/week$/i.test(r)&&(o=864e5,n=6048e5,a=s.getUTCDay()*o+i%o),/month$/i.test(r)&&(o=864e5,n=26784e5,a=(s.getUTCDate()-1)*o+i%o),/year$/i.test(r)&&(o=864e5,n=316224e5,a=(s.getUTCDayOfYear()-1)*o+i%o),/^this/i.test(r)&&this.adjustTimeInterval(t,-a,-a+n-1),/^last/i.test(r)&&this.adjustTimeInterval(t,-a-n,-a-1),/^rolling/i.test(r)&&this.adjustTimeInterval(t,-n,-1),t},extractColumn:function(e,t){var s=[]
if(this.isArray(e))for(var i=0,r=e.length;r>i;i++)s.push(e[i][t])
return s},sum:function(e){for(var t=0,s=0,i=e.length;i>s;s++)t+=parseFloat(e[s])
return t},computeStats:function(e){var t={N:0,sum:0,min:0,max:0,mean:0,median:0,q1:0,q3:0,variance:0,sd:0}
if(this.isArray(e)&&e.length>1){t.N=e.length,t.sum=this.sum(e),t.mean=t.sum/t.N,t.min=Math.min.apply(null,e),t.max=Math.max.apply(null,e)
var s=e.slice(0)
s.sort(function(e,t){return e-t})
var i=Math.floor(t.N/2)
t.median=t.N%2==0?this.sum(s.slice(i,i+2))/2:s[i+1],i=Math.floor(t.N/4),t.q1=t.N%2==0?this.sum(s.slice(i,i+2))/2:s[i+1],i*=3,t.q3=t.N%2==0?this.sum(s.slice(i,i+2))/2:s[i+1]
for(var r=0,n=0,a=e.length;a>n;n++)r+=Math.pow(e[n]-t.mean,2)
t.variance=r/(t.N-1),t.sd=Math.sqrt(t.variance)}return t},computeHistogram:function(e){var t={min:0,max:0,lower:0,upper:0,nBins:0,binWidth:0,data:[]}
if(this.isArray(e)&&e.length>1){var s=0,i=e.slice(0)
if(i.sort(function(e,t){return e-t}),t.min=Math.min.apply(null,i),t.max=Math.max.apply(null,i),t.lower=Math.floor(t.min),t.upper=Math.ceil(t.max),t.nBins=10,t.upper-t.lower>0){t.binWidth=Math.pow(10,Math.round(Math.log(t.upper-t.lower)/Math.log(10)))/t.nBins
for(var r=t.lower;r<t.upper;r+=t.binWidth){for(var n=[r,0],a=i.length;a>s&&i[s]<r+t.binWidth;s++)n[1]++
t.data.push(n)}}}return t}},Date.prototype.toISOString||!function(){function e(e){var t=e+""
return 1===t.length&&(t="0"+t),t}Date.prototype.toISOString=function(){return this.getUTCFullYear()+"-"+e(this.getUTCMonth()+1)+"-"+e(this.getUTCDate())+"T"+e(this.getUTCHours())+":"+e(this.getUTCMinutes())+":"+e(this.getUTCSeconds())+"Z"}}(),Date.prototype.getUTCDayOfYear||!function(){Date.prototype.getUTCDayOfYear=function(){var e=new Date(this.getUTCFullYear(),0,1)
return Math.ceil((this.getTime()-e.getTime())/864e5)}}(),OpenLayers.Format.SOSGetFeatureOfInterest.prototype.write=function(e){this.namespaces.ows=this.namespaces.ows||"http://www.opengis.net/ows",this.namespaces.ogc=this.namespaces.ogc||"http://www.opengis.net/ogc"
var t=this.writeNode("sos:GetFeatureOfInterest",e)
return t.setAttribute("xmlns:ows",this.namespaces.ows),t.setAttribute("xmlns:ogc",this.namespaces.ogc),t.setAttribute("xmlns:gml",this.namespaces.gml),this.setAttributeNS(t,this.namespaces.xsi,"xsi:schemaLocation",this.schemaLocation),OpenLayers.Format.XML.prototype.write.apply(this,[t])},OpenLayers.Format.SOSGetFeatureOfInterestTime=OpenLayers.Class(OpenLayers.Format.XML,{VERSION:"1.0.0",namespaces:{sos:"http://www.opengis.net/sos/1.0",ogc:"http://www.opengis.net/ogc",ows:"http://www.opengis.net/ows",gml:"http://www.opengis.net/gml",xsi:"http://www.w3.org/2001/XMLSchema-instance"},schemaLocation:"http://www.opengis.net/sos/1.0 http://schemas.opengis.net/sos/1.0.0/sosGetFeatureOfInterest.xsd",defaultPrefix:"sos",regExes:{trimSpace:/^\s*|\s*$/g,removeSpace:/\s*/g,splitSpace:/\s+/,trimComma:/\s*,\s*/g},read:function(e){"string"==typeof e&&(e=OpenLayers.Format.XML.prototype.read.apply(this,[e])),e&&9==e.nodeType&&(e=e.documentElement)
var t={}
return this.readNode(e,t),t},write:function(e){var t=this.writeNode("sos:GetFeatureOfInterestTime",e)
return t.setAttribute("xmlns:ows",this.namespaces.ows),t.setAttribute("xmlns:ogc",this.namespaces.ogc),t.setAttribute("xmlns:gml",this.namespaces.gml),this.setAttributeNS(t,this.namespaces.xsi,"xsi:schemaLocation",this.schemaLocation),OpenLayers.Format.XML.prototype.write.apply(this,[t])},readers:{gml:OpenLayers.Util.applyDefaults({TimePeriod:function(e,t){var s={}
t.timePeriod=s,this.readChildNodes(e,s)},beginPosition:function(e,t){t.beginPosition=this.getChildValue(e)},endPosition:function(e,t){t.endPosition=this.getChildValue(e)}},OpenLayers.Format.GML.v3.prototype.readers.gml)},writers:{sos:{GetFeatureOfInterestTime:function(e){var t=this.createElementNSPlus("GetFeatureOfInterestTime",{attributes:{version:this.VERSION,service:"SOS","xsi:schemaLocation":this.schemaLocation}})
return e.foi&&this.writeNode("FeatureOfInterestId",{foi:e.foi},t),t},FeatureOfInterestId:function(e){var t=this.createElementNSPlus("FeatureOfInterestId",{value:e.foi})
return t}}},CLASS_NAME:"OpenLayers.Format.SOSGetFeatureOfInterestTime"}),OpenLayers.Format.SOSDescribeSensor=OpenLayers.Class(OpenLayers.Format.XML,{namespaces:{sos:"http://www.opengis.net/sos/1.0",sml:"http://www.opengis.net/sensorML/1.0.1",swe:"http://www.opengis.net/swe/1.0.1",gml:"http://www.opengis.net/gml",xlink:"http://www.w3.org/1999/xlink",xsi:"http://www.w3.org/2001/XMLSchema-instance"},regExes:{trimSpace:/^\s*|\s*$/g,removeSpace:/\s*/g,splitSpace:/\s+/,trimComma:/\s*,\s*/g},VERSION:"1.0.0",schemaLocation:"http://www.opengis.net/sos/1.0 http://schemas.opengis.net/sos/1.0.0/sosDescribeSensor.xsd",outputFormat:'text/xml;subtype="sensorML/1.0.1"',defaultPrefix:"sos",read:function(e){"string"==typeof e&&(e=OpenLayers.Format.XML.prototype.read.apply(this,[e])),e&&9==e.nodeType&&(e=e.documentElement)
var t={members:[]}
return this.readNode(e,t),t},write:function(e){var t=this.writeNode("sos:DescribeSensor",e)
return t.setAttribute("outputFormat",this.outputFormat),this.setAttributeNS(t,this.namespaces.xsi,"xsi:schemaLocation",this.schemaLocation),OpenLayers.Format.XML.prototype.write.apply(this,[t])},readers:{sml:{SensorML:function(e,t){this.readChildNodes(e,t)},member:function(e,t){var s={}
t.members.push(s),this.readChildNodes(e,s)},System:function(e,t){var s={id:this.getAttributeNS(e,this.namespaces.gml,"id"),description:null}
t.system=s,this.readChildNodes(e,s)},identification:function(e,t){var s={}
t.identification=s,this.readChildNodes(e,s)},IdentifierList:function(e,t){t.identifierList=[],this.readChildNodes(e,t.identifierList)},identifier:function(e,t){var s={name:e.getAttribute("name"),term:{}}
t.push(s),this.readChildNodes(e,s)},classification:function(e,t){var s={}
t.classification=s,this.readChildNodes(e,s)},ClassifierList:function(e,t){t.classifierList=[],this.readChildNodes(e,t.classifierList)},classifier:function(e,t){var s={name:e.getAttribute("name"),term:{}}
t.push(s),this.readChildNodes(e,s)},Term:function(e,t){t.term.definition=e.getAttribute("definition"),this.readChildNodes(e,t)},value:function(e,t){t.term.value=this.getChildValue(e)},capabilities:function(e,t){var s={}
t.capabilities=s,this.readChildNodes(e,s)},position:function(e,t){var s={name:e.getAttribute("name")}
t.position=s,this.readChildNodes(e,s)},inputs:function(e,t){var s={}
t.inputs=s,this.readChildNodes(e,s)},InputList:function(e,t){t.inputList=[],this.readChildNodes(e,t.inputList)},input:function(e,t){var s={name:e.getAttribute("name"),quantity:{},observableProperty:{}}
t.push(s),this.readChildNodes(e,s)},outputs:function(e,t){var s={}
t.outputs=s,this.readChildNodes(e,s)},OutputList:function(e,t){t.outputList=[],this.readChildNodes(e,t.outputList)},output:function(e,t){var s={name:e.getAttribute("name"),quantity:{}}
t.push(s),this.readChildNodes(e,s)},offering:function(e,t){this.readChildNodes(e,t)},id:function(e,t){t.id=this.getChildValue(e)},name:function(e,t){t.name=this.getChildValue(e)}},swe:{SimpleDataRecord:function(e,t){var s={fields:[]}
t.record=s,this.readChildNodes(e,s.fields)},Record:function(e,t){var s={fields:[]}
t.record=s,this.readChildNodes(e,s.fields)},field:function(e,t){var s={name:e.getAttribute("name"),quantity:{},text:{},category:{},count:{}}
t.push(s),this.readChildNodes(e,s)},Text:function(e,t){t.text.definition=e.getAttribute("definition"),this.readChildNodes(e,t.text)},ObservableProperty:function(e,t){t.observableProperty.definition=e.getAttribute("definition"),this.readChildNodes(e,t.observableProperty)},Quantity:function(e,t){t.quantity.definition=e.getAttribute("definition"),t.quantity.axisId=e.getAttribute("axisID"),this.readChildNodes(e,t.quantity)},description:function(e,t){t.description=this.getChildValue(e)},value:function(e,t){t.value=this.getChildValue(e)},uom:function(e,t){t.uom=e.getAttribute("code")},Position:function(e,t){t.referenceFrame=e.getAttribute("referenceFrame")
var s={}
t.location=s,this.readChildNodes(e,t.location)},location:function(e,t){this.readChildNodes(e,t)},Vector:function(e,t){var s={id:this.getAttributeNS(e,this.namespaces.gml,"id"),coordinates:[]}
t.vector=s,this.readChildNodes(e,s.coordinates)},coordinate:function(e,t){var s={name:e.getAttribute("name"),quantity:{}}
t.push(s),this.readChildNodes(e,s)}},gml:{metaDataProperty:function(e,t){var s={}
t.metadataProperty=s,this.readChildNodes(e,s)},description:function(e,t){t.description=this.getChildValue(e)}}},writers:{sos:{DescribeSensor:function(e){var t=this.createElementNSPlus("DescribeSensor",{attributes:{version:this.VERSION,service:"SOS","xsi:schemaLocation":this.schemaLocation}})
return e.procedure&&this.writeNode("procedure",{procedure:e.procedure},t),t},procedure:function(e){var t=this.createElementNSPlus("procedure",{value:e.procedure})
return t}}},CLASS_NAME:"OpenLayers.Format.SOSDescribeSensor"})}