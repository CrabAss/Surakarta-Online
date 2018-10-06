# Surakarta Online
Realtime game hosting of Surakarta using Node.js. This project is still in alpha phase. 

## Game instruction
Please refer to [Surakarta (game)](https://en.wikipedia.org/wiki/Surakarta_(game)).

## Features
* WebSocket technology is used to implement the real-time updating of game status between the server and the client;
* The back-end part of this web-based game is implemented using Node.js. The back-end program is designed to host multiple in-progress games simultaneously. Error prevention is well implemented as well to detect and intercept any cheating request;
* The game board in the front-end part is rendered by Canvas technology; 
* Data models of games and users are implemented by Mongoose. 

## Roadmap of future development
Please refer to [Roadmap #1](https://github.com/CrabAss/Surakarta-Online/projects/1).

## Tips of installation
* Node.js and MongoDB should be installed in advance. 
* HTTP server runs on port `2100` by default. You may change it in `bin/www`.
* In order to display flag icons correctly, a symlink should be created manually from `node_modules/flag-icon-css` to `public/flag`. 
* Please replace the API key of Google Maps with your own key in `views/stat/map.pug`.
* Google reCAPTCHA is integrated in this app. Please create a new file as `static_data/recaptcha.json` with the following content: 
  ```
  {"PublicKey": "[YOUR PUBLIC KEY]", "Secret": "[YOUR SECRET KEY]"}
  ```
