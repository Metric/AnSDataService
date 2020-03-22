'use strict';
const request = require('request');

//replace {id} with your blizzard developer client_id
//replace {secret} with your blizzard developer client_secret
const oauth = 'https://{region}.battle.net/oauth/token?grant_type=client_credentials&client_id={id}&client_secret={secret}';

class Auth {
    constructor(region) {
        this.region = region;
        this.token = null;
        this.expires = 0;
        this.timestamp = Date.now();
    }

    clientCred() {
        return new Promise(async (res, rej) => {
            //good news, even if the token is still valid
            //and we run this, blizzard will return the Ssame token
            //for the client based ones.
            const region = this.region.toLowerCase();

            if((Date.now() - this.timestamp) / 1000 >= this.expires) {
                console.log('getting new access token...');
                this.token = null;
                request(
                    {
                        method: 'GET',
                        url: oauth.replace('{region}', region)
                    }, (err, response, body) => {

                    if (body && body.length > 0) {
                        const js = JSON.parse(body);
                        this.token = js["access_token"];
                        this.expires = js["expires_in"];
                        this.timestamp = Date.now();
                    }

                    res();
                });
            }
            else {
                res();
            }
        });
    }
}

module.exports = exports = Auth;