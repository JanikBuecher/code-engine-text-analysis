FROM node:10-alpine

RUN apk update
RUN apk add curl
RUN curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

RUN ibmcloud plugin install code-engine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3001
CMD [ "node", "server.js" ]