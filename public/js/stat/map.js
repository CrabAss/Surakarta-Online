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
