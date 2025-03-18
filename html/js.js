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

