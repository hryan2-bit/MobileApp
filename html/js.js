let map, infoWindow;
let selectedPlaces = [];

//websocket
let wsurl;
if(window.location.protocol == 'http:') {
  wsurl = 'wss://localhost:3001/api';
} else {
  wsurl = 'wss://' + window.location.host + '/api'
}
let sock = new WebSocket(wsurl);
sock.onmessage = (event) => {
  console.log("WebSocket data received:", event.data);
}

//fullscreen map
function toggleFullscreen(){
    const el = document.getElementById("map-container");

    if(!document.fullscreenElement) {
        el.requestFullscreen().catch(err => {
            console.error("Error attempting to enable fullscreen.");
        });
    } else {
        document.exitFullscreen();
    }
}

//google sign in
function onSignIn(response){
    if(response && response.credential){
        console.log("Sending token: ", response.credential);

        localStorage.setItem('token', response.credential)

        fetch('/api/login', {
            method: 'GET',
            headers:{
                'Authorization': `Bearer `+ response.credential,
                'Content-Type': 'application/json'
            }
        })
        .then(async res => {
            if(!res.ok) throw new Error('Not logged in');
            const userData = await res.text();
            return userData ? JSON.parse(userData) : {};
        })
        .then(data =>{
            const [user] = data
            console.log("login response:", user.name)
            showLoggedInUser(user.name)
            loadHistory()
        })
        .catch(() => {
            document.getElementById('g_id_signin').style.display = 'block';
        })
    } else {
        console.error('Google Sign-In failed: no credentials found');
    }
}

function showLoggedInUser(email) {
    document.getElementById('g_id_signin').style.display = 'none'
    document.getElementById('user-info').innerHTML = `
    <span style="color: white; font-size: 20px;"> Welcome, ${email} <span>
    <button onclick="logout()">Logout</button>
    `
}

function logout() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = ""
    fetch('/api/logout', { method: 'POST' }).then(() => {
        document.getElementById('user-info').innerHTML = '';
        document.getElementById('g_id_signin').style.display = 'block';
        google.accounts.id.disableAutoSelect();
    })
}

async function initMap() {
    console.log("Map initialization started . . .");
    (async () => {
        const { Map } = await google.maps.importLibrary("maps");

    map = new Map(document.getElementById("map"), {
        center: { lat: 38.859, lng: -104.813 },
        zoom: 12,
        mapId: "HOME_MAP_ID",
    });

    infoWindow = new google.maps.InfoWindow();

    initAutocomplete();

    document.addEventListener("fullscreenchange", () => {
        google.maps.event.trigger(map, "resize");
    });

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

                const userLocationMarker = new google.maps.Marker({
                    position: pos,
                    map: map,
                    title: "Your Location",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: "#0000FF",
                        fillOpacity: 0.6,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 2,
                        scale: 8,
                    }
                });
                
                infoWindow.setPosition(pos);
                infoWindow.setContent("Your Location");
                userLocationMarker.addListener("click", () => {
                    infoWindow.open(map);
                });
            },
            () => {
                handleLocationError(true, infoWindow, map.getCenter());
            }
        );
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }
  })();
}

async function initAutocomplete() {
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  const service = new google.maps.places.PlacesService(map);

  map.addListener("bounds_changed", () => {
      searchBox.setBounds(map.getBounds());
  });

  let markers = [];

  searchBox.addListener("places_changed", async () => {
      const places = searchBox.getPlaces();
      if (!places || places.length === 0) return;

      markers.forEach(marker => marker.map = null);
      markers = [];

      const bounds = new google.maps.LatLngBounds();

      for (const place of places) {
          if (!place.geometry || !place.geometry.location) continue;

          const marker = new google.maps.Marker({
              map,
              position: place.geometry.location,
              title: place.name || "Place",
              icon:{
                url: "https://maps.google.com/mapfiles/ms/icons/blue.png"
              }
          });

          marker.addListener("click", () => {
              service.getDetails({
                  placeId: place.place_id,
                  fields: ["name", "formatted_address", "website"],
              }, (details, status) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && details) {
                    const content = document.createElement("div");
                    content.innerHTML = `
                        <strong>${details.name}</strong><br>
                        ${details.formatted_address || "No address available"}<br><br>
                        ${details.website ? `<a href="${details.website}" target="_blank">Visit Website</a>` : "No website available"}
                    `;
                
                    const button = document.createElement("button");
                    button.textContent = "Add to List";
                    button.addEventListener("click", () => addToList(details));
                
                    content.appendChild(button);
                    infoWindow.setContent(content);
                    infoWindow.open(map, marker);
                  } else {
                      infoWindow.setContent(`<div><strong>${place.name}</strong><br>Details not available.</div>`);
                      infoWindow.open(map, marker);
                  }
              });
          });

          markers.push(marker);
      }
  });
}

