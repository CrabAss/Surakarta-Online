let map;
function initMap() {
  map = new google.maps.Map(document.getElementById('map_canvas'), {
    zoom: 2,
    center: new google.maps.LatLng(0,-180),
    mapTypeId: 'terrain'
  });

  // Create a <script> tag and set the USGS URL as the source.
  let script = document.createElement('script');
  // This example uses a local copy of the GeoJSON stored at
  // http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojsonp
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
      content: '<b>User: </b>' + results.features[i].properties.name
      + '<br><b>Wins: </b>' + results.features[i].properties.winCount
    });

    google.maps.event.addListener(marker, 'click', function() {
      marker.info.open(map, marker);
    });
  }
};
