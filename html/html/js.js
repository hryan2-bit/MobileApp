let map, infoWindow;

async function initMap() {
    console.log("Map initialization started . . .");
    const { Map } = await google.maps.importLibrary("maps");

    map = new Map(document.getElementById("map"), {
        center: { lat: 38.859, lng: -104.813 }, // Default location
        zoom: 12,
        mapId: "HOME_MAP_ID",
    });

    infoWindow = new google.maps.InfoWindow();

    initAutocomplete();

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                map.setCenter(pos);
                nearbySearch(pos.lat, pos.lng); // Pass coordinates to nearbySearch()

                infoWindow.setPosition(pos);
                infoWindow.setContent("Your Location");
                infoWindow.open(map);
            },
            () => {
                handleLocationError(true, infoWindow, map.getCenter());
            }
        );
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }
}

function initAutocomplete() {
    // Create the search box and link it to the UI element.
  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
  // Bias the SearchBox results towards current map's viewport.
  map.addListener("bounds_changed", () => {
    searchBox.setBounds(map.getBounds());
  });

  let markers = [];

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach((marker) => {
      marker.setMap(null);
    });
    markers = [];

    // For each place, get the icon, name and location.
    const bounds = new google.maps.LatLngBounds();

    places.forEach((place) => {
      if (!place.geometry || !place.geometry.location) {
        console.log("Returned place contains no geometry");
        return;
      }

      const icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25),
      };

      // Create a marker for each place.
      markers.push(
        new google.maps.Marker({
          map,
          icon,
          title: place.name,
          position: place.geometry.location,
        }),
      );
      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
  });
}

async function nearbySearch(lat, lng) {
    const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const center = new google.maps.LatLng(lat, lng);
    
    const request = {
        fields: ["displayName", "location", "businessStatus"],
        locationRestriction: {
            center: center,
            radius: 10000, // Increased search radius
        },
        includedPrimaryTypes: ["restaurant"],
        maxResultCount: 20, // Fetch more results
        rankPreference: SearchNearbyRankPreference.POPULARITY,
        language: "en-US",
        region: "us",
    };

    const { places } = await Place.searchNearby(request);

    if (places.length) {
        console.log("Nearby Places:", places);

        const { LatLngBounds } = await google.maps.importLibrary("core");
        const bounds = new LatLngBounds();

        places.forEach((place) => {
            const markerView = new AdvancedMarkerElement({
                map,
                position: place.location,
                title: place.displayName,
            });

            bounds.extend(place.location);
            console.log(place);
        });

        map.fitBounds(bounds);
    } else {
        console.log("No results found");
    }
}

function displayPlaces(places) {
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = ""; // Clear previous results

    places.forEach(place => {
        const placeElement = document.createElement("div");
        placeElement.classList.add("place-item");
        placeElement.innerHTML = `<h3>${place.name}</h3><p>${place.vicinity}</p>`;
        resultsContainer.appendChild(placeElement);
    });
}

window.initMap = initMap;