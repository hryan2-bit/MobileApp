#!/usr/bin/env node

const fs = require('node:fs')
const http = require('http')
const { createHmac, randomUUID } = require('node:crypto');

const secret = 'abcdefg';
const hash = (str) =>
  createHmac('sha256', secret).update(str).digest('hex');

let users
fs.readFile('passwd.db', 'utf8', (err,data) => {
  if (err) {
    console.error(err);
    return;
  }
  users = JSON.parse(data)
});

let items = []

const authenticate = (auth = '') => {
  if (!auth) return false;
  const [ user, pass ] = atob(auth.slice(6)).split(':')
  if (!user || !pass) return false;
  console.log(`Auth header: ${auth}`)
  return !!user && !!pass && users[user] === hash(pass + user)
}

const handleRequest = (req, res) => {
  const [path, query] = req.url.split('?')
  
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    console.log(`Request method: ${req.method}`)
    if (!authenticate(req.headers.authorization)) {
      res.writeHead(401, {
        "WWW-Authenticate": "Basic realm='oo laa'"
      });
      res.end('Unauthorized: Invalid credentials');
      return;
    }
  }
  if (req.method === 'POST' && path === '/api/users') {
    let body = '';
    req.on('data', data => { body += data });
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          res.writeHead(400).end('Missing username or password');
          return;
        }
        const hashedPassword = hash(password + username);
        users[username] = hashedPassword;
        fs.writeFile('passwd.db', JSON.stringify(users, null, 2), (err) => {
          if (err) {
            console.error(err);
            res.writeHead(500).end('Failed to save user');
            return;
          }
          res.writeHead(201).end('User registered successfully');
        });
      } catch (error) {
        res.writeHead(400).end('Invalid data format');
      }
    });
    return;
  }

  if(['POST', 'PUT', 'DELETE'].includes(req.method)) {
    let uid = query && query.match(/uid=([0-9a-f-]+)/);
    if (req.method === 'DELETE') {
      if (uid[1]) {
        items = items.filter(item => item.uid !== uid[1]);
        res.writeHead(200).end();
      } else {
        res.writeHead(400).end();
      }
    } else {
      let body = '';
      req.on('data', data => { body += data });
      req.on('end', () => {
        try {
          const params = JSON.parse(body);
          if (!uid && req.method === 'POST') {
            uid = randomUUID();
            items.push({ ...params, uid });
            res.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify({ uid }));
          } else if (uid && req.method === 'PUT') {
            const i = items.findIndex(item => item.uid === uid[1]);
            if (i >= 0) {
              items[i] = params;
              res.writeHead(200).end();
            } else {
              res.writeHead(404).end();
            }
          } else {
            res.writeHead(400).end();
          }
        } catch {
          res.writeHead(400).end();
        }
      });
    }
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(items));
    res.end();
  }
};
const server = http.createServer(handleRequest)
server.listen(3000)