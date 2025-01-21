const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
      origin: "*", // or '*'
      methods: ["GET", "POST"]
    }
  });

// Enable CORS for all origins (you can restrict it later)
app.use(cors());

// Store active users and their pairings
let users = []; // Array to hold active users with their names and socket ids
let pairs = []; // Array to store pairs of user IDs to prevent duplicate pairings

app.get('/', (req, res) => {
  res.send('Chat server running');
});

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // Add user to the list of active users with their name
  socket.on('set-name', (name) => {
    users.push({ id: socket.id, name }); // Store user with socket id and name
    console.log(`${name} joined the chat`);

    // Check if there's another user already connected and not paired with this user
    if (users.length > 1) {
      const availableUsers = users.filter((user) => user.id !== socket.id);
      
      // Try to find a random user that isn't already paired with the new user
      const randomUser = availableUsers.find(user => {
        // Check if the user is already in a pair
        return !pairs.some(pair => pair.includes(user.id));
      });

      if (randomUser) {
        // If a valid user is found, pair them
        socket.emit('user-pairing', randomUser);
        io.to(randomUser.id).emit('user-pairing', { id: socket.id, name });

        // Add this pair to the pairs array to ensure they are not paired again
        pairs.push([socket.id, randomUser.id]);
      } else {
        // If no available user to pair with, inform the user they are waiting
        socket.emit('waiting-for-pair', true);
      }
    } else {
      // If no other users are online, inform the user that they are waiting
      socket.emit('waiting-for-pair', true);
    }
  });

  // Handle sending chat messages
  socket.on('chat-message', (message, toUserId) => {
    const sender = users.find((user) => user.id === socket.id); // Get the sender's details
    io.to(toUserId).emit('chat-message', message, sender.name, socket.id); // Send message and sender's name to the recipient
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove user from active users list
    users = users.filter(user => user.id !== socket.id);

    // Remove user from pairs array (if they were paired)
    pairs = pairs.filter(pair => !pair.includes(socket.id));

    // Notify remaining users about the disconnection
    io.emit('user-disconnected', socket.id);
    console.log('user disconnected', socket.id);
  });
});

server.listen(port || 3000, '0.0.0.0', () => {
    console.log('Chat server is running on port 3001');
});
