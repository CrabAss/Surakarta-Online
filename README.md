# Surakarta Online
Realtime game hosting of Surakarta using Node.js. This project is still in alpha phase. 

## Game instruction
Please refer to [Surakarta (game)](https://en.wikipedia.org/wiki/Surakarta_(game)).

## Features
* WebSocket technology is used to implement the real-time updating of game status between the server and the client;
* The back-end part of this web-based game is implemented using Node.js. The back-end program is designed to host multiple in-progress games simultaneously. Error prevention is well implemented as well to detect and intercept any cheating request;
* The game board in the front-end part is rendered by paper.js; 
* Data models of games and users are implemented by Mongoose. 

## Roadmap of future development
Please refer to [Roadmap #1](https://github.com/CrabAss/Surakarta-Online/projects/1).

## Tips of installation
* [Node.js](https://nodejs.org/en/download/package-manager/) and [MongoDB](https://docs.mongodb.com/manual/administration/install-community/) should be installed in advance. 
* HTTP server runs on port `2100` by default. You may change it in `bin/www`.
* In order to display flag icons correctly, a symlink should be created manually from `node_modules/flag-icon-css` to `public/flag`. 
* Please replace the API key of [Google Maps](https://developers.google.com/maps/documentation/javascript/tutorial) with your own key in `views/stat/map.pug`.
* [Google reCAPTCHA](https://developers.google.com/recaptcha/docs/invisible) is integrated in this software. Please create a new file as `static_data/recaptcha.json` with following content: 
  ```json
  {"PublicKey": "[YOUR PUBLIC KEY]", "Secret": "[YOUR SECRET KEY]"}
  ```

## License
Surakarta Online is licensed under the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or any later version. For details, please refer to `COPYING`.