async function nearbySearch(lat, lng) {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { LatLngBounds } = await google.maps.importLibrary("core");

    const center = new google.maps.LatLng(lat, lng);
    const service = new google.maps.places.PlacesService(map);
    const bounds = new LatLngBounds();
    const markers = [];
    const infoWindow = new google.maps.InfoWindow();

    const request = {
        location: center,
        radius: 13000, // 13 km
        type: "restaurant" 
    };

    try {
        const places = await new Promise((resolve, reject) => {
            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else {
                    reject(`Nearby search failed: ${status}`);
                }
            });
        });

        if (!places || places.length === 0) {
            console.log("No nearby places found.");
            return;
        }

        console.log("Nearby Places:", places);

        for (const place of places) {
            const marker = new AdvancedMarkerElement({
                map,
                position: place.geometry.location,
                title: place.name,
            });

            // Get detailed place info
            const placeDetails = await new Promise((resolve, reject) => {
                service.getDetails(
                    {
                        placeId: place.place_id,
                        fields: ["name", "formatted_address", "website", "photo"]
                    },
                    (result, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK) {
                            resolve(result);
                        } else {
                            reject(`Details fetch failed: ${status}`);
                        }
                    }
                );
            });

            marker.addListener("gmp-click", () => {
                const content = document.createElement("div");
                content.innerHTML = `
                    <strong>${placeDetails.name}</strong><br>
                    ${placeDetails.formatted_address || "No address available"}<br><br>
                    ${placeDetails.website ? `<a href="${placeDetails.website}" target="_blank">Visit Website</a>` : "No website available"}
                `;
            
                const button = document.createElement("button");
                button.textContent = "Add to List";
                button.addEventListener("click", () => addToList(placeDetails)); // make sure placeDetails is correct
            
                content.appendChild(button);
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
            });

            bounds.extend(place.geometry.location);
            markers.push(marker);
        }

        map.fitBounds(bounds);
    } catch (error) {
        console.error("Error in nearbySearch:", error);
    }
}

function addToList(place) {
    console.log("addToList received:", place);
    if (!place || typeof place !== "object") {
        console.error("Invalid place object:", place);
        return;
    }

    selectedPlaces.push(place);

    const list = document.getElementById("results");
    const div = document.createElement("div");

    div.style.border = "2px solid #0041C2";
    div.style.padding = "10px";
    div.style.borderRadius = "5px";

    div.innerHTML = `<h3>${place.name}</h3><br><p>${place.formatted_address}</p>`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.style.marginLeft = "auto";
    removeBtn.style.backgroundColor = "#f44336";
    removeBtn.style.color = "white";
    removeBtn.style.border = "none";
    removeBtn.style.borderRadius = "5px";
    removeBtn.style.padding = "5px 10px";

    removeBtn.addEventListener("click", () => {
        selectedPlaces = selectedPlaces.filter(p => p.place_id !== place.place_id);
        div.remove();
    });


    div.appendChild(removeBtn)
    list.appendChild(div);
}

function randomize(){
    if (selectedPlaces.length === 0) {
        alert("No places in the list! Please add places from the map.");
        return;
    }

    const randIndex = Math.floor(Math.random() * selectedPlaces.length);
    const randPlace = selectedPlaces[randIndex];

    const randPlaceDisplay = document.getElementById("randPlaceDisplay");
    randPlaceDisplay.innerHTML = `
        <h3>The Computer has Chosen:<h3>
        <p><strong>Name: ${randPlace.name}</strong></p><br>
        <p>Address: ${randPlace.formatted_address}</p>
    `;

    const placeToSend = {
        name: randPlace.name,
        formatted_address: randPlace.formatted_address
    }

    const token = localStorage.getItem('token')
    //add to db
    fetch("/api/items", {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(placeToSend),
        credentials: 'include'
    })
    .then(async response => {
        const text = await response.text()
        if(!response.ok) {
            throw new Error(`Server error: ${response.status} ${text}`)
        }
        try {
        const data = text ? JSON.parse(text) : {};
        console.log("Place added to database:", data);
        loadHistory();
        } catch (err) {
        console.error("Error parsing response JSON:", err);
        }
    })
    .then(data => {
        console.log("Place added to database:", data);
        loadHistory();
    })
    .catch(error => {
        console.error("Error adding place to database:", error);
    });
}

function loadHistory(){
    const token = localStorage.getItem('token')
    fetch("/api/items",{
        method: 'GET',
        headers:{
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if(!response.ok) {
            throw new Error("Failed to fetch history.");
        }
        return response.json();
    })
    .then(data => {
        const historyList = document.getElementById("historyList");

        historyList.innerHTML = ""

        if (data.length === 0) {
            historyList.innerHTML = "<li>No history yet.</li>";
            return;
        }

        data.forEach(place => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${place.name}</strong> — ${place.formatted_address || place.address}
            `;
            historyList.appendChild(li);
        });
    })
    .catch(error => {
        console.error("Error loading history:", error);
    });
}

document.querySelectorAll('.topnav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetID = this.getAttribute('href').substring(1);
        const targetElem = document.getElementById(targetID);
        if(targetElem) {
            window.scrollTo({
                top: targetElem.offsetTop - 80,
                behavior: 'smooth',
            })
        }
    })
})

// Listen for messages from the OAuth window
window.addEventListener('message', (event) => {
    // Ensure the message is coming from a trusted source (Google)
    if (event.origin !== 'https://accounts.google.com') {
        console.error('Untrusted message origin:', event.origin);
        return;
    }

    // Handle the message (e.g., response from Google login)
    console.log('Received data:', event.data);

    // Process the login response (e.g., send the token to your backend)
    if (event.data && event.data.credential) {
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${event.data.credential}`
            }
        }).then(response => response.json())
          .then(data => {
              console.log('Login successful:', data);
              // You can redirect or show user info here
          }).catch(error => {
              console.error('Login failed:', error);
          });
    }
});

window.initMap = initMap;
window.onload = () => {
    google.accounts.id.initialize({
        client_id: '1661812737-2m2vvpbp8v9jfe69aqnnvrkarvt28e9v.apps.googleusercontent.com',
        callback: onSignIn
    })
    google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme:"outline", size:"large" }
    )
};