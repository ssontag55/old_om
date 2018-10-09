
function update_station_status(data) {
    var msg_container=document.getElementsByTagName("span").popup_msg;
    if (msg_container !== null) {
        if (data.status_code > 0) {
            msg_container.className="warning";

        } else {
            msg_container.className="";
        }
        if (data.status_code == 0) {
                $(msg_container).html(data.status);
        } else {
                $(msg_container).html(data.message);
        }
    }
}
function plot_profile(data){
    var age = data.age;
    var title_container=document.getElementById("profile_title");
    var container=document.getElementById("profile");
    if (age <= 86400) {

        var spd = data.speed.data;
        var dir = data.direction.data;
        var tstamp = data.speed.time;
        var spdAxProps = {
                title: data.speed.x_label,
                ticks: [0,.25,.5,.75,1],
                min:0,
                max:1,
                showTicks:true,
                margin: true,
            };
        var dirAxProps = {
                title: data.direction.x_label,
                ticks: [[0,"North"],[90,"East"],[180,"South"],[270,"West"],[360,"North"]],
                min: 0,
                max:360,
                margin: true,
            };
        var depthAxProps1 = {
                tickFormatter: function(n) {return -1*n +" ft";},
    //            title : data.speed.y_label,
            };
        var depthAxProps2 = {
                tickFormatter: function(n) {return -1*n +" ft";},
    //            title: data.direction.y_label,
                position: "right",
            };
        $(title_container).html("Latest Profile: " + tstamp);
        Flotr.draw(container, [
            {data: dir, xaxis:2, points: {show: true}},
            {data: spd, xaxis:1, fill: false, lines: {fill: false}},

        ],{
            HtmlText: true,
            colors: ['#770000', '#000077'],
            xaxis: spdAxProps,
            yaxis: depthAxProps1,
            x2axis: dirAxProps,
            grid: {
                backgroundColor: "#FFFFFF",
            }
        });
    } else {
        if (title_container.innerHTML != "Latest Profile") {
            $(title_container).html("");
        }

        $(container).html('<p class="warning centered">No profile within the past 24 hrs.</p>')
    };

}

function get_latest_profile(sid,metric){
    var url = "/stations/" + sid + "/latest/JSON/";
    if (metric == false) {
        url += "?metric=False";
    } else {
        url += "?metric=True";
    }
    var jqxhr = $.getJSON( url, function(data) {
//        console.log(data);
    }).done(function(data) {
//        active_profile_data = data;
        plot_profile(data.profile);
        update_station_status(data.status_info);
      })
      .fail(function() {
//        console.log( "error" );
      })
      .always(function() {
//        console.log( "complete" );
      });
    var url;
    if (metric == true) {
        url = "/stations/" + sid + "/latest/JSON/?metric=True";
    } else {
        url = "/stations/" + sid + "/latest/JSON/?metric=False";
    }
}