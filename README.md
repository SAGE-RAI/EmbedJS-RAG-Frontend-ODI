# EmbedJS-RAG-Frontend-ODI

## Overview

EmbedJS-RAG-Frontend-ODI is a frontend and API interface for EmbedJS, designed to facilitate conversations between users and a Retrieve and Generate (RAG) system. This platform allows administrators to manage sources and provides various functionalities for both end-users and administrators. Note that currently, this system is designed to work exclusively with MongoDB Atlas.

## Features

- **User Conversations**: Users can engage in conversations with the RAG system.
- **Message Rating**: Users can rate messages for quality and feedback.
- **Source Management**: Administrators can manage sources through the interface.
- **Token Initialization**: Users can create tokens to communicate from other applications via their accounts. This allows the frontend to act as a proxy for other applications.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Usage](#usage)
  - [User Interface](#user-interface)
  - [Admin Interface](#admin-interface)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm (v6 or higher)
- MongoDB Atlas account
- Google OAuth and/or Django OAuth

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SAGE-RAI/EmbedJS-RAG-Frontend-ODI.git
   cd EmbedJS-RAG-Frontend-ODI
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Copy `config.env.example` to `config.env` file in the root directory and add your configuration.

### Running the Application

Start the application:
```bash
npm start
```

or in dev mode:
```bash
npm run dev
```

The application will be accessible at `http://localhost:3080`.

## Usage

### User Interface

- **Conversations**: Users can start conversations with the RAG system and rate the responses.
- **Token Initialization**: Users can generate tokens to use for external applications to interact via their account.

### Admin Interface

- **Source Management**: Administrators can add, update, and delete sources used by the RAG system.

## API Endpoints

- **User Authentication**: OAuth2 with Google and Django.
- **Conversations**: Create, update, delete, and fetch conversations.
- **Message Rating**: Rate messages within conversations.
- **Source Management**: Add, update, delete, and fetch sources.
- **Token Management**: Initialize tokens for external application communication.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes. Ensure you follow the project's coding standards and add tests for new features or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.