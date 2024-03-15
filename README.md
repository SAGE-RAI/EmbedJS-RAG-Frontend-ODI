# OpenAI Proxy with custom token authentication

This server is designed to authenticate access tokens for users. The demo use case is a learning SCORM package with embedded AI. As we should not embed a shared API key, the package creates a random GUID polls the completions endpoint with an empty body using the GUID as the authorization bearer. If the token is valid then 400 bad request will be sent back, else 401 access denied. To authenticate a token, a user visits the API server with the GUID as in the URL as `?accessToken`. They then log in in order to associate the token with their profile and authorize its use for 24 hours. The proxy API has the token for the real OpenAI and controls which users can use it via user token authentication.

## Dependencies

- Google client credentials (for OAuth authentication of users, providing you are a google based company)
- MongoDB (for storing user and token records)
- Open AI API key (for proxying requests)

## Installation and Setup

1. Clone this repository to your local machine.
2. Install dependencies using `npm install`.
3. Create a `config.env` file in the root directory based on the provided `condig.env.example` file. Fill in the required environment variables.
4. Start the server using `npm start`.
5. Access the server at `http://localhost:3080`.

## Usage

- Visit `http://localhost:3080/?accessToken=<access-token>` and login.
- To test OpenAI token authentication, make a POST request to `/openai-completion` with an empty body and include a valid access token in the Authorization header as a bearer token.

## Dependencies

- Node.js
- Express.js
- Passport.js
- MongoDB
- Mongoose
- OpenAI API

## Contributing

Feel free to contribute to this project by opening issues or pull requests on GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.