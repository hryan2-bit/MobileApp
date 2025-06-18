function loadItems() {
    document.getElementById('content').innerHTML = '';
    $.ajax({
        url: '/api/items',
        method: 'GET',
        xhrFields: {withCredentials: false},
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

    console.log(JSON.stringify({ name: itemName }));

    $.ajax({
        url: '/api/items',
        method: 'POST',
        contentType: 'application/json',
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

        }
    });
    loadItems();
}

function deleteItem(id){
    if(confirm("Are you sure? This will be deleted permanently.")) {

        $.ajax({
            url: `/api/items/?uid=${id}`,
            method: 'DELETE',
            success: function() {
                $('#item-'+id).remove();
                loadItems();
            }
        });
    }
}

function editItem(id){
    let eName = prompt("Edit restaurant name:");
    if (!eName) return; // if no name is entered

  
    $.ajax({
        url: `/api/items/?uid=${id}`,
        method: 'PUT',
        contentType: 'application/json',
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
        }
    });
}

function randomize(){
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
        }
    })
}

loadItems();