FROM node:latest

WORKDIR /wt-projekat

COPY . .

WORKDIR /wt-projekat/backend
RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]


