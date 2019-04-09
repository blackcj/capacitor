# CAPACITOR

Short term storage and visualization of IoT data.

## Global Dependencies

- Browserify `npm install browserify -g`
- Mongo
- Node.js

## Setup

Create a **.env** in the project root. Add the following variables.

```
JWT_TOKEN=YOUR_TOKEN
ADMIN_CODE=FIRST_USER_CODE
```

- `npm install`
- `npm run server`
- `npm run client`

Use Postman or `curl` to call the `/api/users/setup` route. Pass it the code you entered in the `.env`, username (your email) and password. This will create the first user that you can use to authenticate and access the rest of the routes. You can remove this route after creating the admin user.

**Front end coming soon!** Right now this project only includes server side code.

## API Documentation

[API DOC](http://apidocjs.com/) must be installed globally to generate documentation. 

```
apidoc -i server/routes/ -o apidoc/
```