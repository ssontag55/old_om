// Login View
var LoginView = Backbone.View.extend({

  initialize: function() {
    _.bindAll(this, 'login');

    var that = this;
    
    $('#login .ui.checkbox')
      .checkbox({
        onEnable: function() {
          $('#loginbutton')
            .removeClass('disabled')
            .on('click', that.login)
          ;
        },
        onDisable: function() {
          $('#loginbutton')
            .addClass('disabled')
            .off('click', that.login)
          ;
        }
      })
    ;
  },

  login: function() {
    var that = this;

    // first check that the us/pw/checkbox is filled
    var username = $('#username').val()
      , password = $('#password').val();

    if (username && password) {
      $.ajax({
//          url: "http://coastmap.com/ecop/wms.aspx",
        //url: "ajax/login",
        url: "http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://coastmap.com/ecop/wms.aspx?request=GetUserInfo&version=1.1.1",
        data: {
          username: username,
          pw: password
        }
      })
      .done(function(response) {
        if (window.DOMParser) {
          //parser = new DOMParser();
          //response = parser.parseFromString(response, 'text/xml');

          // if the login was successfull
          if (response.getElementsByTagName('defaultLayers')[0]) {
            $('#map').show();
            $('#mainappcontainer').show();

            var layers = response.getElementsByTagName('defaultLayers')[0].childNodes[0].nodeValue.split(',');
            
            //run the getCapabilities document for that software key
            //no need for none EDS apps
            /*if(response.getElementsByTagName('softwareKey')[0])
            {

             var request = OpenLayers.Request.GET(
              {
                url:
                "http://map.asascience.com/EGDataViewer/Scripts/proxy.php?http://coastmap.com/ecop/wms.aspx?REQUEST=GetCapabilities&service=1.1.1&key="+response.getElementsByTagName('softwareKey')[0].childNodes[0].nodeValue,
                success: function(response){
                      var format = new OpenLayers.Format.XML();
                      var xml = format.read(response.responseText);

                      var text = format.write(xml);

                      var CAPformat = new OpenLayers.Format.WMSCapabilities.v1_1_1();
                      var cap = CAPformat.read(xml);

                      var fulllayers = [];
                      for (var i=0; i<cap.capability.layers.length;i++)
                      {
                           fulllayers.push(cap.capability.layers[i])
                      }

                      mapView = new MapView({
                        el: document.getElementById('map'),
                        model: new Backbone.Model({
                          overlays: fulllayers
                        })
                      });
                      //mapView.initializeoverlays;
                 }
               })
              }
              else{
                  mapView = new MapView({
                        el: document.getElementById('map'),
                        model: new Backbone.Model({
                          overlays: layers
                        })
                      });
              };*/

            mapView = new MapView({
                        el: document.getElementById('map'),
                        model: new Backbone.Model({
                          overlays: layers
                        })
                      });
            

            leftpanelView = new LeftpanelView({
              el: document.getElementById('leftpanel')
            });

            rightcontainerView = new RightcontainerView({
              el: document.getElementById('rightcontainer')
            });

            topbarView = new TopbarView({
              el: document.getElementById('topbar')
            });

            /*Bottom Graph view on map
            graphView = new GraphView({
              el: document.getElementById('graphs'),
              model: new Backbone.Model()
            });*/

            catalogView = new CatalogView({
              el: document.getElementById('catalog'),
              model: new Backbone.Model()
            });

            setTimeout(function() {
              topbarView.toggleleftpanel();
            }, 500);

            $('#login').fadeOut();
          } else { // not authorized
            alert('username/password not found');
          }
        }
      });
    } else {
      alert('No username or password provided');
    }
  }
});

// leftpanel view
var LeftpanelView = Backbone.View.extend({
  initialize: function() {
  }
});

var RightcontainerView = Backbone.View.extend({
  initialize: function() {
    this.model = new Backbone.Model();

    this.model.state = 'fullscreen';
  }
});

var TopbarView = Backbone.View.extend({
  events: {
    'click a.launch.item.active' : 'toggleleftpanel',
    'click .ui.labeled.icon.toggle.button.view': 'togglemap'
  },

  initialize: function() {
    _.bindAll(this, 'toggleleftpanel');
    _.bindAll(this, 'togglemap');
  },

  togglemap: function(evt){
    catalogView.togglecatalog();
    if(evt.currentTarget.innerText == 'GRAPH VIEW'){
      // do something
      evt.currentTarget.innerHTML = "Map View <i class='globe icon'></i>";
    }
    else{
      // do something else but cooler
      evt.currentTarget.innerHTML = "Graph View <i class='chart basic icon'></i>";
    }
  },

  toggleleftpanel: function() {
    if (rightcontainerView.model.state === 'splitscreen') {
      rightcontainerView.model.state = 'resizing';

      leftpanelView.$el.animate(
        { left: '-295px' },
        { duration: 1000, easing: 'easeOutExpo' }
      );
      rightcontainerView.$el.animate(
        { left: '0px' },
        { duration: 1000,
          easing: 'easeOutExpo',
          done: function() {
            rightcontainerView.model.state = 'fullscreen';
            document.getElementById('titlebar').style.paddingRight = '0px';
            //graphView.drawbottomgraph();
            mapView.map.invalidateSize();
            catalogView.resize();
          }
        }
      );
    } else if (rightcontainerView.model.state === 'fullscreen') {
      rightcontainerView.model.state = 'resizing';

      leftpanelView.$el.animate(
        { left: '0px' },
        { duration: 1000, easing: 'easeOutExpo' }
      );
      rightcontainerView.$el.animate(
        { left: '272px' },
        { duration: 1000,
          easing: 'easeOutExpo',
          done: function() {
            rightcontainerView.model.state = 'splitscreen';
            document.getElementById('titlebar').style.paddingRight = '275px';
            //graphView.drawbottomgraph();
            mapView.map.invalidateSize();
            catalogView.resize();
          }
        }
      );
    }
  }
});

/*for dev
$('#map').show();
$('#mainappcontainer').show();
*/

$(document).ready(function() {

  // login view
  loginView = new LoginView();

 /* bottom map graph
 graphView = new GraphView({
    el: document.getElementById('graphs'),
    model: new Backbone.Model()
  });*/

/////////////////////////////////////////////////////
  // for dev only comment out the following
/////////////////////////////////////////////////////
  // will eventually copy this code to the
  // successful login callback
  /*
leftpanelView = new LeftpanelView({
    el: document.getElementById('leftpanel')
  });

  rightcontainerView = new RightcontainerView({
    el: document.getElementById('rightcontainer')
  });

  topbarView = new TopbarView({
    el: document.getElementById('topbar')
  });

  mapView = new MapView({
    el: document.getElementById('map'),
    model: new Backbone.Model({
      overlays: [
        //{name:'HYCOM_GLOBAL_CURRENTS',title:'CURRENTS'}      
        ]
    })
  });

  catalogView = new CatalogView({
    el: document.getElementById('catalog'),
    model: new Backbone.Model()
  });

  setTimeout(function() {
    topbarView.toggleleftpanel();
  }, 500);*/
});
