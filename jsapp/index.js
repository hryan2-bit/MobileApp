#!/usr/bin/env node
const db = require('./db');
const WebSocket = require('ws')
const fs = require('node:fs')
const http = require('http')
const { createHmac, randomUUID } = require('node:crypto');
const clients = new Set();
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const client = new OAuth2Client('1661812737-2m2vvpbp8v9jfe69aqnnvrkarvt28e9v.apps.googleusercontent.com');

const saltRounds = 10;
let lastLoggedInUser = null;
const secret = 'abcdefg';

const hashPass = async (password) => {
  const hashedPass = await bcrypt.hash(password, saltRounds);
  return hashedPass
}

const createToken = (email) => jwt.sign({ email }, secret, { expiresIn: '7d' })

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).send('Token is required');
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).send('Invalid or expired token');
    }
    req.user = decoded;
  });
};

const authenticate = async (auth = '') => {
  console.log(auth);
  let user = null;

  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);  
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: '1661812737-2m2vvpbp8v9jfe69aqnnvrkarvt28e9v.apps.googleusercontent.com',
      });
      const payload = ticket.getPayload();
      console.log('\n\nGoogle user:', payload);
      user = { email: payload.email, name:payload.name, picture: payload.picture };

      db.prepare(`
        INSERT OR IGNORE INTO users (email, name, picture)
        VALUES (?, ?, ?)
        `).run(user.email, user.name, user.picture);
      const storeUser = db.prepare('SELECT email, name, picture FROM users WHERE email = ?').get(user.email)
    } catch (error) {
      console.error('Google authentication failed:', error);
    }
  }

  if (user) {
    lastLoggedInUser = user;
    return user;
  } else {
    return null;
  }
}

const handleRequest = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://randomgrub.jumpingcrab.com'); // Frontend domain
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); // Adjust based on your use case
res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none'); // Can also be set as 'unsafe-none' based on your needs


  const token = req.headers.authorization || '';
  const user = await authenticate(token.replace('Bearer ', ''))
  console.log("Huh?: " + token.replace('Bearer ', ''))
  const [path, query] = req.url.split('?')

  console.log(`Incoming request: ${req.method} ${path}`)
  console.log(db.prepare('SELECT * FROM users').all())

  if(path === '/api/items' && req.method === 'GET') {
    const user = await authenticate(req.headers.authorization || '');
  try {
    const items = db.prepare('SELECT uid, name, formatted_address FROM items WHERE user_id = ?').all(user.email);
    console.log("Grab items from DB");
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(items));
  } catch (error) {
    console.error('Error fetching items:', error);
    res.writeHead(500).end('Internal Server Error');
  }
  } else if (path === '/api/login' && req.method === 'GET'){
    const user = await authenticate(req.headers.authorization || '');
    try {
      const rows = db.prepare('SELECT name, email FROM users WHERE email = ?').all(user.email);
      console.log(user.email)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    } catch (error) {
      console.error('Error fetching user:', error);
      res.writeHead(500).end('Internal Server Error');
    }
  } else if(path === '/api/logout' && req.method === 'POST'){
    res.writeHead(200).end(JSON.stringify({ message: 'Logged out' }));
  } else if (path === '/api/me' && req.method === 'GET') {
    const user = await authenticate(req.headers.authorization || '');
    if (user) {
      const row = db.prepare('SELECT email, name, picture FROM users WHERE email = ?').get(user.email.email);
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(row))
    } else {
      res.writeHead(401).end()
    }
} else if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
  let uidMatch = query && query.match(/uid=([0-9a-f-]+)/);
  let uid = uidMatch ? uidMatch[1] : null;
  let body = '';

  req.on('data', data => { body += data });

  req.on('end', async () => {
    try {
      const user = await authenticate(req.headers.authorization || '');
      const params = body ? JSON.parse(body) : {};
      let responseMessage = {};
      let statusCode = 400;

      if (req.method === 'DELETE') {
        if (uid) {
          db.prepare('DELETE FROM items WHERE uid = ? AND user_id = ?').run(uid, user.email);
          responseMessage = { message: "Item successfully deleted" };
          statusCode = 200;
        } else {
          responseMessage = { error: "UID is required for DELETE" };
        }
      } 
      else if (req.method === 'POST') {
        uid = randomUUID();
        db.prepare('INSERT INTO items (uid, name, formatted_address, user_id) VALUES (?, ?, ?, ?)')
          .run(uid, params.name, params.formatted_address, user.email);

        const item = {
          uid,
          name: params.name,
          formatted_address: params.formatted_address,
          user_id: user.email
        };

        const message = JSON.stringify({ type: 'add', item });
        for (const ws of clients) ws.send(message);

        responseMessage = { message: "Item successfully added", uid };
        statusCode = 201;
      } 
      else if (req.method === 'PUT' && uid) {
        const itemExists = db.prepare('SELECT uid FROM items WHERE uid = ? AND user_id = ?').get(uid, user.email);

        if (itemExists) {
          db.prepare('UPDATE items SET name = ?, formatted_address = ? WHERE uid = ? AND user_id = ?')
            .run(params.name, params.formatted_address, uid, user.email);
          
          responseMessage = { message: "Item successfully updated" };
          statusCode = 200;
        } else {
          responseMessage = { error: "Item not found or not authorized" };
          statusCode = 404;
        }
      }

      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(responseMessage));

    } catch (err) {
      console.error("Error processing request:", err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad Request" }));
    }
  });

} else {
  const user = lastLoggedInUser ? lastLoggedInUser.email : null;
  const row = db.prepare('SELECT uid, name, formatted_address FROM items WHERE user_id = ?').all(user);

  const items = row.map(item => ({
    uid: item.uid,
    name: item.name,
    formatted_address: item.formatted_address
  }));

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(items));
}

};

const server = http.createServer(handleRequest)
const wsserver = new WebSocket.WebSocketServer({ server })
wsserver.on('connection', (ws) => {
  clients.add(ws);

  const row = db.prepare('SELECT uid, name, formatted_address, user_id FROM items').all();
  const items = row.map(row => ({
    uid: row.uid,
    name: row.name,
    formatted_address: row.formatted_address,
    user_id: row.user_id
  }));

  ws.send(JSON.stringify({ type: 'items', items }))
  if(lastLoggedInUser){
    ws.send(JSON.stringify({ type: 'user', user: lastLoggedInUser}))
  }

  ws.on('close', () => clients.delete(ws));
})
server.listen(3001)