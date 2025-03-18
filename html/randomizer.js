function authHeader() {
    const username = localStorage.getItem('username');
    const password = localStorage.getItem('password');

    if (!username || !password) {
        alert("You are not logged in!");
        return '';
    }
    const credentials = btoa(username + ':' + password);
    return 'Basic ' + credentials;
}

function loadItems() {
    document.getElementById('content').innerHTML = '';
    $.ajax({
        url: '/api/items',
        method: 'GET',
        success: function(data) {
            console.log(data);
            data.forEach(item => {
                const newItem = document.createElement('div');
                newItem.id = 'item-' + item.id;
                var name = document.createTextNode(item.name);
    
                var editButt = document.createElement('button');
                editButt.textContent = 'Edit';
                editButt.onclick = function() {
                    editItem(item.uid);
                }
    
                var delButt = document.createElement('button');
                delButt.textContent = 'Delete';
                delButt.onclick = function() {
                    deleteItem(item.uid);
                }
    
                newItem.appendChild(name);
                newItem.appendChild(editButt);
                newItem.appendChild(delButt);
    
                document.getElementById('content').appendChild(newItem);

                const breakLine = document.createElement('br');
                document.getElementById('content').appendChild(breakLine);
            });
        }
    });
}

function generateID() {
    return Math.floor(Math.random() * 1000)
}

function addItem(name){
    let itemName = name;
    let id = generateID();
    if (!itemName) {
        alert("Item name cannot be empty.");
        return;
    }

    //must be logged in
    const auth = authHeader();

    console.log(JSON.stringify({ name: itemName }));

    $.ajax({
        url: '/api/items',
        method: 'POST',
        contentType: 'application/json',
        headers: { 'Authorization': auth },
        data: JSON.stringify({ id, name: itemName }),
        success: function(item) {
            console.log("Item added: ", item);
            const newItem = document.createElement('div');
                newItem.id = 'item-' + item.id;
                let name = document.createTextNode(item.name);
    
                var editButt = document.createElement('button');
                editButt.textContent = 'Edit';
                editButt.onclick = function() {
                    editItem(item.id);
                }
    
                var delButt = document.createElement('button');
                delButt.textContent = 'Delete';
                delButt.onclick = function() {
                    deleteItem(item.id);
                }
    
                newItem.appendChild(name);
                newItem.appendChild(editButt);
                newItem.appendChild(delButt);
    
                document.getElementById('content').appendChild(newItem);

                const breakLine = document.createElement('br');
                document.getElementById('content').appendChild(breakLine);

        },
        error: function(xhr) {
            if (xhr.status === 401) {
                alert("You are not authorized to view the items. Please log in.");
            }
        }
    });
    loadItems();
}

function deleteItem(id){
    if(confirm("Are you sure? This will be deleted permanently.")) {
        //must be logged in
        const auth = authHeader();

        $.ajax({
            url: `/api/items/?uid=${id}`,
            method: 'DELETE',
            headers: { 'Authorization': auth },
            success: function() {
                $('#item-'+id).remove();
                loadItems();
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    alert("You are not authorized to view the items. Please log in.");
                }
            }
        });
    }
}

function editItem(id){
    let eName = prompt("Edit restaurant name:");
    if (!eName) return; // if no name is entered

    //must be logged in
    const auth = authHeader();
  
    $.ajax({
        url: `/api/items/?uid=${id}`,
        method: 'PUT',
        contentType: 'application/json',
        headers: { 'Authorization': auth },
        data: JSON.stringify({uid: id, name: eName }),
        success: function(item) {
            let itemDiv = document.getElementById('item-' + item.id);
            if(itemDiv){
                itemDiv.innerHTML = '';

                var newName = document.createTextNode(item.name);
    
                var editButt = document.createElement('button');
                editButt.textContent = 'Edit';
                editButt.onclick = function() {
                    editItem(item.id);
                }
    
                var delButt = document.createElement('button');
                delButt.textContent = 'Delete';
                delButt.onclick = function() {
                    deleteItem(item.id);
                }
    
                item.appendChild(newName);
                item.appendChild(editButt);
                item.appendChild(delButt);
            }
            loadItems();
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                alert("You are not authorized to view the items. Please log in.");
            }
        }
    });
}

function randomize(){
    //must be logged in
    const auth = authHeader();
    $.ajax({
        url: '/api/items',
        method: 'GET',
        success: function(data) {
            console.log("Data:", data);
            const itemCount = data.length;
            const randomNum = Math.floor(Math.random() * itemCount);
            const randItem = data[randomNum];

            const breakLine = document.createElement('br');
            const randDiv = document.createElement('div');
            randDiv.id = "rand-" + randomNum;
            
            var name = document.createTextNode(randItem.name);
            randDiv.appendChild(name);
            
            console.log("Random item:", data[randomNum]);

            if (itemCount === 0) {
                document.getElementById('random').innerHTML = 'No items available to randomize.';
                return;
            } else {
                document.getElementById('random').innerHTML = '';
                document.getElementById('random').appendChild(breakLine);
                document.getElementById('random').appendChild(randDiv);
                document.getElementById('random').appendChild(breakLine);
            }
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                alert("You are not authorized to view the items. Please log in.");
            }
        }
    })
}

loadItems();