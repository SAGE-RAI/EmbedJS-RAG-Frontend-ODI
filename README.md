# EmbedJS-RAG-Frontend-ODI

## Overview

EmbedJS-RAG-Frontend-ODI is a frontend and API interface for EmbedJS. It is designed to allow users to create custom RAG (Retrieve and Generate) systems and share these with other users. This platform enables administrators to create new RAG systems, share them with other administrators for managing sources, and with users who can use them. Currently, this system is designed to work exclusively with MongoDB Atlas as the backend for storage. Future updates will allow users to tailor their choice of embedding and GenAI models for each RAG system.

## Features

- **Multiple RAG Instances**: Support for multiple RAG instances, allowing users to switch between different RAG systems.
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
- embedJS (SAGE-RAI version)

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

3. Manually install SAGE-RAI embedJS:
    ```bash
    cd ..
    git clone https://github.com/SAGE-RAI/embedJs.git
    cd embedJs
    npm i
    npm run build
    cp -r dist ../EmbedJS-RAG-Frontend-ODI/node_modules/@llm-tools/embedjs/
    ```

4. Copy `config.env.example` to `config.env` file in the root directory and add your configuration.

### Running the Application

Start the application:
```bash
npm start
```

or in dev mode:
```bash
npm run dev
```

The application will be accessible at `http://localhost:3080` or `http://localhost:3080/admin` for the admin interface.

## Usage

### User Interface

- **Conversations**: Users can start conversations with the RAG system and rate the responses.
- **Token Initialization**: Users can generate tokens to use for external applications to interact via their account.

### Admin Interface

- **RAG Instances Management**: Administrators can create and manage multiple RAG instances.
- **Source Management**: Administrators can add, update, and delete sources used by the RAG system.

## API Endpoints

- **User Authentication**: OAuth2 with Google and Django.
- **RAG Instances**:
  - `GET /instances` - List all RAG instances accessible to the user.
  - `POST /instances` - Create a new RAG instance.
  - `PUT /instances/:ragId` - Update an existing RAG instance.
  - `DELETE /instances/:ragId` - Delete an existing RAG instance.

- **Source Management**:
  - `POST /instances/:ragId/sources/add` - Add a new source.
  - `GET /instances/:ragId/sources` - List all sources.
  - `GET /instances/:ragId/sources/:loaderId` - Get a specific source.
  - `PUT /instances/:ragId/sources/:loaderId` - Update a specific source.
  - `DELETE /instances/:ragId/sources/:loaderId` - Delete a specific source.

- **Conversations**:
  - `POST /instances/:ragId/conversations/create` - Create a new conversation.
  - `GET /instances/:ragId/conversations` - List all conversations.
  - `GET /instances/:ragId/conversations/:conversationId` - Get a specific conversation.
  - `POST /instances/:ragId/conversations/:conversationId` - Update a specific conversation.
  - `DELETE /instances/:ragId/conversations/:conversationId` - Delete a specific conversation.

- **Messages/Completion**:
  - `GET /instances/:ragId/conversations/:conversationId/messages` - Get messages of a specific conversation.
  - `POST /instances/:ragId/conversations/:conversationId/messages` - Add a message to a conversation.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes. Ensure you follow the project's coding standards and add tests for new features or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.