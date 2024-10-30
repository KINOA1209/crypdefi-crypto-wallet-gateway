# CrypDefi Key Management Project

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## API documentation

### GET /api/auth

Get user by token. (send token in header)

### POST /api/auth

Authenticate user & get token.

### POST api/users

Register user.

### GET api/users/wallets

Get wallets for a user. (send token in header)

### POST api/users/wallet

Add a wallet for a user. (send token in header)

### PUT api/users/signtx

Sign a transaction. (send token in header)

## Project Structure

frontend
backend

## Run frontend

cd frontend
npm start

## Run backend

cd backend
npm start
