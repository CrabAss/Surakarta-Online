/*

Surakarta-Online: Realtime game hosting of Surakarta using Node.js
Copyright (C) 2018 CrabAss

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/


let map;
function initMap() {
    map = new google.maps.Map(document.getElementById('map_canvas'), {
        zoom: 2,
        center: new google.maps.LatLng(0,-180),
        mapTypeId: 'terrain'
    });

    let script = document.createElement('script');
    script.src = '/stat/geojsonp';
    document.getElementsByTagName('head')[0].appendChild(script);
}

// Loop through the results array and place a marker for each
// set of coordinates.
window.geo_callback = function(results) {
    for (let i = 0; i < results.features.length; i++) {
        let coords = results.features[i].geometry.coordinates;
        let latLng = new google.maps.LatLng(coords[1],coords[0]);
        let marker = new google.maps.Marker({
            position: latLng,
            map: map,
            clickable: true
        });
        marker.info = new google.maps.InfoWindow({
            content: '<b>User: </b><a href="/u/@' + results.features[i].properties.name + '">' + results.features[i].properties.name
                + '</a><br><b>Wins: </b>' + results.features[i].properties.countWin
        });

        google.maps.event.addListener(marker, 'click', function() {
            marker.info.open(map, marker);
        });
    }
};
