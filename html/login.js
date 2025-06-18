const updateUsers = () => {
  const tbody = document.querySelector('tbody')
  tbody.innerHTML = ''
  fetch('/api/admin')
    .then(r => r.json())
    .then(users => Object.entries(users).map(([u, a]) => {
      const row = document.createElement('tr')
      row.innerHTML = `<td>${u}</td>
                       <td><input type="checkbox"${a ? ' checked' : ''} /></td>
                       <td><button>Delete</button></td>`
      row.querySelector('input').addEventListener('change', toggleAdmin(u, a))
      row.querySelector('button').addEventListener('click', deleteUser(u))
      tbody.appendChild(row)
    }))
    .catch(console.log)
}
updateUsers()

const deleteUser = (u) => () => {
  if(confirm('Really delete ' + u + '?')) {
    fetch(
        '/api/admin?user=' + u,
      { method: 'DELETE' }
    ).then(updateUsers)
     .catch(console.log)
  }
}
const toggleAdmin = (u, a) => () => {
  fetch('/api/admin', {
    method: 'PUT',
    body: JSON.stringify({ user: u, admin: !a })
  }).then(updateUsers)
    .catch(console.log)
}

document.getElementById('adduser').addEventListener(
  'click',
  (ev) => {
    const user = prompt('Username')
    const pass = prompt('Password')
    fetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({ user, pass })
    }).then(updateUsers)
      .catch(console.log)
  }
)

document.getElementById('logout').addEventListener(
  'click',
  () => fetch('/api/logout')
      .then(() => location.reload())
)

//randomizer
let allItems = [];

function loadItems() {
  const eventSource = new EventSource('/api/items');
  eventSource.onmessage = function (event) {
    const data = JSON.parse(event.data);

    allItems = data; // ← Save for use in randomize()

    const container = document.getElementById('content');
    container.innerHTML = '';

    data.forEach(item => {
      const newItem = document.createElement('div');
      newItem.id = 'item-' + item.uid;

      const name = document.createTextNode(item.name);
      const modifier = document.createElement('small');
      modifier.textContent = ` (Last modified by: ${item.modified_by || 'Unknown'}) `;

      const editButt = document.createElement('button');
      editButt.textContent = 'Edit';
      editButt.onclick = () => editItem(item.uid);

      const delButt = document.createElement('button');
      delButt.textContent = 'Delete';
      delButt.onclick = () => deleteItem(item.uid);

      newItem.appendChild(name);
      newItem.appendChild(modifier);
      newItem.appendChild(editButt);
      newItem.appendChild(delButt);

      container.appendChild(newItem);
      container.appendChild(document.createElement('br'));
    });
  };
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

  fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: itemName }),
  })
  .then(async response => {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error (${response.status}): ${errorText}`);
    }
  
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  })
  .then(item => {
          console.log("Item added: ", item);
          const newItem = document.createElement('div');
              newItem.id = 'item-' + item.uid;
              let name = document.createTextNode(item.name);
              let modifier = document.createElement('small');
              modifier.textContent = ` (Last modified by: ${item.modified_by || 'Unknown'}) `
  
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
              newItem.appendChild(modifier);
              newItem.appendChild(editButt);
              newItem.appendChild(delButt);
  
              document.getElementById('content').appendChild(newItem);

              const breakLine = document.createElement('br');
              document.getElementById('content').appendChild(breakLine);
  })
  .catch(console.log);
}

function deleteItem(id){
  if(confirm("Are you sure? This will be deleted permanently.")) {

      fetch(`/api/items/?uid=${id}`, {
          method: 'DELETE',
      })
      .then(() => {
              console.log("Item deleted");
              $('#item-'+id).remove();
              loadItems();
      })
      .catch(console.log);
  }
}

function editItem(id){
  let eName = prompt("Edit restaurant name:");
  if (!eName) return; // if no name is entered

  fetch(`/api/items/?uid=${id}`, {
      method: 'PUT',
      headers:{ 'Content-Type' : 'application/json' },
      body: JSON.stringify({uid: id, name: eName }),
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to update item')
      return response.json();
  })
  .then(updatedItem => {
          console.log("Item edited: ", item)
          let itemDiv = document.getElementById('item-' + item.uid);
          if(itemDiv){
              itemDiv.innerHTML = '';

              var newName = document.createTextNode(item.name);
              var modifier = document.createElement('small');
              modifier.textContent = ` (Last modified by: ${item.modified_by || 'Unknown'}) `
              var editButt = document.createElement('button');
              editButt.textContent = 'Edit';
              editButt.onclick = function() {
                  editItem(item.uid);
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
  })
  .catch()
}

function randomize() {
  const itemCount = allItems.length;
  if (itemCount === 0) {
    document.getElementById('random').innerHTML = 'No items available to randomize.';
    return;
  }

  const randomNum = Math.floor(Math.random() * itemCount);
  const randItem = allItems[randomNum];

  const randDiv = document.createElement('div');
  randDiv.id = "rand-" + randomNum;
  randDiv.textContent = randItem.name;
  console.log(randItem.name);
  const randomBox = document.getElementById('random');
  randomBox.innerHTML = '';
  randomBox.appendChild(document.createElement('br'));
  randomBox.appendChild(randDiv);
  randomBox.appendChild(document.createElement('br'));

  console.log("Random item:", randItem);
}

loadItems();

//websocket
const socket = new WebSocket('wss://127.0.0.1:3001');

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if(data.type === 'add'){
    items.push(data.item);
    render();
  }

  if (data.type === 'items') {
    allItems = data.items;
    const container = document.getElementById('content');
    container.innerHTML = '';

    allItems.forEach(item => {
      const newItem = document.createElement('div');
      newItem.id = 'item-' + item.uid;

      const name = document.createTextNode(item.name);
      const editButt = document.createElement('button');
      editButt.textContent = 'Edit';
      editButt.onclick = () => editItem(item.uid);

      const delButt = document.createElement('button');
      delButt.textContent = 'Delete';
      delButt.onclick = () => deleteItem(item.uid);

      newItem.appendChild(name);
      newItem.appendChild(editButt);
      newItem.appendChild(delButt);
      container.appendChild(newItem);
      container.appendChild(document.createElement('br'));
    });
  }

  if (data.type === 'user') {
    const userDiv = document.getElementById('currentUser');
    if (userDiv) {
      userDiv.textContent = 'Logged in as: ' + data.user;
    }
  }
};