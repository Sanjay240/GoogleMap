 let map;
 let directionsService;
 let directionsRenderer;
 let geocoder;
 let infoWindow;
 let markers = [];
 let centerLatLng = {
     lat: 43.2464343,
     lng: -79.8618984
 };
 let selectedFilter = "All";
 let userLocation;

 function initMap() {
     directionsService = new google.maps.DirectionsService();
     directionsRenderer = new google.maps.DirectionsRenderer();
     geocoder = new google.maps.Geocoder();
     map = new google.maps.Map(document.getElementById("map"), {
         zoom: 13,
         center: userLocation,
         mapTypeControl: false,
         fullscreenControl: false,
     });

     google.maps.event.addListener(map, 'bounds_changed', function (evt) {
         console.log('Bounds changed!');
     });

     infoWindow = new google.maps.InfoWindow();
     setupMarkers();
     setupEvents();
     detectUserLocation();
     centerMap();
 }

 function setupEvents() {
     $(document).on('click', '#infowindow-directions-button', function (evt) {
         //  Capture the location's lat/lng from the element's data attributes
         let location = {
             lat: $(evt.target).data('lat'),
             lng: $(evt.target).data('lng')
         };

         //  Get directions from the selected marker
         getAndDisplayDirections(location);

         //  Prevents the form from being submitted
         //  https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
         evt.preventDefault();
         return false;
     });

     //  Closing the directions panel, clearing
     $(document).on('click', '#map-directions-clear-button, #directions-close-button', function (evt) {
         clearDirections();

         //  Close the actual panel
         $('body').removeClass('directions-open');

         //  Prevents the form from being submitted
         evt.preventDefault();
         return false;
     });

     //  User clicks "Directions" button on bottom
     $(document).on('click', '#directions-from-button', function (evt) {
         let directionsName = $('#directions-from-name').val();
         let directionsAddress = $('#directions-from-address').val();

         getAndDisplayDirections(directionsAddress);

         geocoder.geocode({
             address: directionsAddress
         }, (results, status) => {
             if (status === "OK") {
                 map.setCenter(results[0].geometry.location);
                 addMarker(results[0].geometry.location, directionsName);
             } else {
                 console.log("Geocode was not successful for the following reason: " + status);
             }
         });

         console.log(directionsName, directionsAddress);

         //  Prevents the form from being submitted
         evt.preventDefault();
         return false;
     });

     //  Selecting a filter
     $('#map-filters input[type=radio]').on('change', function (evt) {
         selectedFilter = evt.target.value;

         //  We should re-draw the markers with the new filter value
         setupMarkers();
         clearDirections();
     });
 }

 function detectUserLocation() {
     if (navigator.geolocation) {
         //  Get the user's location using the browser's Geolocation API
         navigator.geolocation.getCurrentPosition(
             //  Success
             (position) => {
                 const pos = {
                     lat: position.coords.latitude,
                     lng: position.coords.longitude,
                 };
                 console.log(pos);
                 //  Set user location for rest of application
                 userLocation = pos;
                 userMarker = new google.maps.Marker({
                    position: pos,
                    map,
                    title: "Current Location",
                  });
                  infoWindow.setPosition(pos);
                  google.maps.event.addListener(userMarker, 'click', function () {
                    infoWindow.setContent(`
                    <strong>You are here</strong><br>
                    Latitude: ${pos.lat}<br>
                    Longitude: ${pos.lng}
                `);
                    infoWindow.open(map, this);
                });
                markers.push(userMarker);
                 //  Center the map to the user's position
                 map.setCenter(pos);
             },
             //  Failure
             () => {
                 //  Couldn't get the user's location for some reason.
                 handleLocationError(true, infoWindow, map.getCenter());
             }
         );
     } else {
         // Browser doesn't support Geolocation
         handleLocationError(false, infoWindow, map.getCenter());
     }
 }

 function getAndDisplayDirections(destination) {
     //  Clear all the markers first
     clearMarkers();

     //  Set the directions renderer to use the map and panel
     directionsRenderer.setMap(map);
     directionsRenderer.setPanel(document.getElementById('map-directions-content'));

     //  Construct our request for the directions
     let request = {
         origin: userLocation,
         destination: destination,
         travelMode: 'DRIVING'
     };

     directionsService.route(request, function (response, status) {
         if (status == 'OK') {
             //  Set the directions panel as the place to insert the directions
             directionsRenderer.setDirections(response);

             // Open the panel
             $('body').addClass('directions-open');
         }
     });
 }

 function handleLocationError(browserHasGeolocation, infoWindow, pos) {
     //  Handle errors with location
     infoWindow.setPosition(pos);
     infoWindow.setContent(
         browserHasGeolocation ? "Error: The Geolocation service failed." : "Error: Your browser doesn't support geolocation."
     );
     infoWindow.open(map);
 }

 function setupMarkers() {
     let marker;

     clearMarkers();

     if (selectedFilter !== "All") {
         //  If "All" isn't selected, then filter by CATEGORY
         //  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
         educationalInstitutions = education.filter((val, idx, array) => {
             return val.CATEGORY == selectedFilter;
         });
     } else {
         //  Otherwise, show everything
         educationalInstitutions = education;
     }

     //  Loop through each institution and add the marker for it
     educationalInstitutions.forEach((val, idx, array) => {
         let latLng = {
             lat: val.LATITUDE,
             lng: val.LONGITUDE
         };
         let infoWindowContentUserLocation = `
            <h6><a href="${val.WEBSITE}" target="_blank" rel="noopener noreferrer">${val.NAME}</a></h6>
            <p>
            <ul>
                <li> ${val.ADDRESS}</li>
                <li> ${val.CATEGORY}</li>
                <li> ${val.COMMUNITY}</li>
            </ul>        
             </p>
            <button type="button" class="btn btn-sm" id="infowindow-directions-button" data-lat="${val.LATITUDE}" data-lng="${val.LONGITUDE}">Directions</button>
        `;
         let infoWindowContentNoLocation = `
            <h6>${val.NAME}</h6>
        `;

         marker = new google.maps.Marker({
             position: latLng,
             map: map,
             title: val.NAME,
         });

         google.maps.event.addListener(marker, 'click', function () {
             infoWindow.setContent(userLocation ? infoWindowContentUserLocation : infoWindowContentNoLocation);
             infoWindow.open(map, this);
         });

         markers.push(marker);
     });

     centerMap();
 }

 function centerMap() {
     let bounds = new google.maps.LatLngBounds();

     markers.forEach((marker) => {
         let markerLatLng = {
             lat: marker.getPosition().lat(),
             lng: marker.getPosition().lng()
         };
         bounds.extend(markerLatLng);
     });

     map.fitBounds(bounds);
     map.setCenter(bounds.getCenter());
 }

 function clearMarkers() {
     markers.forEach((marker, idx, array) => {
         marker.setMap(null);
     });
 }

 function addMarker(latLng, title) {
     let singleMarker = new google.maps.Marker({
         position: latLng,
         map: map,
         title: title,
     });

     singleMarker.setMap(map);
 }

 function clearDirections() {
     $('#map-directions-content').html('');

     directionsRenderer.setMap(null);
     directionsRenderer.setPanel(null);

     setupMarkers();
 }